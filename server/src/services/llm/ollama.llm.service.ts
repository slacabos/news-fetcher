import axios from "axios";
import { config } from "../../config";
import { NewsItem } from "../../models/types";
import { BaseLLMService, GenerateSummaryOptions } from "./base.llm.service";
import { LLMLogger } from "./logger.service";
import { buildSummaryMessages } from "./prompt-builders";
import {
  parseStructuredSummary,
  renderSummaryMarkdown,
  SUMMARY_JSON_SCHEMA,
} from "./summary-schema";
import { createLogger } from "../../utils/logger";

const log = createLogger("services/llm/ollama");

const MAX_OUTPUT_TOKENS = 4000;

// Uses /api/chat rather than /api/generate: with a `format` set, /api/generate
// returns an empty response for reasoning models such as gpt-oss.
interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  stream: boolean;
  think?: boolean | string;
  format?: object;
  options?: { num_predict?: number };
}

interface OllamaChatResponse {
  message: { content: string };
  done: boolean;
  done_reason?: string;
}

export class OllamaLLMService extends BaseLLMService {
  private apiUrl: string;
  private model: string;
  private think: boolean | string | undefined;
  private logger: LLMLogger;

  constructor(logger: LLMLogger) {
    super();
    this.apiUrl = config.llm.ollama.apiUrl;
    this.model = config.llm.ollama.model;
    this.think = config.llm.ollama.think;
    this.logger = logger;
  }

  getProviderName(): string {
    return "ollama";
  }

  getModelName(): string {
    return this.model;
  }

  async generateSummary(
    newsItems: NewsItem[],
    topic: string,
    options?: GenerateSummaryOptions
  ): Promise<string> {
    if (newsItems.length === 0) {
      return "No news items found for this topic.";
    }

    const startTime = Date.now();

    log.info(
      { itemCount: newsItems.length, model: this.model },
      "Generating Ollama summary"
    );

    // Sort by score to prioritize important posts
    const sortedItems = [...newsItems].sort((a, b) => b.score - a.score);

    // Build system + user prompts aligned with OpenAI message structure
    const { systemPrompt, userPrompt } = this.buildPrompts(
      sortedItems,
      topic,
      options?.previousHeadlines
    );

    // Estimate input tokens (rough approximation: 4 chars ≈ 1 token)
    const estimatedInputTokens = Math.ceil(
      (systemPrompt.length + userPrompt.length) / 4
    );

    try {
      const payload: OllamaChatRequest = {
        model: this.model,
        messages: [
          ...(systemPrompt
            ? [{ role: "system" as const, content: systemPrompt }]
            : []),
          { role: "user", content: userPrompt },
        ],
        stream: false,
        ...(this.think !== undefined ? { think: this.think } : {}),
        format: SUMMARY_JSON_SCHEMA,
        options: { num_predict: MAX_OUTPUT_TOKENS },
      };
      const response = await axios.post<OllamaChatResponse>(
        `${this.apiUrl}/api/chat`,
        payload,
        {
          timeout: 600000, // 10 minutes: local reasoning models can be slow
        }
      );

      if (response.data.done_reason === "length") {
        throw new Error(
          `Ollama response truncated after ${MAX_OUTPUT_TOKENS} tokens`
        );
      }

      const rawOutput = response.data.message.content.trim();
      const summary = renderSummaryMarkdown(parseStructuredSummary(rawOutput));
      const latencyMs = Date.now() - startTime;
      const estimatedOutputTokens = Math.ceil(rawOutput.length / 4);

      // Log successful request
      this.logger.log({
        timestamp: new Date().toISOString(),
        provider: this.getProviderName(),
        model: this.model,
        topic,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens,
        estimatedCost: 0, // Ollama is free (self-hosted)
        latencyMs,
        success: true,
      });

      log.info(
        {
          latencyMs,
          totalTokens: estimatedInputTokens + estimatedOutputTokens,
        },
        "Ollama summary generated successfully"
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
        inputTokens: estimatedInputTokens,
        latencyMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      log.error({ err: error }, "Error generating Ollama summary");
      throw new Error("Failed to generate summary with Ollama");
    }
  }

  /**
   * Build system and user prompts for /api/chat.
   */
  private buildPrompts(
    newsItems: NewsItem[],
    topic: string,
    previousHeadlines?: string[]
  ): { systemPrompt: string; userPrompt: string } {
    const messages = buildSummaryMessages({
      topic,
      newsItems,
      previousHeadlines,
    });
    return {
      systemPrompt: this.normalizeMessageContent(
        messages.find((message) => message.role === "system")?.content
      ),
      userPrompt: this.normalizeMessageContent(
        messages.find((message) => message.role === "user")?.content
      ),
    };
  }

  private normalizeMessageContent(content: unknown): string {
    if (typeof content === "string") {
      return content;
    }
    if (content === null || content === undefined) {
      return "";
    }
    return JSON.stringify(content);
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      log.error({ err: error }, "Ollama health check failed");
      return false;
    }
  }
}
