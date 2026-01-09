import dotenv from "dotenv";
import rawModelPricing from "./model-pricing.json";
import topicsConfig from "./topics.config.json";
import { assertModelPricingMap } from "../utils/schema-guards";

dotenv.config({ path: "../.env" });

const modelPricing = assertModelPricingMap(rawModelPricing);

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  useMockData: process.env.USE_MOCK_DATA === "true",
  activeProviders: process.env.ACTIVE_NEWS_PROVIDERS?.split(",") || ["reddit"],

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
    path: process.env.DATABASE_PATH || "./news.sqlite",
  },

  topics: topicsConfig,

  scheduler: {
    cronTime: "0 8 * * *", // 8 AM daily
  },
};
