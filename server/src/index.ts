import express from "express";
import cors from "cors";
import { config } from "./config";
import { schedulerService } from "./services/scheduler.service";
import summariesRouter from "./routes/summaries";
import topicsRouter from "./routes/topics";
import fetchRouter from "./routes/fetch";
import llmRouter from "./routes/llm";
import slackRouter from "./routes/slack";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Vite dev server
    credentials: true,
  })
);
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/summaries", summariesRouter);
app.use("/api/topics", topicsRouter);
app.use("/api/fetch", fetchRouter);
app.use("/api/llm", llmRouter);
app.use("/api/slack", slackRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "News Fetcher API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      summaries: "/api/summaries",
      latestSummary: "/api/summaries/latest",
      topics: "/api/topics",
      fetch: "/api/fetch",
      llmStats: "/api/llm/stats",
      llmLogs: "/api/llm/logs",
      llmProvider: "/api/llm/provider",
      slackSend: "/api/slack/send/:id",
      slackTest: "/api/slack/test",
    },
  });
});

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    void _next;
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🌐 CORS enabled for http://localhost:5173\n`);

  // Start scheduler
  schedulerService.start();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  schedulerService.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  schedulerService.stop();
  process.exit(0);
});
