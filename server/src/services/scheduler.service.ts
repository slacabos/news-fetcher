import cron, { ScheduledTask } from "node-cron";
import { summaryService } from "./summary.service";
import { config } from "../config";

export class SchedulerService {
  private task: ScheduledTask | null = null;

  start() {
    console.log(
      `Scheduler initialized. Will run daily at 8 AM (${config.scheduler.cronTime})`
    );

    this.task = cron.schedule(config.scheduler.cronTime, async () => {
      console.log("\n=== Scheduled task started ===");
      console.log(`Time: ${new Date().toLocaleString()}`);

      try {
        // Generate summary for AI topic
        await summaryService.generateSummaryForTopic("AI");
        console.log("Scheduled summary generation completed successfully");
      } catch (error) {
        console.error("Error in scheduled task:", error);
      }

      console.log("=== Scheduled task completed ===\n");
    });

    console.log("Scheduler started successfully");
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log("Scheduler stopped");
    }
  }

  async runNow() {
    console.log("Running scheduled task immediately...");
    try {
      await summaryService.generateSummaryForTopic("AI");
      console.log("Manual scheduled task completed");
    } catch (error) {
      console.error("Error in manual scheduled task:", error);
      throw error;
    }
  }
}

export const schedulerService = new SchedulerService();
