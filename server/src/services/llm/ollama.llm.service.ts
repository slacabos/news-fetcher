import axios from "axios";
import { config } from "../../config";
import { NewsItem } from "../../models/types";
import { BaseLLMService } from "./base.llm.service";
import { LLMLogger } from "./logger.service";

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
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

    console.log(
      `[Ollama] Generating summary for ${newsItems.length} news items using ${this.model}...`
    );

    // Sort by score to prioritize important posts
    const sortedItems = [...newsItems].sort((a, b) => b.score - a.score);

    // Build the prompt
    const prompt = this.buildPrompt(sortedItems, topic);

    // Estimate input tokens (rough approximation: 4 chars ≈ 1 token)
    const estimatedInputTokens = Math.ceil(prompt.length / 4);

    try {
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.apiUrl}/api/generate`,
        {
          model: this.model,
          prompt,
          stream: false,
        } as OllamaGenerateRequest,
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

      console.log(
        `[Ollama] Summary generated successfully (${latencyMs}ms, ~${
          estimatedInputTokens + estimatedOutputTokens
        } tokens)`
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

      console.error("[Ollama] Error generating summary:", error);
      throw new Error("Failed to generate summary with Ollama");
    }
  }

  /**
   * Build optimized prompt for Ollama completion-style models
   * Direct, instructional format without explicit system role
   */
  private buildPrompt(newsItems: NewsItem[], topic: string): string {
    const postsText = newsItems
      .map(
        (item, index) =>
          `${index + 1}. "${item.title}" (r/${item.subreddit}, ${
            item.score
          }↑)\n   ${item.url}`
      )
      .join("\n\n");

    return `Task: Analyze these ${newsItems.length} Reddit posts about ${topic} from the last 24 hours and create a comprehensive news summary.

Posts:
${postsText}

Instructions: Write a well-formatted markdown summary with exactly these sections:

## Overview
Write 2-3 sentences capturing the main themes and trends in ${topic}.

## Key Developments
• List each major development as a bullet point
• Be concise but informative (1-2 sentences per point)
• Focus on concrete announcements, breakthroughs, and significant updates

## Notable Highlights
Format as: **Title/Topic**: Brief description
Focus on the most impactful stories that stand out

## Sources
List each source as: [Post Title](URL) - r/subreddit (score↑)

Requirements:
- Use proper markdown formatting
- Be objective and newsworthy
- Prioritize higher-scored posts
- Keep technical accuracy`;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error("[Ollama] Health check failed:", error);
      return false;
    }
  }
}
