import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewsItem, Topic } from "../../models/types";

const mocks = vi.hoisted(() => ({
  generateSummary: vi.fn(),
  fetchNewsForTopic: vi.fn(),
  insertSummary: vi.fn(),
  insertSummarySource: vi.fn(),
  getTopicByName: vi.fn(),
  postSummary: vi.fn(),
  config: {
    summary: { maxItems: 2, sourceWeights: {}, sourceQuotas: {} },
    slack: { enabled: false, autoPost: false },
  },
}));

vi.mock("../llm/llm.factory", () => ({
  llmService: {
    generateSummary: mocks.generateSummary,
    getProviderName: () => "mock-llm",
    getModelName: () => "mock-model",
  },
}));

vi.mock("../provider.factory", () => ({
  newsProviderFactory: {
    getActiveProviders: () => [
      {
        providerName: "mock-provider",
        fetchNewsForTopic: mocks.fetchNewsForTopic,
      },
    ],
  },
}));

vi.mock("../slack.service", () => ({
  slackService: {
    postSummary: mocks.postSummary,
  },
}));

vi.mock("../../database", () => ({
  db: {
    getTopicByName: mocks.getTopicByName,
    insertSummary: mocks.insertSummary,
    insertSummarySource: mocks.insertSummarySource,
  },
}));

vi.mock("../../config", () => ({
  config: mocks.config,
}));

import { summaryService } from "../summary.service";

const buildItem = (overrides: Partial<NewsItem>): NewsItem => ({
  id: overrides.id ?? 1,
  title: overrides.title ?? "Default title",
  url: overrides.url ?? "https://example.com/default",
  source: overrides.source ?? "example",
  source_type: overrides.source_type ?? "reddit",
  score: overrides.score ?? 0,
  matched_keywords: overrides.matched_keywords ?? "",
  created_at: overrides.created_at ?? 0,
});

describe("SummaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.summary.maxItems = 2;
    mocks.config.summary.sourceWeights = {};
    mocks.config.summary.sourceQuotas = {};
  });

  it("caps items sent to the LLM and logs discarded items", async () => {
    const topic: Topic = {
      id: 1,
      name: "AI",
      keywords: "[]",
      sources: "{}",
      active: 1,
    };
    mocks.getTopicByName.mockReturnValue(topic);
    mocks.insertSummary.mockReturnValue(101);
    let passedItems: NewsItem[] = [];
    mocks.generateSummary.mockImplementation(async (items: NewsItem[]) => {
      passedItems = items;
      return "summary text";
    });

    const items: NewsItem[] = [
      buildItem({
        id: 1,
        title: "Low score",
        score: 10,
        url: "https://example.com/low",
        created_at: 100,
      }),
      buildItem({
        id: 2,
        title: "Top score",
        score: 50,
        url: "https://example.com/top",
        created_at: 200,
      }),
      buildItem({
        id: 3,
        title: "Mid score",
        score: 30,
        url: "https://example.com/mid",
        created_at: 150,
      }),
      buildItem({
        id: 4,
        title: "Second best",
        score: 40,
        url: "https://example.com/second",
        created_at: 180,
      }),
    ];

    mocks.fetchNewsForTopic.mockResolvedValue(items);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const summary = await summaryService.generateSummaryForTopic("AI");

    expect(mocks.generateSummary).toHaveBeenCalledTimes(1);
    expect(passedItems.map((item) => item.title)).toEqual([
      "Top score",
      "Second best",
    ]);

    expect(mocks.insertSummarySource).toHaveBeenCalledTimes(2);
    expect(summary.sources.map((item) => item.title)).toEqual([
      "Top score",
      "Second best",
    ]);

    const logMessages = logSpy.mock.calls.map((call) => String(call[0]));
    expect(
      logMessages.some((message) =>
        message.includes("Truncating news items from 4 to 2")
      )
    ).toBe(true);

    logSpy.mockRestore();
  });

  it("honors per-source quotas and weights when selecting items", async () => {
    mocks.config.summary.maxItems = 3;
    mocks.config.summary.sourceWeights = { reddit: 0.5, hackernews: 1 };
    mocks.config.summary.sourceQuotas = { reddit: 0.34, hackernews: 0.34 };

    const topic: Topic = {
      id: 1,
      name: "AI",
      keywords: "[]",
      sources: "{}",
      active: 1,
    };
    mocks.getTopicByName.mockReturnValue(topic);
    mocks.insertSummary.mockReturnValue(202);
    mocks.generateSummary.mockResolvedValue("summary text");

    const items: NewsItem[] = [
      buildItem({
        id: 1,
        title: "Reddit top",
        score: 100,
        source_type: "reddit",
        url: "https://example.com/reddit-top",
        created_at: 200,
      }),
      buildItem({
        id: 2,
        title: "Reddit second",
        score: 90,
        source_type: "reddit",
        url: "https://example.com/reddit-second",
        created_at: 190,
      }),
      buildItem({
        id: 3,
        title: "Reddit low",
        score: 10,
        source_type: "reddit",
        url: "https://example.com/reddit-low",
        created_at: 100,
      }),
      buildItem({
        id: 4,
        title: "HN top",
        score: 40,
        source_type: "hackernews",
        url: "https://example.com/hn-top",
        created_at: 180,
      }),
      buildItem({
        id: 5,
        title: "HN second",
        score: 30,
        source_type: "hackernews",
        url: "https://example.com/hn-second",
        created_at: 170,
      }),
      buildItem({
        id: 6,
        title: "HN low",
        score: 20,
        source_type: "hackernews",
        url: "https://example.com/hn-low",
        created_at: 160,
      }),
    ];

    mocks.fetchNewsForTopic.mockResolvedValue(items);

    const summary = await summaryService.generateSummaryForTopic("AI");

    expect(summary.sources.map((item) => item.title)).toEqual([
      "Reddit top",
      "HN top",
      "HN second",
    ]);
  });
});
