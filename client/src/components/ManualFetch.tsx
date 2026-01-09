import { useState } from "react";
import { fetchApi } from "../services/api";

type ManualFetchProps = {
  onFetchComplete?: () => void;
};

export const ManualFetch = ({ onFetchComplete }: ManualFetchProps) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFetch = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("Fetching news and generating summary...");

      const result = await fetchApi.trigger("AI");

      setMessage(
        `Success! Generated summary with ${
          result.summary.sources?.length || 0
        } sources.`
      );

      onFetchComplete?.();
    } catch (err) {
      setError(
        "Failed to fetch and generate summary. Make sure the server is running."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-soft">
      <h2 className="text-2xl font-semibold text-white">Manual Fetch</h2>
      <p className="mt-2 text-sm text-slate-400">
        Trigger an immediate news fetch and summary generation for AI topics.
      </p>

      <button
        className="mt-6 inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={handleFetch}
        disabled={loading}
      >
        {loading ? "Fetching..." : "Fetch News Now"}
      </button>

      {message && (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
};
