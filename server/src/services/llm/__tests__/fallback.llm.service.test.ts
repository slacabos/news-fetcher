import { describe, expect, it, vi } from "vitest";
import { BaseLLMService } from "../base.llm.service";
import { FallbackLLMService } from "../fallback.llm.service";

const makeService = (
  provider: string,
  generateSummary: BaseLLMService["generateSummary"]
): BaseLLMService => ({
  generateSummary: vi.fn(generateSummary),
  checkHealth: vi.fn(async () => true),
  getProviderName: () => provider,
  getModelName: () => `${provider}-model`,
});

describe("FallbackLLMService", () => {
  it("returns the primary result when the primary succeeds", async () => {
    const primary = makeService("openai", async () => "primary summary");
    const fallback = makeService("ollama", async () => "fallback summary");
    const service = new FallbackLLMService(primary, fallback);

    await expect(service.generateSummary([], "AI")).resolves.toBe("primary summary");
    expect(fallback.generateSummary).not.toHaveBeenCalled();
    expect(service.getProviderName()).toBe("openai");
    expect(service.getModelName()).toBe("openai-model");
  });

  it("uses the fallback when the primary throws", async () => {
    const primary = makeService("openai", async () => {
      throw new Error("model unavailable");
    });
    const fallback = makeService("ollama", async () => "fallback summary");
    const service = new FallbackLLMService(primary, fallback);

    const options = { previousHeadlines: ["Old story"] };
    await expect(service.generateSummary([], "AI", options)).resolves.toBe(
      "fallback summary"
    );
    expect(primary.generateSummary).toHaveBeenCalledWith([], "AI", options);
    expect(fallback.generateSummary).toHaveBeenCalledWith([], "AI", options);
  });

  it("propagates the error when both providers fail", async () => {
    const primary = makeService("openai", async () => {
      throw new Error("primary down");
    });
    const fallback = makeService("ollama", async () => {
      throw new Error("fallback down");
    });
    const service = new FallbackLLMService(primary, fallback);

    await expect(service.generateSummary([], "AI")).rejects.toThrow("fallback down");
  });
});
