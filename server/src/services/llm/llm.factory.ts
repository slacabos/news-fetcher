import { config } from "../../config";
import { BaseLLMService } from "./base.llm.service";
import { OllamaLLMService } from "./ollama.llm.service";
import { OpenAILLMService } from "./openai.llm.service";
import { FallbackLLMService } from "./fallback.llm.service";
import { LLMLogger } from "./logger.service";
import { createLogger } from "../../utils/logger";

const log = createLogger("services/llm/factory");

function createProvider(provider: string, logger: LLMLogger): BaseLLMService {
  switch (provider) {
    case "openai":
      return new OpenAILLMService(logger);

    case "ollama":
    default:
      return new OllamaLLMService(logger);
  }
}

/**
 * Factory function to create the appropriate LLM service based on configuration.
 * If a fallback provider is configured, the primary is wrapped so that failures
 * are retried against the fallback.
 */
export function createLLMService(): BaseLLMService {
  const provider = config.llm.provider.toLowerCase();
  const fallbackProvider = config.llm.fallbackProvider.toLowerCase();

  // Initialize logger
  const logger = new LLMLogger(
    config.llm.logging.path,
    config.llm.logging.enabled
  );

  log.info({ provider }, "Initializing LLM provider");
  const primary = createProvider(provider, logger);

  if (!fallbackProvider || fallbackProvider === provider) {
    return primary;
  }

  try {
    const fallback = createProvider(fallbackProvider, logger);
    log.info(
      { fallbackProvider, model: fallback.getModelName() },
      "Initializing LLM fallback provider"
    );
    return new FallbackLLMService(primary, fallback);
  } catch (error) {
    log.error(
      { err: error, fallbackProvider },
      "Failed to initialize LLM fallback provider, continuing without it"
    );
    return primary;
  }
}

/**
 * Singleton instance of the LLM service
 * This is the main export that should be used throughout the application
 */
export const llmService = createLLMService();

/**
 * Export logger for stats endpoint
 */
export { LLMLogger } from "./logger.service";
