import { redditService } from "./reddit.service";
import { mockRedditService } from "./mock-reddit.service";
import { llmService } from "./llm/llm.factory";
import { db } from "../database";
import { config } from "../config";
import { Summary, SummaryWithSources } from "../models/types";

export class SummaryService {
  async generateSummaryForTopic(
    topicName: string
  ): Promise<SummaryWithSources> {
    console.log(
      `\n=== Starting summary generation for topic: ${topicName} ===`
    );

    // Use mock or real Reddit service based on configuration
    const service = config.useMockData ? mockRedditService : redditService;
    console.log(`Using ${config.useMockData ? "MOCK" : "REAL"} Reddit service`);
    console.log(
      `Using ${llmService.getProviderName()} LLM (${llmService.getModelName()})`
    );

    // Fetch news items from Reddit
    const newsItems = await service.fetchNewsByTopic(topicName);

    if (newsItems.length === 0) {
      console.log("No news items found, creating empty summary");
      const summaryText = `No new posts found for ${topicName} in the last 24 hours.`;
      const summaryId = db.insertSummary({
        topic: topicName,
        summary_markdown: summaryText,
        created_at: new Date().toISOString(),
      });

      return {
        id: summaryId,
        topic: topicName,
        summary_markdown: summaryText,
        created_at: new Date().toISOString(),
        sources: [],
      };
    }

    // Generate summary using LLM service
    const summaryMarkdown = await llmService.generateSummary(
      newsItems,
      topicName
    );

    // Save summary to database
    const summaryId = db.insertSummary({
      topic: topicName,
      summary_markdown: summaryMarkdown,
      created_at: new Date().toISOString(),
    });

    // Link news items to summary
    for (const item of newsItems) {
      if (item.id) {
        db.insertSummarySource(summaryId, item.id);
      }
    }

    console.log(`Summary created with ID: ${summaryId}`);
    console.log(`=== Summary generation complete ===\n`);

    return {
      id: summaryId,
      topic: topicName,
      summary_markdown: summaryMarkdown,
      created_at: new Date().toISOString(),
      sources: newsItems,
    };
  }

  getLatestSummaryWithSources(): SummaryWithSources | null {
    const summary = db.getLatestSummary();
    if (!summary || !summary.id) {
      return null;
    }

    const sources = db.getSourcesBySummaryId(summary.id);
    return {
      ...summary,
      sources,
    };
  }

  getSummariesWithSources(filters?: {
    date?: string;
    topic?: string;
  }): SummaryWithSources[] {
    const summaries = db.getSummaries(filters);
    return summaries.map((summary) => ({
      ...summary,
      sources: summary.id ? db.getSourcesBySummaryId(summary.id) : [],
    }));
  }

  getSummaryByIdWithSources(id: number): SummaryWithSources | null {
    const summary = db.getSummaryById(id);
    if (!summary || !summary.id) {
      return null;
    }

    const sources = db.getSourcesBySummaryId(summary.id);
    return {
      ...summary,
      sources,
    };
  }
}

export const summaryService = new SummaryService();
