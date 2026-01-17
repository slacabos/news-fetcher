import OpenAI from "openai";
import { config } from "../../config";
import { NewsItem } from "../../models/types";
import {
  assertTextResponse,
  ModelPricingMap,
  TextResponse,
} from "../../utils/schema-guards";
import { BaseLLMService } from "./base.llm.service";
import { LLMLogger } from "./logger.service";
import { buildSummaryMessages } from "./prompt-builders";
import { createLogger } from "../../utils/logger";

const log = createLogger("services/llm/openai");

// OpenAI pricing per 1M tokens (January 2026 public sheet)
// https://openai.com/pricing
type TextResponseInput = Array<{
  type: "message";
  role: "system" | "user" | "developer";
  content: Array<{ type: "input_text"; text: string }>;
}>;

export class OpenAILLMService extends BaseLLMService {
  private client: OpenAI;
  private model: string;
  private logger: LLMLogger;
  private modelPricing: ModelPricingMap;

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
    this.modelPricing = config.llm.pricing;
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

    log.info(
      { itemCount: newsItems.length, model: this.model },
      "Generating OpenAI summary"
    );

    // Sort by score to prioritize important posts
    const sortedItems = [...newsItems].sort((a, b) => b.score - a.score);

    // Build messages and convert to Responses API input
    const messages = buildSummaryMessages({
      topic,
      newsItems: sortedItems,
    });
    const responseInput = this.transformForResponses(messages);

    try {
      const response = await this.client.responses.create({
        model: this.model,
        max_output_tokens: 2000,
        input: responseInput,
      });

      const validatedResponse = assertTextResponse(response);
      const summary = this.extractTextFromResponse(validatedResponse);
      const latencyMs = Date.now() - startTime;

      // Extract token usage and calculate cost
      const usage = validatedResponse.usage;
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

      log.info(
        {
          latencyMs,
          totalTokens,
          estimatedCost: Number(estimatedCost.toFixed(4)),
        },
        "OpenAI summary generated successfully"
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

      log.error({ err: error }, "Error generating OpenAI summary");
      throw new Error("Failed to generate summary with OpenAI");
    }
  }

  private transformForResponses(
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
  ): TextResponseInput {
    return messages.map((message) => ({
      type: "message",
      role: this.normalizeRole(message.role),
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

  private normalizeRole(
    role: OpenAI.Chat.ChatCompletionMessageParam["role"]
  ): "system" | "user" | "developer" {
    if (role === "assistant") {
      return "developer";
    }
    if (role === "system" || role === "user" || role === "developer") {
      return role;
    }
    return "user";
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
    const pricing = this.modelPricing?.[this.model] || {
      input: 10.0,
      output: 30.0,
    };

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
      log.error({ err: error }, "OpenAI health check failed");
      return false;
    }
  }
}
