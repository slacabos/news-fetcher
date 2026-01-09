import Snoowrap from "snoowrap";
import { config } from "../config";
import { NewsItem } from "../models/types";
import { db } from "../database";

export class RedditService {
  private reddit: Snoowrap | null = null;

  private getReddit(): Snoowrap {
    if (!this.reddit) {
      if (!config.reddit.clientId || !config.reddit.clientSecret) {
        throw new Error(
          "Reddit API credentials not configured. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env file"
        );
      }
      this.reddit = new Snoowrap({
        userAgent: config.reddit.userAgent,
        clientId: config.reddit.clientId,
        clientSecret: config.reddit.clientSecret,
      });
    }
    return this.reddit;
  }

  async fetchNewsByTopic(topicName: string): Promise<NewsItem[]> {
    const reddit = this.getReddit();
    const topic = db.getTopicByName(topicName);
    if (!topic) {
      throw new Error(`Topic ${topicName} not found`);
    }

    const keywords: string[] = JSON.parse(topic.keywords);
    const subreddits: string[] = JSON.parse(topic.subreddits);

    console.log(`Fetching posts for topic: ${topicName}`);
    console.log(`Subreddits: ${subreddits.join(", ")}`);
    console.log(`Keywords: ${keywords.join(", ")}`);

    const posts = new Map<string, NewsItem>();
    const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

    // Fetch from subreddits
    for (const subreddit of subreddits) {
      try {
        console.log(`Fetching from r/${subreddit}...`);
        const subredditPosts = await reddit
          .getSubreddit(subreddit)
          .getHot({ limit: 50 });

        for (const post of subredditPosts) {
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
              subreddit: post.subreddit.display_name,
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
        console.error(`Error fetching from r/${subreddit}:`, error);
      }
    }

    // Also search across Reddit using keywords
    for (const keyword of keywords.slice(0, 3)) {
      // Limit keyword searches to avoid rate limits
      try {
        console.log(`Searching Reddit for keyword: ${keyword}...`);
        const searchResults = await reddit.search({
          query: keyword,
          time: "day",
          sort: "hot",
          limit: 20,
        });

        for (const post of searchResults) {
          if (post.created_utc < oneDayAgo) continue;

          const matchedKeywords = this.findMatchingKeywords(
            post.title + " " + (post.selftext || ""),
            keywords
          );

          const newsItem: NewsItem = {
            title: post.title,
            url: `https://reddit.com${post.permalink}`,
            subreddit: post.subreddit.display_name,
            score: post.score,
            matched_keywords: matchedKeywords.join(", "),
            created_at: post.created_utc,
          };

          if (!posts.has(newsItem.url)) {
            posts.set(newsItem.url, newsItem);
          }
        }
      } catch (error) {
        console.error(`Error searching for keyword ${keyword}:`, error);
      }
    }

    const newsItems = Array.from(posts.values());
    console.log(`Found ${newsItems.length} unique posts`);

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
        console.error(`Error saving news item:`, error);
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
