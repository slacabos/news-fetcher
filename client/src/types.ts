export interface NewsItem {
  id?: number;
  title: string;
  url: string;
  subreddit: string;
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

export interface SummaryWithSources extends Summary {
  sources: NewsItem[];
}

export interface Topic {
  id?: number;
  name: string;
  keywords: string[];
  subreddits: string[];
  active: number;
}
