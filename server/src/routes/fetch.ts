import { Router, Request, Response } from "express";
import { summaryService } from "../services/summary.service";
import { createLogger } from "../utils/logger";

const router = Router();
const log = createLogger("routes/fetch");

// POST /api/fetch - Manually trigger news fetching and summarization
router.post("/", async (req: Request, res: Response) => {
  try {
    const { topic = "AI" } = req.body;

    log.info({ topic }, "Manual fetch triggered");

    const summary = await summaryService.generateSummaryForTopic(topic);

    res.json({
      message: "Summary generated successfully",
      summary,
    });
  } catch (error) {
    log.error({ err: error }, "Error during manual fetch");
    res.status(500).json({
      error: "Failed to fetch and generate summary",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
