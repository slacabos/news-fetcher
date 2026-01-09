import OpenAI from "openai";
import { config } from "../../config";
import { NewsItem } from "../../models/types";
import { BaseLLMService } from "./base.llm.service";
import { LLMLogger } from "./logger.service";

// OpenAI pricing per 1M tokens (January 2026 public sheet)
// https://openai.com/pricing
type TextResponseInput = Array<{
  type: "message";
  role: "system" | "user" | "developer";
  content: Array<{ type: "input_text"; text: string }>;
}>;

type TextResponse = {
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

const MODEL_PRICING: Record<
  string,
  { input: number; output: number } // USD per 1M tokens
> = {
  "gpt-5-mini": { input: 0.2, output: 0.8 },
  "gpt-4.1": { input: 15.0, output: 60.0 },
  "gpt-4.1-mini": { input: 1.0, output: 4.0 },
  "gpt-4o": { input: 5.0, output: 15.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo-preview": { input: 10.0, output: 30.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-4-32k": { input: 60.0, output: 120.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "gpt-3.5-turbo-16k": { input: 3.0, output: 4.0 },
};

export class OpenAILLMService extends BaseLLMService {
  private client: OpenAI;
  private model: string;
  private logger: LLMLogger;

  constructor(logger: LLMLogger) {
    super();

    if (!config.llm.openai.apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
      );
    }

    this.client = new OpenAI({
      apiKey: config.llm.openai.apiKey,
    });

    this.model = config.llm.openai.model;
    this.logger = logger;
  }

  getProviderName(): string {
    return "openai";
  }

  getModelName(): string {
    return this.model;
  }

  async generateSummary(newsItems: NewsItem[], topic: string): Promise<string> {
    if (newsItems.length === 0) {
      return "No news items found for this topic.";
    }

    const startTime = Date.now();

    console.log(
      `[OpenAI] Generating summary for ${newsItems.length} news items using ${this.model}...`
    );

    // Sort by score to prioritize important posts
    const sortedItems = [...newsItems].sort((a, b) => b.score - a.score);

    // Build messages and convert to Responses API input
    const messages = this.buildMessages(sortedItems, topic);
    const responseInput = this.transformForResponses(messages);

    try {
      const response = await this.client.responses.create({
        model: this.model,
        max_output_tokens: 2000,
        input: responseInput,
      });

      const summary = this.extractTextFromResponse(response as TextResponse);
      const latencyMs = Date.now() - startTime;

      // Extract token usage and calculate cost
      const usage = (response as TextResponse).usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;
      const totalTokens = usage?.total_tokens || inputTokens + outputTokens;
      const estimatedCost = this.calculateCost(inputTokens, outputTokens);

      // Log successful request
      this.logger.log({
        timestamp: new Date().toISOString(),
        provider: this.getProviderName(),
        model: this.model,
        topic,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        success: true,
      });

      console.log(
        `[OpenAI] Summary generated successfully (${latencyMs}ms, ${totalTokens} tokens, ~$${estimatedCost.toFixed(
          4
        )})`
      );

      return summary;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Log failed request
      this.logger.log({
        timestamp: new Date().toISOString(),
        provider: this.getProviderName(),
        model: this.model,
        topic,
        latencyMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      console.error("[OpenAI] Error generating summary:", error);
      throw new Error("Failed to generate summary with OpenAI");
    }
  }

  /**
   * Build optimized messages for OpenAI Responses API
   * Uses system message for role definition and user message for content
   */
  private buildMessages(
    newsItems: NewsItem[],
    topic: string
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const postsText = newsItems
      .map(
        (item, index) =>
          `${index + 1}. **"${item.title}"**\n   - Subreddit: r/${
            item.subreddit
          }\n   - Score: ${item.score} upvotes\n   - URL: ${item.url}`
      )
      .join("\n\n");

    return [
      {
        role: "system",
        content: `You are an expert AI news analyst specializing in ${topic}. Your role is to:
- Analyze Reddit posts and identify key trends and developments
- Create comprehensive, well-structured markdown summaries
- Maintain objectivity and technical accuracy
- Prioritize high-quality, high-engagement content
- Present information in a clear, newsworthy format`,
      },
      {
        role: "user",
        content: `Analyze these ${newsItems.length} Reddit posts about ${topic} from the last 24 hours and create a comprehensive news summary.

**Reddit Posts:**
${postsText}

**Create a markdown summary with these exact sections:**

## Overview
Provide 2-3 sentences summarizing the main themes, trends, and overall sentiment in the ${topic} community today.

## Key Developments
- List major developments, announcements, or breakthroughs
- Each bullet should be 1-2 sentences
- Focus on concrete, newsworthy items
- Order by significance (highest-scored posts first)

## Notable Highlights
Present 3-5 standout items in this format:
- **Topic/Company Name**: Brief description of the highlight or announcement

## Sources
List all source posts in this format:
- [Post Title](URL) - r/subreddit (score upvotes)

**Guidelines:**
- Use proper markdown formatting throughout
- Be concise but informative
- Focus on facts, not speculation
- Maintain a professional, objective tone`,
      },
    ];
  }

  private transformForResponses(
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
  ): TextResponseInput {
    return messages.map((message) => ({
      type: "message",
      role:
        message.role === "assistant"
          ? "developer"
          : (message.role as "system" | "user" | "developer"),
      content: [
        {
          type: "input_text",
          text:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        },
      ],
    }));
  }

  private extractTextFromResponse(response: TextResponse): string {
    const chunks = response.output
      ?.flatMap((item) => item.content ?? [])
      ?.filter((content) => content.type === "output_text")
      ?.map((content) =>
        "text" in content && typeof content.text === "string"
          ? content.text
          : ""
      )
      ?.filter(Boolean);

    return chunks && chunks.length > 0 ? chunks.join("\n").trim() : "";
  }

  /**
   * Calculate estimated cost based on token usage and model pricing
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[this.model] || { input: 10.0, output: 30.0 };

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Simple health check: list models (lightweight API call)
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error("[OpenAI] Health check failed:", error);
      return false;
    }
  }
}
