import { Router, Request, Response } from "express";
import { db } from "../database";

const router = Router();

// GET /api/topics - Get all active topics
router.get("/", async (req: Request, res: Response) => {
  try {
    const topics = db.getTopics();

    // Parse JSON strings back to arrays
    const formattedTopics = topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      keywords: JSON.parse(topic.keywords),
      subreddits: JSON.parse(topic.subreddits),
      active: topic.active,
    }));

    res.json(formattedTopics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

export default router;
