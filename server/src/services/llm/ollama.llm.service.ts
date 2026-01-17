import axios from "axios";
import { config } from "../../config";
import { NewsItem } from "../../models/types";
import { BaseLLMService } from "./base.llm.service";
import { LLMLogger } from "./logger.service";
import { buildSummaryMessages } from "./prompt-builders";
import { createLogger } from "../../utils/logger";

const log = createLogger("services/llm/ollama");

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export class OllamaLLMService extends BaseLLMService {
  private apiUrl: string;
  private model: string;
  private logger: LLMLogger;

  constructor(logger: LLMLogger) {
    super();
    this.apiUrl = config.llm.ollama.apiUrl;
    this.model = config.llm.ollama.model;
    this.logger = logger;
  }

  getProviderName(): string {
    return "ollama";
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
      "Generating Ollama summary"
    );

    // Sort by score to prioritize important posts
    const sortedItems = [...newsItems].sort((a, b) => b.score - a.score);

    // Build system + user prompts aligned with OpenAI message structure
    const { systemPrompt, userPrompt } = this.buildPrompts(sortedItems, topic);

    // Estimate input tokens (rough approximation: 4 chars ≈ 1 token)
    const estimatedInputTokens = Math.ceil(
      (systemPrompt.length + userPrompt.length) / 4
    );

    try {
      const payload: OllamaGenerateRequest = {
        model: this.model,
        prompt: userPrompt,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        stream: false,
      };
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.apiUrl}/api/generate`,
        payload,
        {
          timeout: 120000, // 2 minutes timeout
        }
      );

      const summary = response.data.response.trim();
      const latencyMs = Date.now() - startTime;
      const estimatedOutputTokens = Math.ceil(summary.length / 4);

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
   * Build system and user prompts for /api/generate.
   */
  private buildPrompts(
    newsItems: NewsItem[],
    topic: string
  ): { systemPrompt: string; userPrompt: string } {
    const messages = buildSummaryMessages({ topic, newsItems });
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
