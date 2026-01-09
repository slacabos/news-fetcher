import { useState, useEffect } from "react";
import type { SummaryWithSources } from "../types";
import { summaryApi } from "../services/api";
import { useNavigate } from "react-router-dom";
import "./summary-shared.css";
import "./SummaryHistory.css";

export const SummaryHistory = () => {
  const [summaries, setSummaries] = useState<SummaryWithSources[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadSummaries();
  }, [dateFilter, topicFilter]);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: { date?: string; topic?: string } = {};
      if (dateFilter) filters.date = dateFilter;
      if (topicFilter) filters.topic = topicFilter;

      const data = await summaryApi.getAll(filters);
      setSummaries(data);
    } catch (err) {
      setError("Failed to load summaries");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummaryClick = (id: number | undefined) => {
    if (id) {
      navigate(`/summary/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="status-message status-message--loading" role="status">
        Loading archive...
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

  return (
    <section className="history-panel summary-panel">
      <header className="history-header">
        <div>
          <p className="eyebrow">Archive</p>
          <h2>Summary history</h2>
        </div>
        {(dateFilter || topicFilter) && (
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setDateFilter("");
              setTopicFilter("");
            }}
          >
            Clear filters
          </button>
        )}
      </header>

      <div className="filters-grid">
        <label className="filter-field" htmlFor="date-filter">
          <span>Date</span>
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>
        <label className="filter-field" htmlFor="topic-filter">
          <span>Topic</span>
          <input
            id="topic-filter"
            type="text"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            placeholder="Filter by topic..."
          />
        </label>
      </div>

      {summaries.length === 0 ? (
        <div className="status-message status-message--empty">
          No summaries found
        </div>
      ) : (
        <div className="history-grid">
          {summaries.map((summary) => (
            <article
              key={summary.id}
              className="history-card"
              onClick={() => handleSummaryClick(summary.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSummaryClick(summary.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="history-card__meta">
                <span className="topic-pill">{summary.topic}</span>
                <span className="meta-pill">
                  {new Date(summary.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="history-card__preview">
                {summary.summary_markdown.slice(0, 220)}...
              </p>
              <div className="history-card__footer">
                <span>{summary.sources?.length || 0} sources</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
