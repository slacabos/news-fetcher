import { createClient, Client } from "@libsql/client";
import { config } from "../config";
import {
  NewsItem,
  Summary,
  Topic,
  SlackPost,
} from "../models/types";
import { createLogger } from "../utils/logger";

const log = createLogger("database");

export class DatabaseService {
  private db: Client;
  private initialized: Promise<void>;

  constructor() {
    this.db = createClient({
      url: config.database.url,
      authToken: config.database.authToken,
    });
    this.initialized = this.initialize().catch((error) => {
      log.error({ err: error }, "Failed to initialize database");
      throw error;
    });
  }

  private async initialize() {
    // Create tables
    await this.db.batch([
      `
      CREATE TABLE IF NOT EXISTS news_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL,
        source_type TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        matched_keywords TEXT,
        created_at INTEGER NOT NULL
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        summary_markdown TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS summary_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary_id INTEGER NOT NULL,
        news_item_id INTEGER NOT NULL,
        FOREIGN KEY (summary_id) REFERENCES summaries(id),
        FOREIGN KEY (news_item_id) REFERENCES news_items(id)
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        keywords TEXT NOT NULL,
        sources TEXT NOT NULL,
        active INTEGER DEFAULT 1
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS slack_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary_id INTEGER NOT NULL,
        slack_channel_id TEXT NOT NULL,
        slack_message_ts TEXT NOT NULL,
        posted_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(summary_id, slack_channel_id),
        FOREIGN KEY (summary_id) REFERENCES summaries(id)
      )
      `,
      `CREATE INDEX IF NOT EXISTS idx_news_created_at ON news_items(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_summaries_topic ON summaries(topic)`,
      `CREATE INDEX IF NOT EXISTS idx_slack_posts_summary ON slack_posts(summary_id)`,
    ], "write");

    // Seed initial topics if the table is empty
    const topicRow = await this.db.execute({
      sql: "SELECT COUNT(*) as count FROM topics",
      args: [],
    });
    const topicCount = topicRow.rows[0]?.count as number || 0;
    if (topicCount === 0 && Array.isArray(config.topics)) {
      log.info("Seeding topics...");
      for (const topic of config.topics) {
        await this.db.execute({
          sql: `INSERT INTO topics (name, keywords, sources, active) VALUES (?, ?, ?, ?)`,
          args: [
            topic.name,
            JSON.stringify(topic.keywords),
            JSON.stringify(topic.sources),
            topic.active,
          ],
        });
      }
    }

    log.info("Database initialized successfully");
  }

  async waitForInit(): Promise<void> {
    await this.initialized;
  }

  private normalizeRowId(rowId: number | bigint): number {
    return typeof rowId === "bigint" ? Number(rowId) : rowId;
  }

