import { Router, Request, Response } from "express";
import { LLMLogger } from "../services/llm/logger.service";
import { config } from "../config";
import { createLogger } from "../utils/logger";

const router = Router();
const log = createLogger("routes/llm");

// Initialize logger to read stats
const logger = new LLMLogger(
  config.llm.logging.path,
  config.llm.logging.enabled
);

// GET /api/llm/stats - Get LLM usage statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = logger.getStats();
    res.json(stats);
  } catch (error) {
    log.error({ err: error }, "Error fetching LLM stats");
    res.status(500).json({ error: "Failed to fetch LLM statistics" });
  }
});

// GET /api/llm/logs - Get all LLM request logs
router.get("/logs", async (req: Request, res: Response) => {
  try {
    const limitParam = req.query.limit;
    const parsedLimit =
      typeof limitParam === "string" ? Number.parseInt(limitParam, 10) : NaN;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 100;
    const logs = logger.getAllLogs().slice(-limit); // Get last N logs
    res.json({ logs, count: logs.length });
  } catch (error) {
    log.error({ err: error }, "Error fetching LLM logs");
    res.status(500).json({ error: "Failed to fetch LLM logs" });
  }
});

// GET /api/llm/provider - Get current LLM provider info
router.get("/provider", async (req: Request, res: Response) => {
  try {
    res.json({
      provider: config.llm.provider,
      model:
        config.llm.provider === "openai"
          ? config.llm.openai.model
          : config.llm.ollama.model,
      loggingEnabled: config.llm.logging.enabled,
    });
  } catch (error) {
    log.error({ err: error }, "Error fetching LLM provider info");
    res.status(500).json({ error: "Failed to fetch provider information" });
  }
});

export default router;
