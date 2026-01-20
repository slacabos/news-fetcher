import { useState, useEffect } from "react";
import type { SummaryWithSources } from "../types";
import { summaryApi } from "../services/api";
import ReactMarkdown from "react-markdown";
import slackIcon from "../assets/slack_icon.svg";
import { useSlackPost } from "../hooks/useSlackPost";
import "./summary-shared.css";
import "./LatestSummary.css";

interface LatestSummaryProps {
  refreshTrigger?: number;
}

export const LatestSummary = ({ refreshTrigger }: LatestSummaryProps) => {
  const [summary, setSummary] = useState<SummaryWithSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { slackPosting, slackMessage, slackError, postToSlack } =
    useSlackPost();

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

  useEffect(() => {
    loadLatestSummary();
  }, [refreshTrigger]);

  const handleSlackPost = () => {
    if (summary?.id) {
      postToSlack(summary.id);
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
      {slackMessage && (
        <div className="status-message status-message--success" role="status">
          {slackMessage}
        </div>
      )}
      {slackError && (
        <div className="status-message status-message--error" role="alert">
          {slackError}
        </div>
      )}

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
        {summary.sources && summary.sources.length > 0 && (
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <button
              type="button"
              className="ghost-button"
              onClick={handleSlackPost}
              disabled={slackPosting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <img
                src={slackIcon}
                alt=""
                style={{ width: "1rem", height: "1rem" }}
              />
              {slackPosting ? "Posting..." : "Share to Slack"}
            </button>
          </div>
        )}
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
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
                <div className="source-card__meta">
                  <span className="pill pill--source">
                    {source.source_type === "reddit"
                      ? `r/${source.source}`
                      : source.source}
                  </span>
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
