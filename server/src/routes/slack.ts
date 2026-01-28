import { Router, Request, Response } from "express";
import { slackService } from "../services/slack.service";
import { db } from "../database";
import { createLogger } from "../utils/logger";

const router = Router();
const log = createLogger("routes/slack");

// POST /api/slack/send/:id - Send a specific summary to Slack
router.post("/send/:id", async (req: Request, res: Response) => {
  try {
    const summaryId = parseInt(req.params.id, 10);

    if (isNaN(summaryId)) {
      res.status(400).json({ error: "Invalid summary ID" });
      return;
    }

    // Get summary with sources
    const summary = await db.getSummaryById(summaryId);
    if (!summary) {
      res.status(404).json({ error: "Summary not found" });
      return;
    }

    const sources = await db.getSourcesBySummaryId(summaryId);

    // Check if summary has sources (never post empty)
    if (sources.length === 0) {
      res.status(400).json({ error: "Cannot post empty summaries to Slack" });
      return;
    }

    // Post to Slack
    const result = await slackService.postSummary({
      ...summary,
      sources,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    log.error({ err: error }, "Error in /api/slack/send");
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// POST /api/slack/test - Test Slack webhook connection
router.post("/test", async (req: Request, res: Response) => {
  try {
    const result = await slackService.testConnection();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    log.error({ err: error }, "Error in /api/slack/test");
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
