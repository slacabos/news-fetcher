import type OpenAI from "openai";
import { NewsItem } from "../../models/types";

export type SummaryPromptContext = {
  topic: string;
  newsItems: NewsItem[];
};

export function buildSummaryMessages(
  context: SummaryPromptContext
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const { topic, newsItems } = context;

  return [
    { role: "system", content: buildSystemPrompt(topic) },
    { role: "user", content: buildUserPrompt(topic, newsItems) },
  ];
}

function buildSystemPrompt(topic: string): string {
  return `You are an expert AI news analyst specializing in ${topic}. Your role is to:
- Analyze news posts and identify key trends and developments
- Create comprehensive, well-structured markdown summaries
- Maintain objectivity and technical accuracy
- Prioritize high-quality, high-engagement content
- Present information in a clear, newsworthy format`;
}

function buildUserPrompt(topic: string, newsItems: NewsItem[]): string {
  return `Analyze these ${
    newsItems.length
  } stories/posts about ${topic} from the last 24 hours and create a comprehensive news summary.

**News Posts:**
${formatNewsItems(newsItems)}

**Create a markdown summary with these exact sections:**

## Overview
Provide 2-3 sentences summarizing the main themes, trends, and overall sentiment in ${topic} today.

## Key Developments
- List major developments, announcements, or breakthroughs
- Each bullet should be 1-2 sentences
- Focus on concrete, newsworthy items
- Order by significance (highest-scored posts first)

## Notable Highlights
Present 3-5 standout items in this format:
- **Topic/Company Name**: Brief description of the highlight or announcement

## Sources
List all source posts in this format:
- [Post Title](URL) - Source (score)

**Guidelines:**
- Use proper markdown formatting throughout
- Be concise but informative
- Focus on facts, not speculation
- Maintain a professional, objective tone`;
}

function formatNewsItems(newsItems: NewsItem[]): string {
  return newsItems
    .map(
      (item, index) =>
        `${index + 1}. **"${item.title}"**\n   - Source: ${
          item.source
        }\n   - Score: ${item.score}\n   - URL: ${item.url}`
    )
    .join("\n\n");
}
