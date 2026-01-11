import { NewsProvider } from "./providers/base.provider";
import { RedditService } from "./reddit.service";
import { MockRedditService } from "./mock-reddit.service";
import { HackerNewsService } from "./providers/hackernews.service";
import { config } from "../config";

class NewsProviderFactory {
  private providers: Map<string, NewsProvider> = new Map();

  constructor() {
    if (config.useMockData) {
      this.register("reddit", new MockRedditService());
    } else {
      this.register("reddit", new RedditService());
    }
    this.register("hackernews", new HackerNewsService());
    // Register other providers here
  }

  register(name: string, provider: NewsProvider) {
    this.providers.set(name, provider);
  }

  get(name: string): NewsProvider | undefined {
    return this.providers.get(name);
  }

  getActiveProviders(): NewsProvider[] {
    return config.activeProviders
      .map((p) => this.get(p))
      .filter((p): p is NewsProvider => p !== undefined);
  }
}

export const newsProviderFactory = new NewsProviderFactory();
