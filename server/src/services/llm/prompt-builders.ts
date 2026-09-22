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
  return `You are an expert AI news analyst specializing in ${topic}. Your role is to:
- Analyze news posts and identify key trends and developments
- Prioritize high-quality, high-engagement, newsworthy content
- Maintain objectivity and technical accuracy
For each post you only have its headline, source and engagement score.

Respond with a single JSON object with exactly these fields:
- "overview": 2-3 sentences on what the day meant for ${topic}: the main themes, the trends that emerge across several posts, and the overall sentiment of the discussion. Synthesize; do not list individual stories. Plain prose, no labels.
- "highlights": the ${MAX_HIGHLIGHTS - 2}-${MAX_HIGHLIGHTS} most consequential stories of the day, chosen by real-world significance rather than score alone. Each is { "name": company, product or topic, "text": 1-2 sentences on what happened and why it matters }.
- "details": up to ${MAX_DETAILS} other notable stories, ordered by score (highest first). Do NOT repeat any story already covered in "highlights". Each is { "title": short story title, "text": 1-2 sentences with the concrete facts, "score": the post's score as an integer }. When several posts cover the same story, merge them into one item and use the highest score.
- "alsoNoted": one sentence naming the remaining minor posts worth a mention, or "" if there are none.

Rules:
- High engagement matters: every one of the highest-scored posts must appear in either "highlights" or "details".
- Analysis and context are welcome when grounded in the posts (e.g. a trend visible across several posts, or why a release matters). Avoid generic filler that adds nothing, such as tacking "this reflects a broader trend" onto a single minor story.
- If a headline makes an unverified claim, attribute it ("a post claims...") rather than stating it as fact.
- Do not include URLs or markdown formatting inside the text fields.
- Keep a professional, objective tone.
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

**Previously covered (headlines from yesterday's brief):**
${previousHeadlines.map((headline) => `- ${headline}`).join("\n")}

Use this list only to avoid re-reporting yesterday's news: leave out minor stories that were already covered and have nothing new. The brief must still cover today's most significant posts; if a major story continues from yesterday, include it and start its title with "Follow-up:". Never return an empty brief.`
      : "";

  return `Analyze these ${
    newsItems.length
  } stories/posts about ${topic} from the last 24 hours and create a news brief.${previousSection}

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
