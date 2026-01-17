import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { LLMLogger } from "../logger.service";

const createTempLogFile = (): { dir: string; file: string } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "llm-logger-"));
  const file = path.join(dir, "requests.log");
  return { dir, file };
};

describe("LLMLogger", () => {
  it("aggregates stats across log entries", () => {
    const { file } = createTempLogFile();
    const logger = new LLMLogger(file, true);

    logger.log({
      timestamp: new Date().toISOString(),
      provider: "openai",
      model: "gpt-test",
      topic: "AI",
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.002,
      latencyMs: 120,
      success: true,
    });

    logger.log({
      timestamp: new Date().toISOString(),
      provider: "ollama",
      model: "local-model",
      topic: "AI",
      latencyMs: 30,
      success: false,
    });

    const stats = logger.getStats();

    expect(stats.totalRequests).toBe(2);
    expect(stats.successfulRequests).toBe(1);
    expect(stats.failedRequests).toBe(1);
    expect(stats.totalCost).toBeCloseTo(0.002, 6);
    expect(stats.totalTokens).toBe(150);
    expect(stats.averageLatency).toBe(75);
    expect(stats.byProvider.openai).toEqual({
      count: 1,
      cost: 0.002,
      tokens: 150,
    });
    expect(stats.byProvider.ollama).toEqual({
      count: 1,
      cost: 0,
      tokens: 0,
    });
  });

  it("clears logs when requested", () => {
    const { file } = createTempLogFile();
    const logger = new LLMLogger(file, true);

    logger.log({
      timestamp: new Date().toISOString(),
      provider: "openai",
      model: "gpt-test",
      topic: "AI",
      latencyMs: 50,
      success: true,
    });

    expect(logger.getAllLogs()).toHaveLength(1);

    logger.clearLogs();

    expect(logger.getAllLogs()).toHaveLength(0);
  });
});
