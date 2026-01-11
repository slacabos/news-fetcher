import Database from "better-sqlite3";
import { config } from "../config";
import {
  NewsItem,
  Summary,
  SummarySource,
  Topic,
  SlackPost,
} from "../models/types";

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(config.database.path);
    this.initialize();
  }

  private initialize() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS news_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL,
        source_type TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        matched_keywords TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        summary_markdown TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS summary_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary_id INTEGER NOT NULL,
        news_item_id INTEGER NOT NULL,
        FOREIGN KEY (summary_id) REFERENCES summaries(id),
        FOREIGN KEY (news_item_id) REFERENCES news_items(id)
      );

      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        keywords TEXT NOT NULL,
        sources TEXT NOT NULL,
        active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS slack_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary_id INTEGER NOT NULL,
        slack_channel_id TEXT NOT NULL,
        slack_message_ts TEXT NOT NULL,
        posted_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(summary_id, slack_channel_id),
        FOREIGN KEY (summary_id) REFERENCES summaries(id)
      );

      CREATE INDEX IF NOT EXISTS idx_news_created_at ON news_items(created_at);
      CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at);
      CREATE INDEX IF NOT EXISTS idx_summaries_topic ON summaries(topic);
      CREATE INDEX IF NOT EXISTS idx_slack_posts_summary ON slack_posts(summary_id);
    `);

    // Seed initial topics if the table is empty
    const topicCount = (
      this.db.prepare("SELECT COUNT(*) as count FROM topics").get() as {
        count: number;
      }
    ).count;
    if (topicCount === 0 && Array.isArray(config.topics)) {
      console.log("Seeding topics...");
      const insertStmt = this.db.prepare(
        `INSERT INTO topics (name, keywords, sources, active) VALUES (?, ?, ?, ?)`
      );
      for (const topic of config.topics) {
        insertStmt.run(
          topic.name,
          JSON.stringify(topic.keywords),
          JSON.stringify(topic.sources),
          topic.active
        );
      }
    }
  }

  // News Items
  insertNewsItem(item: NewsItem): number {
    const stmt = this.db.prepare(`
      INSERT INTO news_items (title, url, source, source_type, score, matched_keywords, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      item.title,
      item.url,
      item.source,
      item.source_type,
      item.score,
      item.matched_keywords,
      item.created_at
    );
    return result.lastInsertRowid as number;
  }

  getNewsItemByUrl(url: string): NewsItem | undefined {
    return this.db
      .prepare("SELECT * FROM news_items WHERE url = ?")
      .get(url) as NewsItem | undefined;
  }

  getNewsItemsByIds(ids: number[]): NewsItem[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    return this.db
      .prepare(`SELECT * FROM news_items WHERE id IN (${placeholders})`)
      .all(...ids) as NewsItem[];
  }

  // Summaries
  insertSummary(summary: Summary): number {
    const stmt = this.db.prepare(`
      INSERT INTO summaries (topic, summary_markdown, created_at)
      VALUES (?, ?, datetime('now'))
    `);
    const result = stmt.run(summary.topic, summary.summary_markdown);
    return result.lastInsertRowid as number;
  }

  getLatestSummary(): Summary | undefined {
    return this.db
      .prepare("SELECT * FROM summaries ORDER BY created_at DESC LIMIT 1")
      .get() as Summary | undefined;
  }

  getSummaries(filters?: { date?: string; topic?: string }): Summary[] {
    let query = "SELECT * FROM summaries WHERE 1=1";
    const params: any[] = [];

    if (filters?.date) {
      query += " AND DATE(created_at) = ?";
      params.push(filters.date);
    }

    if (filters?.topic) {
      query += " AND topic = ?";
      params.push(filters.topic);
    }

    query += " ORDER BY created_at DESC";

    return this.db.prepare(query).all(...params) as Summary[];
  }

  getSummaryById(id: number): Summary | undefined {
    return this.db.prepare("SELECT * FROM summaries WHERE id = ?").get(id) as
      | Summary
      | undefined;
  }

  // Summary Sources
  insertSummarySource(summaryId: number, newsItemId: number) {
    this.db
      .prepare(
        `
      INSERT INTO summary_sources (summary_id, news_item_id)
      VALUES (?, ?)
    `
      )
      .run(summaryId, newsItemId);
  }

  getSourcesBySummaryId(summaryId: number): NewsItem[] {
    return this.db
      .prepare(
        `
      SELECT n.* FROM news_items n
      INNER JOIN summary_sources ss ON n.id = ss.news_item_id
      WHERE ss.summary_id = ?
      ORDER BY n.score DESC
    `
      )
      .all(summaryId) as NewsItem[];
  }

  // Topics
  getTopics(): Topic[] {
    return this.db
      .prepare("SELECT * FROM topics WHERE active = 1")
      .all() as Topic[];
  }

  getTopicByName(name: string): Topic | undefined {
    return this.db.prepare("SELECT * FROM topics WHERE name = ?").get(name) as
      | Topic
      | undefined;
  }

  // Slack Posts
  checkIfSummaryPostedToSlack(summaryId: number, channelId: string): boolean {
    const result = this.db
      .prepare(
        "SELECT id FROM slack_posts WHERE summary_id = ? AND slack_channel_id = ?"
      )
      .get(summaryId, channelId);
    return result !== undefined;
  }

  insertSlackPost(
    summaryId: number,
    channelId: string,
    messageTs: string
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO slack_posts (summary_id, slack_channel_id, slack_message_ts)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(summaryId, channelId, messageTs);
    return result.lastInsertRowid as number;
  }

  getSlackPostBySummaryId(
    summaryId: number,
    channelId: string
  ): SlackPost | undefined {
    return this.db
      .prepare(
        "SELECT * FROM slack_posts WHERE summary_id = ? AND slack_channel_id = ? ORDER BY posted_at DESC LIMIT 1"
      )
      .get(summaryId, channelId) as SlackPost | undefined;
  }

  close() {
    this.db.close();
  }
}

export const db = new DatabaseService();
