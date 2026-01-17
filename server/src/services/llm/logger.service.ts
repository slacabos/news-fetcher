import fs from "fs";
import path from "path";
import { createLogger } from "../../utils/logger";

export interface LLMLogEntry {
  timestamp: string;
  provider: string;
  model: string;
  topic: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

export class LLMLogger {
  private logFilePath: string;
  private enabled: boolean;
  private appLog = createLogger("services/llm/logger");

  constructor(logPath: string, enabled: boolean = true) {
    this.logFilePath = logPath;
    this.enabled = enabled;

    // Ensure log directory exists
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create log file if it doesn't exist
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, "");
    }
  }

  /**
   * Log an LLM request
   */
  log(entry: LLMLogEntry): void {
    if (!this.enabled) {
      return;
    }

    const logLine = JSON.stringify(entry) + "\n";

    try {
      fs.appendFileSync(this.logFilePath, logLine, "utf8");
    } catch (error) {
      this.appLog.error({ err: error }, "Failed to write to LLM log file");
    }
  }

  /**
   * Get all log entries
   */
  getAllLogs(): LLMLogEntry[] {
    if (!fs.existsSync(this.logFilePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.logFilePath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      return lines.map((line) => JSON.parse(line));
    } catch (error) {
      this.appLog.error({ err: error }, "Failed to read LLM log file");
      return [];
    }
  }

  /**
   * Get log statistics
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalCost: number;
    totalTokens: number;
    averageLatency: number;
    byProvider: Record<string, { count: number; cost: number; tokens: number }>;
  } {
    const logs = this.getAllLogs();

    const stats: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      totalCost: number;
      totalTokens: number;
      averageLatency: number;
      byProvider: Record<string, { count: number; cost: number; tokens: number }>;
    } = {
      totalRequests: logs.length,
      successfulRequests: logs.filter((l) => l.success).length,
      failedRequests: logs.filter((l) => !l.success).length,
      totalCost: 0,
      totalTokens: 0,
      averageLatency: 0,
      byProvider: {},
    };

    if (logs.length === 0) {
      return stats;
    }

    let totalLatency = 0;

    for (const log of logs) {
      // Accumulate costs and tokens
      if (log.estimatedCost) {
        stats.totalCost += log.estimatedCost;
      }
      if (log.totalTokens) {
        stats.totalTokens += log.totalTokens;
      }
      totalLatency += log.latencyMs;

      // By provider stats
      if (!stats.byProvider[log.provider]) {
        stats.byProvider[log.provider] = { count: 0, cost: 0, tokens: 0 };
      }
      stats.byProvider[log.provider].count++;
      if (log.estimatedCost) {
        stats.byProvider[log.provider].cost += log.estimatedCost;
      }
      if (log.totalTokens) {
        stats.byProvider[log.provider].tokens += log.totalTokens;
      }
    }

    stats.averageLatency = totalLatency / logs.length;

    return stats;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    try {
      fs.writeFileSync(this.logFilePath, "");
    } catch (error) {
      this.appLog.error({ err: error }, "Failed to clear LLM log file");
    }
  }
}
