import { Router, Request, Response } from "express";
import { summaryService } from "../services/summary.service";

const router = Router();

// POST /api/fetch - Manually trigger news fetching and summarization
router.post("/", async (req: Request, res: Response) => {
  try {
    const { topic = "AI" } = req.body;

    console.log(`Manual fetch triggered for topic: ${topic}`);

    const summary = await summaryService.generateSummaryForTopic(topic);

    res.json({
      message: "Summary generated successfully",
      summary,
    });
  } catch (error) {
    console.error("Error during manual fetch:", error);
    res.status(500).json({
      error: "Failed to fetch and generate summary",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
