import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    useMockData: true,
    activeProviders: ["reddit", "hackernews"],
  },
}));

vi.mock("../../config", () => ({
  config: mocks.config,
}));

vi.mock("../reddit.service", () => ({
  RedditService: class {
    providerName = "reddit";
    kind = "real";
  },
}));

vi.mock("../mock-reddit.service", () => ({
  MockRedditService: class {
    providerName = "reddit";
    kind = "mock";
  },
}));

vi.mock("../providers/hackernews.service", () => ({
  HackerNewsService: class {
    providerName = "hackernews";
  },
}));

describe("newsProviderFactory", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.config.useMockData = true;
    mocks.config.activeProviders = ["reddit", "hackernews"];
  });

  it("uses the mock provider when useMockData is enabled", async () => {
    const { newsProviderFactory } = await import("../provider.factory");
    const redditProvider = newsProviderFactory.get("reddit");

    expect(redditProvider).toHaveProperty("kind", "mock");
  });

  it("uses the real provider when useMockData is disabled", async () => {
    mocks.config.useMockData = false;
    const { newsProviderFactory } = await import("../provider.factory");
    const redditProvider = newsProviderFactory.get("reddit");

    expect(redditProvider).toHaveProperty("kind", "real");
  });

  it("filters active providers that are not registered", async () => {
    mocks.config.useMockData = false;
    mocks.config.activeProviders = ["reddit", "unknown", "hackernews"];
    const { newsProviderFactory } = await import("../provider.factory");

    const providers = newsProviderFactory.getActiveProviders();
    const names = providers.map((provider) => provider.providerName);

    expect(names).toEqual(["reddit", "hackernews"]);
  });
});
