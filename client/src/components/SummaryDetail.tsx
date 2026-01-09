import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { SummaryWithSources } from "../types";
import { summaryApi } from "../services/api";
import ReactMarkdown from "react-markdown";
import "./summary-shared.css";
import "./SummaryDetail.css";

export const SummaryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryWithSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSummary(parseInt(id, 10));
    }
  }, [id]);

  const loadSummary = async (summaryId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await summaryApi.getById(summaryId);
      setSummary(data);
    } catch (err) {
      setError("Failed to load summary");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="status-message status-message--loading" role="status">
        Loading summary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-message status-message--error" role="alert">
        {error}
        <button
          type="button"
          className="ghost-button"
          onClick={() => navigate("/")}
        >
          Return home
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="status-message status-message--empty">
        Summary not found
      </div>
    );
  }

  const formattedDate = new Date(summary.created_at).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <section className="summary-detail-panel summary-panel">
      <div className="detail-toolbar">
        <button
          type="button"
          className="ghost-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <header className="summary-detail__header">
        <p className="eyebrow">Deep dive</p>
        <h2>{summary.topic} news summary</h2>
        <div className="summary-pill-group">
          <span className="topic-pill">{summary.topic}</span>
          <span className="meta-pill">{formattedDate}</span>
        </div>
      </header>

      <div className="summary-body markdown-surface">
        <div className="markdown-reset">
          <ReactMarkdown>{summary.summary_markdown}</ReactMarkdown>
        </div>
      </div>

      {summary.sources && summary.sources.length > 0 && (
        <div className="source-stack">
          <div className="source-stack__header">
            <h3>Source links</h3>
            <span>{summary.sources.length} references</span>
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
