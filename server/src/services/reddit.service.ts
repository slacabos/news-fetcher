import axios from "axios";
import { config } from "../config";
import { NewsItem, Topic } from "../models/types";
import { db } from "../database";
import { NewsProvider } from "./providers/base.provider";
import { createLogger } from "../utils/logger";

const log = createLogger("services/reddit");

interface RedditPost {
  data: {
    title: string;
    permalink: string;
    subreddit: string;
    score: number;
    selftext?: string;
    created_utc: number;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

interface RedditAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

export class RedditService implements NewsProvider {
  providerName = "reddit";
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!config.reddit.clientId || !config.reddit.clientSecret) {
      throw new Error(
        "Reddit API credentials not configured. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env file"
      );
    }

    // Get new access token
    const auth = Buffer.from(
      `${config.reddit.clientId}:${config.reddit.clientSecret}`
    ).toString("base64");

    try {
      const response = await axios.post<RedditAccessTokenResponse>(
        "https://www.reddit.com/api/v1/access_token",
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": config.reddit.userAgent,
          },
        }
      );

      const accessToken = response.data.access_token;
      this.accessToken = accessToken;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      return accessToken;
    } catch (error) {
      log.error({ err: error }, "Error getting Reddit access token");
      throw new Error("Failed to authenticate with Reddit API");
    }
  }

  private async makeRedditRequest(endpoint: string): Promise<RedditResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get<RedditResponse>(
        `https://oauth.reddit.com${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": config.reddit.userAgent,
          },
        }
      );

      return response.data;
    } catch (error) {
      log.error(
        { err: error, endpoint },
        "Error making Reddit API request"
      );
      throw error;
    }
  }

  async fetchNewsForTopic(topic: Topic): Promise<NewsItem[]> {
    const sources = JSON.parse(topic.sources);
    const subreddits = sources.reddit || [];

    if (subreddits.length === 0) {
      log.info(
        `No subreddits configured for topic ${topic.name} and provider ${this.providerName}`
      );
      return [];
    }

    const keywords: string[] = JSON.parse(topic.keywords);

    log.info(
      `Fetching posts for topic: ${topic.name} from provider: ${this.providerName}`
    );
    log.debug({ subreddits }, "Reddit subreddits");
    log.debug({ keywords }, "Reddit keywords");

    const posts = new Map<string, NewsItem>();
    const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

    // Fetch from subreddits
    for (const subreddit of subreddits) {
      try {
        log.debug({ subreddit }, "Fetching subreddit posts");
        const response = await this.makeRedditRequest(
          `/r/${subreddit}/hot?limit=50`
        );

        for (const postWrapper of response.data.children) {
          const post = postWrapper.data;

          // Skip if post is older than 24 hours
          if (post.created_utc < oneDayAgo) continue;

          const matchedKeywords = this.findMatchingKeywords(
            post.title + " " + (post.selftext || ""),
            keywords
          );

          // Add post if it matches keywords or if we're in a targeted subreddit
          if (matchedKeywords.length > 0 || subreddits.includes(subreddit)) {
            const newsItem: NewsItem = {
              title: post.title,
              url: `https://reddit.com${post.permalink}`,
              source: post.subreddit,
              source_type: this.providerName,
              score: post.score,
              matched_keywords: matchedKeywords.join(", "),
              created_at: post.created_utc,
            };

            // Deduplicate by URL
            if (!posts.has(newsItem.url)) {
              posts.set(newsItem.url, newsItem);
            }
          }
        }
      } catch (error) {
        log.error(
          { err: error, subreddit },
          "Error fetching subreddit posts"
        );
      }
    }

    // Also search across Reddit using keywords
    for (const keyword of keywords.slice(0, 3)) {
      // Limit keyword searches to avoid rate limits
      try {
        log.debug({ keyword }, "Searching Reddit for keyword");
        const response = await this.makeRedditRequest(
          `/search?q=${encodeURIComponent(keyword)}&t=day&sort=hot&limit=20`
        );

        for (const postWrapper of response.data.children) {
          const post = postWrapper.data;

          if (post.created_utc < oneDayAgo) continue;

          const matchedKeywords = this.findMatchingKeywords(
            post.title + " " + (post.selftext || ""),
            keywords
          );

          const newsItem: NewsItem = {
            title: post.title,
            url: `https://reddit.com${post.permalink}`,
            source: post.subreddit,
            source_type: this.providerName,
            score: post.score,
            matched_keywords: matchedKeywords.join(", "),
            created_at: post.created_utc,
          };

          if (!posts.has(newsItem.url)) {
            posts.set(newsItem.url, newsItem);
          }
        }
      } catch (error) {
        log.error(
          { err: error, keyword },
          "Error searching Reddit for keyword"
        );
      }
    }

    const newsItems = Array.from(posts.values());
    log.info(
      `Found ${newsItems.length} unique posts from ${this.providerName}`
    );

    // Save to database
    const savedItems: NewsItem[] = [];
    for (const item of newsItems) {
      try {
        // Check if already exists
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

  private findMatchingKeywords(text: string, keywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    return keywords.filter((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );
  }
}

export const redditService = new RedditService();