  // News Items
  async insertNewsItem(item: NewsItem): Promise<number> {
    await this.initialized;
    const result = await this.db.execute({
      sql: `
        INSERT INTO news_items (title, url, source, source_type, score, matched_keywords, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        item.title,
        item.url,
        item.source,
        item.source_type,
        item.score,
        item.matched_keywords,
        item.created_at,
      ],
    });
    return this.normalizeRowId(result.lastInsertRowid!);
  }

  async getNewsItemByUrl(url: string): Promise<NewsItem | undefined> {
    await this.initialized;
    const result = await this.db.execute({
      sql: "SELECT * FROM news_items WHERE url = ?",
      args: [url],
    });
    return result.rows[0] as unknown as NewsItem | undefined;
  }

  async getNewsItemsByIds(ids: number[]): Promise<NewsItem[]> {
    await this.initialized;
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const result = await this.db.execute({
      sql: `SELECT * FROM news_items WHERE id IN (${placeholders})`,
      args: ids,
    });
    return result.rows as unknown as NewsItem[];
  }

  // Summaries
  async insertSummary(summary: Summary): Promise<number> {
    await this.initialized;
    const result = await this.db.execute({
      sql: `
        INSERT INTO summaries (topic, summary_markdown, created_at)
        VALUES (?, ?, datetime('now'))
      `,
      args: [summary.topic, summary.summary_markdown],
    });
    return this.normalizeRowId(result.lastInsertRowid!);
  }

  async getLatestSummary(): Promise<Summary | undefined> {
    await this.initialized;
    const result = await this.db.execute({
      sql: "SELECT * FROM summaries ORDER BY created_at DESC LIMIT 1",
      args: [],
    });
    return result.rows[0] as unknown as Summary | undefined;
  }

  async getSummaries(filters?: { date?: string; topic?: string }): Promise<Summary[]> {
    await this.initialized;
    let query = "SELECT * FROM summaries WHERE 1=1";
    const args: string[] = [];

    if (filters?.date) {
      query += " AND DATE(created_at) = ?";
      args.push(filters.date);
    }

    if (filters?.topic) {
      query += " AND topic = ?";
      args.push(filters.topic);
    }

    query += " ORDER BY created_at DESC";

    const result = await this.db.execute({
      sql: query,
      args,
    });
    return result.rows as unknown as Summary[];
  }

  async getSummaryById(id: number): Promise<Summary | undefined> {
    await this.initialized;
    const result = await this.db.execute({
      sql: "SELECT * FROM summaries WHERE id = ?",
      args: [id],
    });
    return result.rows[0] as unknown as Summary | undefined;
  }

  // Summary Sources
  async insertSummarySource(summaryId: number, newsItemId: number): Promise<void> {
    await this.initialized;
    await this.db.execute({
      sql: `
        INSERT INTO summary_sources (summary_id, news_item_id)
        VALUES (?, ?)
      `,
      args: [summaryId, newsItemId],
    });
  }

  async getSourcesBySummaryId(summaryId: number): Promise<NewsItem[]> {
    await this.initialized;
    const result = await this.db.execute({
      sql: `
        SELECT n.* FROM news_items n
        INNER JOIN summary_sources ss ON n.id = ss.news_item_id
        WHERE ss.summary_id = ?
        ORDER BY n.score DESC
      `,
      args: [summaryId],
    });
    return result.rows as unknown as NewsItem[];
  }

  // Topics
  async getTopics(): Promise<Topic[]> {
    await this.initialized;
    const result = await this.db.execute({
      sql: "SELECT * FROM topics WHERE active = 1",
      args: [],
    });
    return result.rows as unknown as Topic[];
  }

  async getTopicByName(name: string): Promise<Topic | undefined> {
    await this.initialized;
    const result = await this.db.execute({
      sql: "SELECT * FROM topics WHERE name = ?",
      args: [name],
    });
    return result.rows[0] as unknown as Topic | undefined;
  }

  // Slack Posts
  async checkIfSummaryPostedToSlack(summaryId: number, channelId: string): Promise<boolean> {
    await this.initialized;
    const result = await this.db.execute({
      sql: "SELECT id FROM slack_posts WHERE summary_id = ? AND slack_channel_id = ?",
      args: [summaryId, channelId],
    });
    return result.rows.length > 0;
  }

  async insertSlackPost(
    summaryId: number,
    channelId: string,
    messageTs: string
  ): Promise<number> {
    await this.initialized;
    const result = await this.db.execute({
      sql: `
        INSERT INTO slack_posts (summary_id, slack_channel_id, slack_message_ts)
        VALUES (?, ?, ?)
      `,
      args: [summaryId, channelId, messageTs],
    });
    return this.normalizeRowId(result.lastInsertRowid!);
  }

  async getSlackPostBySummaryId(
    summaryId: number,
    channelId: string
  ): Promise<SlackPost | undefined> {
    await this.initialized;
    const result = await this.db.execute({
      sql: "SELECT * FROM slack_posts WHERE summary_id = ? AND slack_channel_id = ? ORDER BY posted_at DESC LIMIT 1",
      args: [summaryId, channelId],
    });
    return result.rows[0] as unknown as SlackPost | undefined;
  }

  close() {
    this.db.close();
  }
}

export const db = new DatabaseService();
