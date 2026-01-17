import { NewsItem, Topic } from "../models/types";
import { NewsProvider } from "./providers/base.provider";
import { createLogger } from "../utils/logger";

const log = createLogger("services/mock-reddit");

export class MockRedditService implements NewsProvider {
  providerName = "reddit";

  async fetchNewsForTopic(topic: Topic): Promise<NewsItem[]> {
    log.debug({ topic: topic.name }, "[MOCK] Fetching posts for topic");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const now = Math.floor(Date.now() / 1000);

    // Mock news items
    const mockPosts: NewsItem[] = [
      {
        title:
          "OpenAI announces GPT-5 with groundbreaking multimodal capabilities",
        url: "https://reddit.com/r/artificial/mock1",
        source: "artificial",
        source_type: "reddit",
        score: 2847,
        matched_keywords: "OpenAI, GPT, AI",
        created_at: now - 3600,
      },
      {
        title:
          "Anthropic's Claude 4 achieves 95% on advanced reasoning benchmarks",
        url: "https://reddit.com/r/MachineLearning/mock2",
        source: "MachineLearning",
        source_type: "reddit",
        score: 1923,
        matched_keywords: "Claude, Anthropic, AI",
        created_at: now - 7200,
      },
      {
        title: "NVIDIA releases new AI chip with 10x performance improvement",
        url: "https://reddit.com/r/artificial/mock3",
        source: "artificial",
        source_type: "reddit",
        score: 1654,
        matched_keywords: "Nvidia, AI",
        created_at: now - 10800,
      },
    ];

    log.debug(
      { count: mockPosts.length, provider: this.providerName },
      "[MOCK] Generated mock posts"
    );
    return mockPosts;
  }
}

export const mockRedditService = new MockRedditService();
