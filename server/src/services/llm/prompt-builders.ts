import type OpenAI from "openai";
import { NewsItem } from "../../models/types";
import { MAX_DETAILS, MAX_HIGHLIGHTS } from "./summary-schema";

export type SummaryPromptContext = {
  topic: string;
  newsItems: NewsItem[];
  previousHeadlines?: string[];
};

export function buildSummaryMessages(
  context: SummaryPromptContext,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const { topic, newsItems, previousHeadlines } = context;

  return [
    { role: "system", content: buildSystemPrompt(topic) },
    {
      role: "user",
      content: buildUserPrompt(topic, newsItems, previousHeadlines),
    },
  ];
}

function buildSystemPrompt(topic: string): string {
  return `You are an expert AI news analyst specializing in ${topic}. You write a daily news brief from a list of posts. For each post you only have its headline, source and engagement score.

Respond with a single JSON object with exactly these fields:
- "overview": 2-3 sentences on the main themes of the day. Plain prose, no lists, no labels.
- "highlights": ${MAX_HIGHLIGHTS - 2}-${MAX_HIGHLIGHTS} standout items, each { "name": company, product or topic, "text": one sentence }.
- "details": at most ${MAX_DETAILS} of the most significant stories, ordered by significance (highest-scored first), each { "title": short story title, "text": 1-2 sentences, "score": the post's score as an integer }. When several posts cover the same story, merge them into one item and use the highest score.
- "alsoNoted": one sentence briefly grouping the remaining minor or low-scored posts worth a mention, or "" if there are none.

Rules:
- Only state what the headline and source support. Do not speculate about implications or trends, and avoid filler such as "this suggests", "signals", "underscores" or "reflects a broader trend".
- If a headline makes an unverified claim, attribute it ("a post claims...") rather than stating it as fact.
- Do not include URLs or markdown formatting inside the text fields.
- Keep a neutral, factual tone.
- Output only the JSON object, with no preamble, follow-up offers or commentary.`;
}

function buildUserPrompt(
  topic: string,
  newsItems: NewsItem[],
  previousHeadlines?: string[],
): string {
  const previousSection =
    previousHeadlines && previousHeadlines.length > 0
      ? `

**Previously covered (headlines from the previous brief):**
${previousHeadlines.map((headline) => `- ${headline}`).join("\n")}

Skip stories that were already covered unless a post reports a new development. For a new development, start the detail title with "Follow-up:".`
      : "";

  return `Summarize these ${
    newsItems.length
  } stories/posts about ${topic} from the last 24 hours.${previousSection}

**News Posts:**
${formatNewsItems(newsItems)}`;
}

function formatNewsItems(newsItems: NewsItem[]): string {
  return newsItems
    .map(
      (item, index) =>
        `${index + 1}. **"${item.title}"**\n   - Source: ${
          item.source
        }\n   - Score: ${item.score}\n   - URL: ${item.url}`,
    )
    .join("\n\n");
}
