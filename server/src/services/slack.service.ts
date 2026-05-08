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
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  thread_ts?: string;
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

      const { mainBlocks, detailBlocks } = this.formatForSlack(summary);

      const mainResp = await this.postBlocks(mainBlocks);

      if (summary.id) {
        const messageTs = mainResp.ts || new Date().toISOString();
        await db.insertSlackPost(summary.id, this.channelId, messageTs);
      }

      if (detailBlocks.length > 0 && mainResp.ts) {
        try {
          await this.postBlocks(detailBlocks, mainResp.ts);
        } catch (err) {
          log.warn(
            { err, summaryId: summary.id },
            "Failed to post details thread reply"
          );
        }
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
    mainBlocks: SlackBlock[];
    detailBlocks: SlackBlock[];
  } {
    const mainBlocks: SlackBlock[] = [];
    const detailBlocks: SlackBlock[] = [];

    // Header (main message only)
    mainBlocks.push({
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
    mainBlocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Topic:* ${summary.topic} | *Generated:* ${createdDate}`,
        },
      ],
    });

    mainBlocks.push({ type: "divider" });

    // Parse markdown sections — "Details" routes to the thread reply,
    // every other section (Summary, plus any legacy section name) stays in main.
    const sections = this.parseMarkdownSections(summary.summary_markdown);
    const SLACK_TEXT_LIMIT = 3000;
    for (const [sectionTitle, sectionContent] of Object.entries(sections)) {
      if (sectionTitle.toLowerCase().includes("source")) continue;
      if (!sectionContent.trim()) continue;

      const isDetails = sectionTitle.toLowerCase() === "details";
      const target = isDetails ? detailBlocks : mainBlocks;

      if (isDetails && detailBlocks.length === 0) {
        detailBlocks.push({
          type: "context",
          elements: [{ type: "mrkdwn", text: "📋 *Details*" }],
        });
      }

      const formattedContent =
        this.convertMarkdownToSlackMrkdwn(sectionContent);
      let text = isDetails
        ? formattedContent
        : `*${sectionTitle}*\n${formattedContent}`;

      while (text.length > 0) {
        if (text.length <= SLACK_TEXT_LIMIT) {
          target.push({
            type: "section",
            text: { type: "mrkdwn", text },
          });
          break;
        }

        let splitAt = text.lastIndexOf("\n", SLACK_TEXT_LIMIT);
        if (splitAt <= 0) splitAt = SLACK_TEXT_LIMIT;

        target.push({
          type: "section",
          text: { type: "mrkdwn", text: text.slice(0, splitAt) },
        });
        text = text.slice(splitAt + 1);
      }
    }

    // Sources section in main message
    if (summary.sources && summary.sources.length > 0) {
      mainBlocks.push({ type: "divider" });
      mainBlocks.push({
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

      const topSources = summary.sources.slice(0, 5);
      const sourcesText = topSources
        .map((source) => {
          const sourceLabel =
            source.source_type === "reddit"
              ? `r/${source.source}`
              : source.source;
          const safeTitle = source.title
            .replace(/[<>|]/g, "")
            .slice(0, 200);
          return `• <${source.url}|${safeTitle}> - ${sourceLabel} (↑${source.score})`;
        })
        .join("\n");

      mainBlocks.push({
        type: "section",
        text: { type: "mrkdwn", text: sourcesText },
      });

      if (summary.sources.length > 5) {
        mainBlocks.push({
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
    return {
      mainBlocks: mainBlocks.slice(0, 50),
      detailBlocks: detailBlocks.slice(0, 50),
    };
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

  private async postBlocks(
    blocks: SlackBlock[],
    threadTs?: string
  ): Promise<SlackApiResponse> {
    const payload: SlackApiPayload = {
      channel: this.channelId,
      blocks,
      unfurl_links: false,
      unfurl_media: false,
    };
    if (threadTs) {
      payload.thread_ts = threadTs;
    }

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

    return responseData;
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
