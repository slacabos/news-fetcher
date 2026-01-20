import axios from "axios";
import { NewsItem, Topic } from "../../models/types";
import { db } from "../../database";
import { NewsProvider } from "./base.provider";
import { createLogger } from "../../utils/logger";

const API_BASE_URL = "https://hacker-news.firebaseio.com/v0";
const log = createLogger("services/providers/hackernews");

interface HNStory {
  id: number;
  title: string;
  url: string;
  score: number;
  time: number;
}

export class HackerNewsService implements NewsProvider {
  providerName = "hackernews";

  async fetchNewsForTopic(topic: Topic): Promise<NewsItem[]> {
    const sources = JSON.parse(topic.sources);
    const hnSources = sources.hackernews || [];
    log.debug({ topic: topic.name, sources: hnSources }, "HN sources");

    if (hnSources.length === 0) {
      log.info(
        `No sources configured for topic ${topic.name} and provider ${this.providerName}`
      );
      return [];
    }

    const keywords: string[] = JSON.parse(topic.keywords);
    log.info(
      `Fetching posts for topic: ${topic.name} from provider: ${this.providerName}`
    );

    const allStoryIds: number[] = [];
    const sourceCounts: Record<string, number> = {};
    if (hnSources.includes("top")) {
      const topIds = await this.fetchStoryIds("topstories");
      const limitedTopIds = topIds.slice(0, 100);
      allStoryIds.push(...limitedTopIds);
      sourceCounts.top = limitedTopIds.length;
      log.debug(
        { count: sourceCounts.top },
        "Pulled story IDs from Hacker News topstories"
      );
    }
    if (hnSources.includes("new")) {
      const newIds = await this.fetchStoryIds("newstories");
      const limitedNewIds = newIds.slice(0, 100);
      allStoryIds.push(...limitedNewIds);
      sourceCounts.new = limitedNewIds.length;
      log.debug(
        { count: sourceCounts.new },
        "Pulled story IDs from Hacker News newstories"
      );
    }
    if (hnSources.includes("best")) {
      const bestIds = await this.fetchStoryIds("beststories");
      const limitedBestIds = bestIds.slice(0, 100);
      allStoryIds.push(...limitedBestIds);
      sourceCounts.best = limitedBestIds.length;
      log.debug(
        { count: sourceCounts.best },
        "Pulled story IDs from Hacker News beststories"
      );
    }

    const storyIds = [...new Set(allStoryIds)]; // Deduplicate IDs
    log.debug(
      { count: storyIds.length },
      "Total unique Hacker News story IDs after dedupe"
    );

    const twentyFourHoursAgo = Date.now() / 1000 - 86400;

    const newsItems: NewsItem[] = [];

    for (const id of storyIds) {
      try {
        const { data: story } = await axios.get<HNStory>(
          `${API_BASE_URL}/item/${id}.json`
        );

        if (story && story.time > twentyFourHoursAgo) {
          const matchedKeywords = this.findMatchingKeywords(
            story.title,
            keywords
          );
          if (matchedKeywords.length > 0) {
            const newsItem: NewsItem = {
              title: story.title,
              url: story.url || `https://news.ycombinator.com/item?id=${id}`,
              source: "Hacker News",
              source_type: this.providerName,
              score: story.score,
              matched_keywords: matchedKeywords.join(", "),
              created_at: story.time,
            };
            newsItems.push(newsItem);
          }
        }
      } catch (error) {
        log.error({ err: error, id }, "Error fetching story from Hacker News");
      }
    }

    log.info(
      `Found ${newsItems.length} unique posts from ${this.providerName}`
    );

    // Save to database
    const savedItems: NewsItem[] = [];
    for (const item of newsItems) {
      try {
        const existing = db.getNewsItemByUrl(item.url);
        if (!existing) {
          const id = db.insertNewsItem(item);
          savedItems.push({ ...item, id });
        } else {
          savedItems.push(existing);
        }
      } catch (error) {
        log.error({ err: error, url: item.url }, "Error saving news item");
      }
    }

    return savedItems;
  }

  private async fetchStoryIds(
    endpoint: "topstories" | "newstories" | "beststories"
  ): Promise<number[]> {
    try {
      const { data } = await axios.get<number[]>(
        `${API_BASE_URL}/${endpoint}.json`
      );
      return data;
    } catch (error) {
      log.error({ err: error, endpoint }, "Error fetching Hacker News stories");
      return [];
    }
  }

  private findMatchingKeywords(text: string, keywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    return keywords.filter((keyword) => {
      const pattern = new RegExp(
        `\\b${keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      return pattern.test(text);
    });
  }
}
