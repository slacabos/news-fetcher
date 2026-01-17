import { llmService } from "./llm/llm.factory";
import { db } from "../database";
import { NewsItem, SummaryWithSources } from "../models/types";
import { newsProviderFactory } from "./provider.factory";
import { slackService } from "./slack.service";
import { config } from "../config";

export class SummaryService {
  private selectItemsForSummary(items: NewsItem[]): {
    selected: NewsItem[];
    discarded: NewsItem[];
  } {
    const maxItems = config.summary.maxItems;
    const shouldCap = Number.isFinite(maxItems) && maxItems > 0;

    const sortByScore = (list: NewsItem[]): NewsItem[] =>
      [...list].sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        return b.created_at - a.created_at;
      });

    if (!shouldCap || items.length <= maxItems) {
      return { selected: sortByScore(items), discarded: [] };
    }

    const sourceWeights = config.summary.sourceWeights ?? {};
    const sourceQuotas = config.summary.sourceQuotas ?? {};

    type ScoredItem = {
      item: NewsItem;
      source: string;
      normalizedScore: number;
      weightedScore: number;
    };

    const itemsBySource = new Map<string, NewsItem[]>();
    for (const item of items) {
      const source = item.source_type || "unknown";
      const bucket = itemsBySource.get(source);
      if (bucket) {
        bucket.push(item);
      } else {
        itemsBySource.set(source, [item]);
      }
    }

    const scoredBySource = new Map<string, ScoredItem[]>();
    for (const [source, sourceItems] of itemsBySource.entries()) {
      const scores = sourceItems.map((item) => item.score);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const range = maxScore - minScore;
      const weight = Number.isFinite(sourceWeights[source])
        ? sourceWeights[source]
        : 1;

      const scoredItems = sourceItems.map((item) => {
        const normalizedScore = range === 0 ? 1 : (item.score - minScore) / range;
        return {
          item,
          source,
          normalizedScore,
          weightedScore: normalizedScore * weight,
        };
      });
      scoredBySource.set(source, scoredItems);
    }

    let quotaTotal = 0;
    for (const [source] of scoredBySource.entries()) {
      const quota = sourceQuotas[source];
      if (Number.isFinite(quota) && quota > 0) {
        quotaTotal += quota;
      }
    }

    let quotaScale = 1;
    if (quotaTotal > 1) {
      quotaScale = 1 / quotaTotal;
      console.log(
        `Summary source quotas sum to ${quotaTotal.toFixed(
          2
        )}; scaling down to fit within 1.0`
      );
    }

    const selected: ScoredItem[] = [];
    const selectedUrls = new Set<string>();

    for (const [source, scoredItems] of scoredBySource.entries()) {
      const quota = sourceQuotas[source];
      if (!Number.isFinite(quota) || quota <= 0) {
        continue;
      }

      const targetCount = Math.floor(quota * quotaScale * maxItems);
      if (targetCount <= 0) {
        continue;
      }

      const ranked = [...scoredItems].sort((a, b) => {
        const scoreDiff = b.normalizedScore - a.normalizedScore;
        if (scoreDiff !== 0) return scoreDiff;
        return b.item.created_at - a.item.created_at;
      });

      for (const scored of ranked) {
        if (selected.length >= maxItems) {
          break;
        }
        if (selected.length >= targetCount) {
          break;
        }
        if (!selectedUrls.has(scored.item.url)) {
          selected.push(scored);
          selectedUrls.add(scored.item.url);
        }
      }
    }

    const remainingSlots = maxItems - selected.length;
    if (remainingSlots > 0) {
      const remaining = Array.from(scoredBySource.values())
        .flat()
        .filter((scored) => !selectedUrls.has(scored.item.url))
        .sort((a, b) => {
          const weightDiff = b.weightedScore - a.weightedScore;
          if (weightDiff !== 0) return weightDiff;
          const scoreDiff = b.normalizedScore - a.normalizedScore;
          if (scoreDiff !== 0) return scoreDiff;
          return b.item.created_at - a.item.created_at;
        });

      for (const scored of remaining.slice(0, remainingSlots)) {
        selected.push(scored);
        selectedUrls.add(scored.item.url);
      }
    }

    const selectedItems = sortByScore(selected.map((scored) => scored.item));
    const discardedItems = items.filter(
      (item) => !selectedUrls.has(item.url)
    );

    return { selected: selectedItems, discarded: discardedItems };
  }

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
    const allNewsItems: NewsItem[] = [];
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

    const { selected: itemsForSummary, discarded: discardedItems } =
      this.selectItemsForSummary(uniqueNewsItems);
    const maxItems = config.summary.maxItems;
    const shouldCap = Number.isFinite(maxItems) && maxItems > 0;

    if (shouldCap && discardedItems.length > 0) {
      const previewLimit = 5;
      const previewTitles = discardedItems
        .slice(0, previewLimit)
        .map((item) => item.title)
        .join(" | ");
      const overflow = discardedItems.length - previewLimit;
      const previewSuffix = overflow > 0 ? ` (+${overflow} more)` : "";
      const previewText = previewTitles
        ? `: ${previewTitles}${previewSuffix}`
        : "";

      console.log(
        `Truncating news items from ${uniqueNewsItems.length} to ${itemsForSummary.length}. Discarded ${discardedItems.length} items${previewText}`
      );
    }

    // Generate summary using LLM service
    const summaryMarkdown = await llmService.generateSummary(
      itemsForSummary,
      topicName
    );

    // Save summary to database
    const summaryId = db.insertSummary({
      topic: topicName,
      summary_markdown: summaryMarkdown,
      created_at: new Date().toISOString(),
    });

    // Link news items to summary
    for (const item of itemsForSummary) {
      if (item.id) {
        db.insertSummarySource(summaryId, item.id);
      }
    }

    console.log(`Summary created with ID: ${summaryId}`);
    console.log(`=== Summary generation complete ===\n`);

    // Post to Slack if enabled and auto-post is on (only for non-empty summaries)
    if (
      config.slack.enabled &&
      config.slack.autoPost &&
      itemsForSummary.length > 0
    ) {
      try {
        const slackResult = await slackService.postSummary({
          id: summaryId,
          topic: topicName,
          summary_markdown: summaryMarkdown,
          created_at: new Date().toISOString(),
          sources: itemsForSummary,
        });

        if (slackResult.success) {
          console.log("✅ Summary posted to Slack successfully");
        } else {
          console.log(`⚠️ Failed to post to Slack: ${slackResult.error}`);
        }
      } catch (error) {
        console.error("❌ Error posting to Slack:", error);
        // Don't throw - summary generation succeeded
      }
    }

    return {
      id: summaryId,
      topic: topicName,
      summary_markdown: summaryMarkdown,
      created_at: new Date().toISOString(),
      sources: itemsForSummary,
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
