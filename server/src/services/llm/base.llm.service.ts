import { NewsItem } from "../../models/types";

/**
 * Abstract base class for LLM service providers
 * All LLM providers must extend this class and implement its methods
 */
export abstract class BaseLLMService {
  /**
   * Generate a summary from news items
   * @param newsItems Array of news items to summarize
   * @param topic The topic being summarized
   * @returns The generated summary as markdown text
   */
  abstract generateSummary(
    newsItems: NewsItem[],
    topic: string
  ): Promise<string>;

  /**
   * Check if the LLM service is healthy and available
   * @returns True if service is operational, false otherwise
   */
  abstract checkHealth(): Promise<boolean>;

  /**
   * Get the name of the LLM provider
   * @returns Provider name (e.g., "ollama", "openai")
   */
  abstract getProviderName(): string;

  /**
   * Get the model name being used
   * @returns Model name/identifier
   */
  abstract getModelName(): string;
}
