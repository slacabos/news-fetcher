import { config } from "../config";
import { db } from "../database";
import { SummaryWithSources, SlackPostResult } from "../models/types";

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string;
    url?: string;
  }>;
}

interface SlackWebhookPayload {
  blocks: SlackBlock[];
}

export class SlackService {
  private webhookUrl: string;
  private channelId: string;
  private enabled: boolean;

  constructor() {
    this.webhookUrl = config.slack.webhookUrl;
    this.channelId = config.slack.channelId;
    this.enabled = config.slack.enabled;
  }

  async postSummary(summary: SummaryWithSources): Promise<SlackPostResult> {
    try {
      // Check if Slack is enabled
      if (!this.enabled) {
        return {
          success: false,
          error: "Slack integration is not enabled",
        };
      }

      // Validate webhook URL
      if (!this.webhookUrl) {
        return {
          success: false,
          error: "Slack webhook URL is not configured",
        };
      }

      // Check if summary has sources (never post empty summaries)
      if (!summary.sources || summary.sources.length === 0) {
        return {
          success: false,
          error: "Cannot post empty summaries to Slack",
        };
      }

      // Check for duplicates
      if (summary.id) {
        const alreadyPosted = db.checkIfSummaryPostedToSlack(
          summary.id,
          this.channelId
        );
        if (alreadyPosted) {
          return {
            success: false,
            error: "This summary has already been posted to Slack",
            alreadyPosted: true,
          };
        }
      }

      // Format summary for Slack
      const payload = this.formatForSlack(summary);

      // Send to Slack
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${errorText}`);
      }

      // Save to database
      if (summary.id) {
        const messageTs = new Date().toISOString(); // Use ISO string as timestamp
        db.insertSlackPost(summary.id, this.channelId, messageTs);
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error posting to Slack:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testConnection(): Promise<SlackPostResult> {
    try {
      if (!this.enabled) {
        return {
          success: false,
          error: "Slack integration is not enabled",
        };
      }

      if (!this.webhookUrl) {
        return {
          success: false,
          error: "Slack webhook URL is not configured",
        };
      }

      const payload = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "✅ Slack webhook test successful! Your news-fetcher integration is working.",
            },
          },
        ],
      };

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${errorText}`);
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error testing Slack connection:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private formatForSlack(summary: SummaryWithSources): SlackWebhookPayload {
    const blocks: SlackBlock[] = [];

    // Header
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "🤖 AI News Summary",
        emoji: true,
      },
    });

    // Metadata
    const createdDate = new Date(summary.created_at).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Topic:* ${summary.topic} | *Generated:* ${createdDate}`,
        },
      ],
    });

    blocks.push({ type: "divider" });

    // Parse markdown sections
    const sections = this.parseMarkdownSections(summary.summary_markdown);

    // Add each section as a Slack block
    for (const [sectionTitle, sectionContent] of Object.entries(sections)) {
      if (sectionContent.trim()) {
        const formattedContent =
          this.convertMarkdownToSlackMrkdwn(sectionContent);
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${sectionTitle}*\n${formattedContent}`,
          },
        });
      }
    }

    // Sources section
    if (summary.sources && summary.sources.length > 0) {
      blocks.push({ type: "divider" });
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📚 *${summary.sources.length} source${
              summary.sources.length !== 1 ? "s" : ""
            }*`,
          },
        ],
      });

      // Add top sources (limit to avoid hitting block limits)
      const topSources = summary.sources.slice(0, 5);
      const sourcesText = topSources
        .map((source) => {
          const sourceLabel =
            source.source_type === "reddit"
              ? `r/${source.source}`
              : source.source;
          return `• <${source.url}|${source.title}> - ${sourceLabel} (↑${source.score})`;
        })
        .join("\n");

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: sourcesText,
        },
      });

      if (summary.sources.length > 5) {
        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_...and ${summary.sources.length - 5} more sources_`,
            },
          ],
        });
      }
    }

    return { blocks };
  }

  private parseMarkdownSections(markdown: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = markdown.split("\n");
    let currentSection = "";
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## ")) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        // Start new section
        currentSection = line.replace("## ", "").trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent.join("\n").trim();
    }

    return sections;
  }

  private convertMarkdownToSlackMrkdwn(markdown: string): string {
    let converted = markdown;

    // Convert markdown bold (**text**) to Slack bold (*text*)
    converted = converted.replace(/\*\*([^*]+)\*\*/g, "*$1*");

    // Convert markdown links [text](url) to Slack links <url|text>
    converted = converted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>");

    // Preserve bullet lists (same format in both)
    return converted;
  }
}

export const slackService = new SlackService();
