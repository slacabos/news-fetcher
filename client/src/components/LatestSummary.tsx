import { useState, useEffect } from "react";
import type { SummaryWithSources } from "../types";
import { summaryApi } from "../services/api";
import ReactMarkdown from "react-markdown";
import "./summary-shared.css";
import "./LatestSummary.css";

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
    return (
      <div className="status-message status-message--loading" role="status">
        Loading the latest intelligence brief...
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-message status-message--error" role="alert">
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="status-message status-message--empty">
        No summaries available yet
      </div>
    );
  }

  const formattedDate = new Date(summary.created_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section className="latest-summary-card summary-panel">
      <header className="summary-headline">
        <p className="eyebrow">Latest dispatch</p>
        <h2>AI developments in focus</h2>
        <div className="summary-pill-group">
          <span className="topic-pill">{summary.topic}</span>
          <span className="meta-pill" aria-label="Generated at">
            {formattedDate}
          </span>
        </div>
      </header>

      <div className="summary-body markdown-surface">
        <div className="markdown-reset">
          <ReactMarkdown>{summary.summary_markdown}</ReactMarkdown>
        </div>
      </div>

      {summary.sources && summary.sources.length > 0 && (
        <div className="source-stack" aria-live="polite">
          <div className="source-stack__header">
            <h3>Source links</h3>
            <span>{summary.sources.length} signals</span>
          </div>
          <div className="source-grid">
            {summary.sources.map((source, index) => (
              <article key={source.id || index} className="source-card">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.title}
                </a>
                <div className="source-card__meta">
                  <span className="pill pill--subreddit">r/{source.subreddit}</span>
                  <span className="pill pill--score">↑ {source.score}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
