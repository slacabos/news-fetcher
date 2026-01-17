import { Router, Request, Response } from "express";
import { db } from "../database";
import { createLogger } from "../utils/logger";

const router = Router();
const log = createLogger("routes/topics");

// GET /api/topics - Get all active topics
router.get("/", async (req: Request, res: Response) => {
  try {
    const topics = db.getTopics();

    // Parse JSON strings back to arrays
    const formattedTopics = topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      keywords: JSON.parse(topic.keywords),
      sources: JSON.parse(topic.sources),
      active: topic.active,
    }));

    res.json(formattedTopics);
  } catch (error) {
    log.error({ err: error }, "Error fetching topics");
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

export default router;
