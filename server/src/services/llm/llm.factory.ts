import { config } from "../../config";
import { BaseLLMService } from "./base.llm.service";
import { OllamaLLMService } from "./ollama.llm.service";
import { OpenAILLMService } from "./openai.llm.service";
import { LLMLogger } from "./logger.service";

/**
 * Factory function to create the appropriate LLM service based on configuration
 */
export function createLLMService(): BaseLLMService {
  const provider = config.llm.provider.toLowerCase();

  // Initialize logger
  const logger = new LLMLogger(
    config.llm.logging.path,
    config.llm.logging.enabled
  );

  console.log(`[LLM Factory] Initializing ${provider} provider...`);

  switch (provider) {
    case "openai":
      return new OpenAILLMService(logger);

    case "ollama":
    default:
      return new OllamaLLMService(logger);
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
