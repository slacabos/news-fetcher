import { config } from "../config";
import { db } from "../database";
import { SummaryWithSources, SlackPostResult } from "../models/types";
import { createLogger } from "../utils/logger";

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

interface SlackApiPayload {
  channel: string;
  blocks: SlackBlock[];
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  ts?: string;
}

const log = createLogger("services/slack");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export class SlackService {
  private botToken: string;
  private channelId: string;
  private enabled: boolean;
  private apiUrl = "https://slack.com/api/chat.postMessage";

  constructor() {
    this.botToken = config.slack.botToken;
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

      // Validate bot token
      if (!this.botToken) {
        return {
          success: false,
          error: "Slack bot token is not configured",
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
        const alreadyPosted = await db.checkIfSummaryPostedToSlack(
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
      const payload: SlackApiPayload = {
        channel: this.channelId,
        blocks: this.formatForSlack(summary).blocks,
      };

      // Send to Slack
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = this.parseSlackResponse(await response.json());

      if (!response.ok || !responseData.ok) {
        throw new Error(
          `Slack API error: ${responseData.error || response.statusText}`
        );
      }

      // Save to database
      if (summary.id) {
        const messageTs = responseData.ts || new Date().toISOString();
        await db.insertSlackPost(summary.id, this.channelId, messageTs);
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log.error({ err: error }, "Error posting to Slack");
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

      if (!this.botToken) {
        return {
          success: false,
          error: "Slack bot token is not configured",
        };
      }

      const payload = {
        channel: this.channelId,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "✅ Slack bot test successful! Your news-fetcher integration is working.",
            },
          },
        ],
      };

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${this.botToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = this.parseSlackResponse(await response.json());

      if (!response.ok || !responseData.ok) {
        throw new Error(
          `Slack API error: ${responseData.error || response.statusText}`
        );
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log.error({ err: error }, "Error testing Slack connection");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private formatForSlack(summary: SummaryWithSources): {
    blocks: SlackBlock[];
  } {
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

    // Add each section as a Slack block (max 3000 chars per section text)
    const SLACK_TEXT_LIMIT = 3000;
    for (const [sectionTitle, sectionContent] of Object.entries(sections)) {
      // Skip sources from markdown — they're added separately below
      if (sectionTitle.toLowerCase().includes("source")) continue;
      if (sectionContent.trim()) {
        const formattedContent =
          this.convertMarkdownToSlackMrkdwn(sectionContent);
        let text = `*${sectionTitle}*\n${formattedContent}`;

        // Split into multiple blocks if text exceeds Slack's limit
        while (text.length > 0) {
          if (text.length <= SLACK_TEXT_LIMIT) {
            blocks.push({
              type: "section",
              text: { type: "mrkdwn", text },
            });
            break;
          }

          // Find a newline near the limit to split cleanly
          let splitAt = text.lastIndexOf("\n", SLACK_TEXT_LIMIT);
          if (splitAt <= 0) splitAt = SLACK_TEXT_LIMIT;

          blocks.push({
            type: "section",
            text: { type: "mrkdwn", text: text.slice(0, splitAt) },
          });
          text = text.slice(splitAt + 1);
        }
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
          // Sanitize title: remove characters that break Slack link syntax
          const safeTitle = source.title
            .replace(/[<>|]/g, "")
            .slice(0, 200);
          return `• <${source.url}|${safeTitle}> - ${sourceLabel} (↑${source.score})`;
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

    // Slack allows a maximum of 50 blocks per message
    return { blocks: blocks.slice(0, 50) };
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

  private parseSlackResponse(payload: unknown): SlackApiResponse {
    if (!isRecord(payload)) {
      throw new Error("Slack API response payload is malformed");
    }

    const ok = payload.ok;
    if (typeof ok !== "boolean") {
      throw new Error("Slack API response is missing ok flag");
    }

    const error = typeof payload.error === "string" ? payload.error : undefined;
    const ts = typeof payload.ts === "string" ? payload.ts : undefined;

    return { ok, error, ts };
  }
}

export const slackService = new SlackService();
