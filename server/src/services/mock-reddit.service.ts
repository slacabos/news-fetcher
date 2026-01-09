import { NewsItem } from "../models/types";

export class MockRedditService {
  async fetchNewsByTopic(topicName: string): Promise<NewsItem[]> {
    console.log(`[MOCK] Fetching posts for topic: ${topicName}`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;

    // Mock news items
    const mockPosts: NewsItem[] = [
      {
        title:
          "OpenAI announces GPT-5 with groundbreaking multimodal capabilities",
        url: "https://reddit.com/r/artificial/mock1",
        subreddit: "artificial",
        score: 2847,
        matched_keywords: "OpenAI, GPT, AI",
        created_at: now - 3600,
      },
      {
        title:
          "Anthropic's Claude 4 achieves 95% on advanced reasoning benchmarks",
        url: "https://reddit.com/r/MachineLearning/mock2",
        subreddit: "MachineLearning",
        score: 1923,
        matched_keywords: "Claude, Anthropic, AI",
        created_at: now - 7200,
      },
      {
        title: "NVIDIA releases new AI chip with 10x performance improvement",
        url: "https://reddit.com/r/artificial/mock3",
        subreddit: "artificial",
        score: 1654,
        matched_keywords: "Nvidia, AI",
        created_at: now - 10800,
      },
      {
        title: "Local LLM breakthrough: Running 70B models on consumer GPUs",
        url: "https://reddit.com/r/LocalLLaMA/mock4",
        subreddit: "LocalLLaMA",
        score: 1432,
        matched_keywords: "LLM, Machine Learning",
        created_at: now - 14400,
      },
      {
        title:
          "New research paper: Transformers architecture fundamentally reimagined",
        url: "https://reddit.com/r/MachineLearning/mock5",
        subreddit: "MachineLearning",
        score: 1287,
        matched_keywords: "Machine Learning, Deep Learning",
        created_at: now - 18000,
      },
      {
        title: "OpenAI safety research reveals new alignment techniques",
        url: "https://reddit.com/r/OpenAI/mock6",
        subreddit: "OpenAI",
        score: 891,
        matched_keywords: "OpenAI, AI",
        created_at: now - 21600,
      },
      {
        title: "Meta's LLaMA 4 open source release draws community praise",
        url: "https://reddit.com/r/LocalLLaMA/mock7",
        subreddit: "LocalLLaMA",
        score: 743,
        matched_keywords: "LLM, AI",
        created_at: now - 25200,
      },
      {
        title:
          "AI agents successfully complete complex software engineering tasks",
        url: "https://reddit.com/r/artificial/mock8",
        subreddit: "artificial",
        score: 632,
        matched_keywords: "AI, Artificial Intelligence",
        created_at: now - 28800,
      },
    ];

    console.log(`[MOCK] Generated ${mockPosts.length} mock posts`);
    return mockPosts;
  }
}

export const mockRedditService = new MockRedditService();
