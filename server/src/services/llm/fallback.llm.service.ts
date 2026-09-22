import { NewsItem } from "../../models/types";
import { BaseLLMService } from "./base.llm.service";
import { createLogger } from "../../utils/logger";

const log = createLogger("services/llm/fallback");

/**
 * Wraps a primary LLM service and retries with a fallback service
 * when the primary fails (e.g. API outage, quota exhausted).
 */
export class FallbackLLMService extends BaseLLMService {
  constructor(
    private primary: BaseLLMService,
    private fallback: BaseLLMService
  ) {
    super();
  }

  getProviderName(): string {
    return this.primary.getProviderName();
  }

  getModelName(): string {
    return this.primary.getModelName();
  }

  getFallbackProviderName(): string {
    return this.fallback.getProviderName();
  }

  getFallbackModelName(): string {
    return this.fallback.getModelName();
  }

  async generateSummary(newsItems: NewsItem[], topic: string): Promise<string> {
    try {
      return await this.primary.generateSummary(newsItems, topic);
    } catch (error) {
      log.warn(
        {
          err: error,
          primary: `${this.primary.getProviderName()}/${this.primary.getModelName()}`,
          fallback: `${this.fallback.getProviderName()}/${this.fallback.getModelName()}`,
        },
        "Primary LLM failed, using fallback"
      );
      return this.fallback.generateSummary(newsItems, topic);
    }
  }

  async checkHealth(): Promise<boolean> {
    return (
      (await this.primary.checkHealth()) || (await this.fallback.checkHealth())
    );
  }
}
