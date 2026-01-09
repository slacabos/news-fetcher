import { useEffect, useState } from "react";
import type { SummaryWithSources } from "../types";
import { summaryApi } from "../services/api";
import ReactMarkdown from "react-markdown";

type LatestSummaryProps = {
  refreshToken: number;
};

export const LatestSummary = ({ refreshToken }: LatestSummaryProps) => {
  const [summary, setSummary] = useState<SummaryWithSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLatestSummary();
  }, [refreshToken]);

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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 px-6 py-10 text-center text-slate-300">
        Loading latest summary...
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

  if (!summary) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 px-6 py-10 text-center text-slate-300">
        No summaries available yet
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300/80">
            Latest summary
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Latest AI News Summary
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
            {summary.topic}
          </span>
          <span>{new Date(summary.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div className="prose prose-invert mt-6 max-w-none text-slate-200">
        <ReactMarkdown>{summary.summary_markdown}</ReactMarkdown>
      </div>

      {summary.sources && summary.sources.length > 0 && (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Source Links ({summary.sources.length})
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Reddit highlights
            </span>
          </div>
          <ul className="mt-4 grid gap-3">
            {summary.sources.map((source, index) => (
              <li
                key={source.id || index}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-semibold text-sky-200 transition hover:text-sky-100"
                >
                  {source.title}
                </a>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    r/{source.subreddit}
                  </span>
                  <span className="text-emerald-300">↑ {source.score}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
