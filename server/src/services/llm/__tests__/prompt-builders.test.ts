import { describe, expect, it } from "vitest";
import { buildSummaryMessages } from "../prompt-builders";
import { NewsItem } from "../../../models/types";

const sampleNewsItems: NewsItem[] = [
  {
    id: 1,
    title: "OpenAI releases GPT-5",
    score: 4200,
    url: "https://reddit.com/r/MachineLearning/1",
    source: "MachineLearning",
    source_type: "reddit",
    created_at: 1700000000,
    matched_keywords: "OpenAI, GPT",
  },
  {
    id: 2,
    title: "Nvidia reports record earnings",
    score: 3600,
    url: "https://reddit.com/r/technology/2",
    source: "technology",
    source_type: "reddit",
    created_at: 1700003600,
    matched_keywords: "Nvidia",
  },
];

describe("buildSummaryMessages", () => {
  it("returns system and user messages with expected roles", () => {
    const messages = buildSummaryMessages({
      topic: "AI",
      newsItems: sampleNewsItems,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[1]).toMatchObject({ role: "user" });
  });

  it("injects topic name into both prompts", () => {
    const topic = "quantum computing";
    const messages = buildSummaryMessages({
      topic,
      newsItems: sampleNewsItems,
    });

    expect(messages[0].content).toContain(topic);
    expect(messages[1].content).toContain(topic);
  });

  it("lists every news item in the user prompt with numbering", () => {
    const messages = buildSummaryMessages({
      topic: "AI",
      newsItems: sampleNewsItems,
    });
    const userPrompt = String(messages[1].content);

    sampleNewsItems.forEach((item, index) => {
      const ordinal = `${index + 1}.`;
      expect(userPrompt).toContain(ordinal);
      expect(userPrompt).toContain(item.title);
      expect(userPrompt).toContain(item.url);
      expect(userPrompt).toContain(item.source);
    });
  });

  it("describes the JSON fields in the system prompt", () => {
    const messages = buildSummaryMessages({
      topic: "AI",
      newsItems: sampleNewsItems,
    });
    const systemPrompt = String(messages[0].content);

    ["overview", "highlights", "details", "alsoNoted"].forEach((field) => {
      expect(systemPrompt).toContain(`"${field}"`);
    });
  });

  it("includes previous headlines only when provided", () => {
    const withoutPrevious = String(
      buildSummaryMessages({ topic: "AI", newsItems: sampleNewsItems })[1]
        .content,
    );
    expect(withoutPrevious).not.toContain("Previously covered");

    const withPrevious = String(
      buildSummaryMessages({
        topic: "AI",
        newsItems: sampleNewsItems,
        previousHeadlines: ["Yesterday's big launch"],
      })[1].content,
    );
    expect(withPrevious).toContain("Previously covered");
    expect(withPrevious).toContain("- Yesterday's big launch");
  });
});
