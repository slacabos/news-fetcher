import axios from "axios";
import { config } from "../config";
import { NewsItem } from "../models/types";

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export class OllamaService {
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiUrl = config.ollama.apiUrl;
    this.model = config.ollama.model;
  }

  async generateSummary(newsItems: NewsItem[], topic: string): Promise<string> {
    if (newsItems.length === 0) {
      return "No news items found for this topic.";
    }

    console.log(
      `Generating summary for ${newsItems.length} news items using ${this.model}...`
    );

    // Sort by score to prioritize important posts
    const sortedItems = [...newsItems].sort((a, b) => b.score - a.score);

    // Build the prompt
    const prompt = this.buildPrompt(sortedItems, topic);

    try {
      const payload: OllamaGenerateRequest = {
        model: this.model,
        prompt,
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
      console.log("Summary generated successfully");
      return summary;
    } catch (error) {
      console.error("Error generating summary with Ollama:", error);
      throw new Error("Failed to generate summary");
    }
  }

  private buildPrompt(newsItems: NewsItem[], topic: string): string {
    const postsText = newsItems
      .map(
        (item, index) =>
          `${index + 1}. "${item.title}" (${item.source}, ${
            item.score
          } upvotes)\n   URL: ${item.url}`
      )
      .join("\n\n");

    return `You are an AI news analyst. Analyze the following Reddit posts about ${topic} from the last 24 hours and create a comprehensive summary.

Reddit Posts:
${postsText}

Create a well-formatted markdown summary with these sections:

## Overview
Write 2-3 sentences summarizing the key themes and trends.

## Main Topics & Developments
- Use bullet points for each major topic or development
- Keep each point concise (1-2 sentences)

## Notable Highlights
- **Topic/Announcement**: Brief description
- Focus on significant announcements or breakthroughs

## Source Links
Format each source as:
- [Post Title](URL) - r/subreddit (score upvotes)

Keep the summary informative and newsworthy. Use proper markdown formatting throughout.`;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error("Ollama health check failed:", error);
      return false;
    }
  }
}

export const ollamaService = new OllamaService();
