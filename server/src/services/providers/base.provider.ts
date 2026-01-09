import { NewsItem, Topic } from "../../models/types";

export interface NewsProvider {
  providerName: string;
  fetchNewsForTopic(topic: Topic): Promise<NewsItem[]>;
}
