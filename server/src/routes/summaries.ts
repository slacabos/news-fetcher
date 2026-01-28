import { Router, Request, Response } from "express";
import { summaryService } from "../services/summary.service";
import { createLogger } from "../utils/logger";

const router = Router();
const log = createLogger("routes/summaries");

// GET /api/summaries/latest - Get the most recent summary
router.get("/latest", async (req: Request, res: Response) => {
  try {
    const summary = await summaryService.getLatestSummaryWithSources();

    if (!summary) {
      return res.status(404).json({ error: "No summaries found" });
    }

    res.json(summary);
  } catch (error) {
    log.error({ err: error }, "Error fetching latest summary");
    res.status(500).json({ error: "Failed to fetch latest summary" });
  }
});

// GET /api/summaries/:id - Get a specific summary by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid summary ID" });
    }

    const summary = await summaryService.getSummaryByIdWithSources(id);

    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    res.json(summary);
  } catch (error) {
    log.error({ err: error }, "Error fetching summary");
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// GET /api/summaries - Get summaries with optional filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { date, topic } = req.query;

    const filters: { date?: string; topic?: string } = {};

    if (date && typeof date === "string") {
      filters.date = date;
    }

    if (topic && typeof topic === "string") {
      filters.topic = topic;
    }

    const summaries = await summaryService.getSummariesWithSources(filters);
    res.json(summaries);
  } catch (error) {
    log.error({ err: error }, "Error fetching summaries");
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});

export default router;
