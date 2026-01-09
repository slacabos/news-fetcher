import { useState, useEffect } from "react";
import type { SummaryWithSources } from "../types";
import { summaryApi } from "../services/api";
import ReactMarkdown from "react-markdown";

export const LatestSummary = () => {
  const [summary, setSummary] = useState<SummaryWithSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLatestSummary();
  }, []);

  const loadLatestSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await summaryApi.getLatest();
      setSummary(data);
    } catch (err) {
      setError("Failed to load latest summary");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading latest summary...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!summary) {
    return <div className="no-data">No summaries available yet</div>;
  }

  return (
    <div className="latest-summary">
      <div className="summary-header">
        <h1>Latest AI News Summary</h1>
        <div className="summary-meta">
          <span className="topic-badge">{summary.topic}</span>
          <span className="date">
            {new Date(summary.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="summary-content">
        <ReactMarkdown>{summary.summary_markdown}</ReactMarkdown>
      </div>

      {summary.sources && summary.sources.length > 0 && (
        <div className="sources-section">
          <h2>Source Links ({summary.sources.length})</h2>
          <ul className="sources-list">
            {summary.sources.map((source, index) => (
              <li key={source.id || index} className="source-item">
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
                <div className="source-meta">
                  <span className="subreddit">r/{source.subreddit}</span>
                  <span className="score">↑ {source.score}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
