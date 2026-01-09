import axios from 'axios';
import { config } from '../config';
import { NewsItem } from '../models/types';

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
      return 'No news items found for this topic.';
    }

    console.log(`Generating summary for ${newsItems.length} news items using ${this.model}...`);

    // Sort by score to prioritize important posts
    const sortedItems = [...newsItems].sort((a, b) => b.score - a.score);

    // Build the prompt
    const prompt = this.buildPrompt(sortedItems, topic);

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
      console.log('Summary generated successfully');
      return summary;
    } catch (error) {
      console.error('Error generating summary with Ollama:', error);
      throw new Error('Failed to generate summary');
    }
  }

  private buildPrompt(newsItems: NewsItem[], topic: string): string {
    const postsText = newsItems
      .map((item, index) => 
        `${index + 1}. "${item.title}" (${item.subreddit}, ${item.score} upvotes)\n   URL: ${item.url}`
      )
      .join('\n\n');

    return `You are an AI news analyst. Analyze the following Reddit posts about ${topic} from the last 24 hours and create a comprehensive summary.

Reddit Posts:
${postsText}

Please provide:
1. A brief overview paragraph summarizing the key themes and trends (2-3 sentences)
2. Main topics or developments mentioned across the posts (bullet points)
3. Notable highlights or important announcements
4. A markdown-formatted list of all source links at the end with format: "- [Post Title](URL) - r/subreddit (score upvotes)"

Format your response in markdown. Be concise but informative. Focus on what's newsworthy and significant.`;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/tags`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  }
}

export const ollamaService = new OllamaService();
