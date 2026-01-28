import dotenv from "dotenv";
import rawModelPricing from "./model-pricing.json";
import topicsConfig from "./topics.config.json";
import { assertModelPricingMap } from "../utils/schema-guards";

dotenv.config({ path: "../.env" });

const modelPricing = assertModelPricingMap(rawModelPricing);

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNumberMap = (value: string | undefined): Record<string, number> => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const result: Record<string, number> = {};
    for (const [key, rawValue] of Object.entries(parsed)) {
      const num =
        typeof rawValue === "number"
          ? rawValue
          : Number.parseFloat(String(rawValue));
      if (Number.isFinite(num)) {
        result[key] = num;
      }
    }
    return result;
  } catch {
    return {};
  }
};

const defaultLogLevel =
  process.env.NODE_ENV === "development" ? "debug" : "info";
const logLevel = process.env.LOG_LEVEL || defaultLogLevel;

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  useMockData: process.env.USE_MOCK_DATA === "true",
  activeProviders: process.env.ACTIVE_NEWS_PROVIDERS?.split(",") || ["reddit"],
  logging: {
    level: logLevel,
  },

  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || "",
    clientSecret: process.env.REDDIT_CLIENT_SECRET || "",
    userAgent: process.env.REDDIT_USER_AGENT || "news-fetcher-bot/1.0.0",
  },

  // LLM Configuration - supports multiple providers
  llm: {
    provider: process.env.LLM_PROVIDER || "ollama", // 'ollama' | 'openai'

    ollama: {
      apiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "gpt-oss:20b",
    },

    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
    },

    pricing: modelPricing,

    logging: {
      enabled: process.env.LLM_LOGGING_ENABLED !== "false", // true by default
      path: process.env.LLM_LOG_PATH || "./llm-requests.log",
    },
  },

  // Legacy ollama config for backward compatibility
  ollama: {
    apiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "gpt-oss:20b",
  },

  database: {
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  },

  topics: topicsConfig,

  summary: {
    maxItems: parsePositiveInt(process.env.SUMMARY_MAX_ITEMS, 40),
    sourceWeights: parseNumberMap(process.env.SUMMARY_SOURCE_WEIGHTS),
    sourceQuotas: parseNumberMap(process.env.SUMMARY_SOURCE_QUOTAS),
  },

  scheduler: {
    cronTime: "0 8 * * *", // 8 AM daily
  },

  slack: {
    enabled: process.env.SLACK_ENABLED === "true",
    botToken: process.env.SLACK_BOT_TOKEN || "",
    channelId: process.env.SLACK_CHANNEL_ID || "general",
    autoPost: process.env.SLACK_AUTO_POST === "true",
  },
};
