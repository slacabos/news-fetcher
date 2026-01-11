export interface NewsItem {
  id?: number;
  title: string;
  url: string;
  source: string;
  source_type: string;
  score: number;
  matched_keywords: string;
  created_at: number;
}

export interface Summary {
  id?: number;
  topic: string;
  summary_markdown: string;
  created_at: string;
}

export interface SummarySource {
  id?: number;
  summary_id: number;
  news_item_id: number;
}

export interface Topic {
  id?: number;
  name: string;
  keywords: string;
  sources: string;
  active: number;
}

export interface SummaryWithSources extends Summary {
  sources: NewsItem[];
}

export interface SlackPost {
  id?: number;
  summary_id: number;
  slack_channel_id: string;
  slack_message_ts: string;
  posted_at: string;
}

export interface SlackPostResult {
  success: boolean;
  error?: string;
  timestamp?: string;
  alreadyPosted?: boolean;
}
