import { useEffect, useState } from "react";
import type { SummaryWithSources } from "../types";
import { summaryApi } from "../services/api";
import { Link } from "react-router-dom";

export const SummaryHistory = () => {
  const [summaries, setSummaries] = useState<SummaryWithSources[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");

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

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 px-6 py-10 text-center text-slate-300">
        Loading summaries...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Archive
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Summary History
          </h1>
        </div>
        <div className="text-sm text-slate-400">
          {summaries.length} summaries
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <label
            htmlFor="date-filter"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
          >
            Date
          </label>
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="topic-filter"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
          >
            Topic
          </label>
          <input
            id="topic-filter"
            type="text"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            placeholder="Filter by topic..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        {(dateFilter || topicFilter) && (
          <button
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-sky-500 hover:text-white"
            onClick={() => {
              setDateFilter("");
              setTopicFilter("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-10 text-center text-slate-400">
          No summaries found
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {summaries.map((summary) => (
            <Link
              key={summary.id}
              to={`/summary/${summary.id}`}
              className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition hover:-translate-y-0.5 hover:border-sky-500/50 hover:bg-slate-900/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
                  {summary.topic}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(summary.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-4 text-sm text-slate-300">
                {summary.summary_markdown.slice(0, 200)}...
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{summary.sources?.length || 0} sources</span>
                <span className="text-sky-300 opacity-0 transition group-hover:opacity-100">
                  View summary →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
