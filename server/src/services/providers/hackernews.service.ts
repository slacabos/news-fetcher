import axios from "axios";
import { NewsItem, Topic } from "../../models/types";
import { db } from "../../database";
import { NewsProvider } from "./base.provider";

const API_BASE_URL = "https://hacker-news.firebaseio.com/v0";

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

    if (hnSources.length === 0) {
      console.log(
        `No sources configured for topic ${topic.name} and provider ${this.providerName}`
      );
      return [];
    }

    const keywords: string[] = JSON.parse(topic.keywords);
    console.log(
      `Fetching posts for topic: ${topic.name} from provider: ${this.providerName}`
    );

    let allStoryIds: number[] = [];
    if (hnSources.includes("top")) {
      const topIds = await this.fetchStoryIds("topstories");
      allStoryIds.push(...topIds.slice(0, 100));
    }
    if (hnSources.includes("new")) {
      const newIds = await this.fetchStoryIds("newstories");
      allStoryIds.push(...newIds.slice(0, 100));
    }
    if (hnSources.includes("best")) {
      const bestIds = await this.fetchStoryIds("beststories");
      allStoryIds.push(...bestIds.slice(0, 100));
    }

    const storyIds = [...new Set(allStoryIds)]; // Deduplicate IDs

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
        console.error(`Error fetching story ${id} from Hacker News:`, error);
      }
    }

    console.log(
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
        console.error(`Error saving news item:`, error);
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
      console.error(`Error fetching ${endpoint} from Hacker News:`, error);
      return [];
    }
  }

  private findMatchingKeywords(text: string, keywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    return keywords.filter((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );
  }
}
