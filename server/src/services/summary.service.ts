import { llmService } from "./llm/llm.factory";
import { db } from "../database";
import { NewsItem, SummaryWithSources, Topic } from "../models/types";
import { newsProviderFactory } from "./provider.factory";

export class SummaryService {
  async generateSummaryForTopic(
    topicName: string
  ): Promise<SummaryWithSources> {
    console.log(
      `\n=== Starting summary generation for topic: ${topicName} ===`
    );

    const topic = db.getTopicByName(topicName);
    if (!topic) {
      throw new Error(`Topic ${topicName} not found`);
    }

    const providers = newsProviderFactory.getActiveProviders();
    console.log(
      `Using providers: ${providers.map((p) => p.providerName).join(", ")}`
    );
    console.log(
      `Using ${llmService.getProviderName()} LLM (${llmService.getModelName()})`
    );

    // Fetch news items from all active providers
    let allNewsItems: NewsItem[] = [];
    for (const provider of providers) {
      try {
        const items = await provider.fetchNewsForTopic(topic);
        allNewsItems.push(...items);
      } catch (error) {
        console.error(
          `Error fetching news from ${provider.providerName}:`,
          error
        );
      }
    }

    // Deduplicate items by URL
    const uniqueNewsItems = Array.from(
      new Map(allNewsItems.map((item) => [item.url, item])).values()
    );

    if (uniqueNewsItems.length === 0) {
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
      uniqueNewsItems,
      topicName
    );

    // Save summary to database
    const summaryId = db.insertSummary({
      topic: topicName,
      summary_markdown: summaryMarkdown,
      created_at: new Date().toISOString(),
    });

    // Link news items to summary
    for (const item of uniqueNewsItems) {
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
      sources: uniqueNewsItems,
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
