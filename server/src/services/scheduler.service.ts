import cron, { ScheduledTask } from "node-cron";
import { summaryService } from "./summary.service";
import { slackService } from "./slack.service";
import { config } from "../config";
import { createLogger } from "../utils/logger";

const log = createLogger("services/scheduler");

export class SchedulerService {
  private task: ScheduledTask | null = null;

  start() {
    log.info(
      { cronTime: config.scheduler.cronTime },
      "Scheduler initialized"
    );

    this.task = cron.schedule(config.scheduler.cronTime, async () => {
      log.info("Scheduled task started");
      log.debug({ time: new Date().toLocaleString() }, "Task time");

      try {
        // Generate summary for AI topic
        const summary = await summaryService.generateSummaryForTopic("AI");
        log.info("Scheduled summary generation completed");

        // Post to Slack
        const slackResult = await slackService.postSummary(summary);
        if (slackResult.success) {
          log.info("Scheduled Slack post completed");
        } else {
          log.warn({ error: slackResult.error }, "Slack post failed");
        }
      } catch (error) {
        log.error({ err: error }, "Error in scheduled task");
      }

      log.info("Scheduled task completed");
    });

    log.info("Scheduler started");
  }

  stop() {
    if (this.task) {
      this.task.stop();
      log.info("Scheduler stopped");
    }
  }

  async runNow() {
    log.info("Running scheduled task immediately");
    try {
      const summary = await summaryService.generateSummaryForTopic("AI");
      log.info("Manual summary generation completed");

      const slackResult = await slackService.postSummary(summary);
      if (slackResult.success) {
        log.info("Manual Slack post completed");
      } else {
        log.warn({ error: slackResult.error }, "Slack post failed");
      }
    } catch (error) {
      log.error({ err: error }, "Error in manual scheduled task");
      throw error;
    }
  }
}

export const schedulerService = new SchedulerService();
