import { useState } from "react";
import { fetchApi } from "../services/api";
import "./ManualFetch.css";

export const ManualFetch = () => {
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

      // Reload the page after a short delay to show the new summary
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
    <section className="manual-fetch-card">
      <header>
        <p className="eyebrow">Need a fresh brief?</p>
        <h3>Manual fetch</h3>
      </header>
      <p className="manual-fetch__copy">
        Kick off a new Reddit scrape and LLM summary generation instantly. Useful
        when you want to compare today&apos;s headlines with emerging chatter.
      </p>

      <button
        className="primary-button"
        onClick={handleFetch}
        disabled={loading}
      >
        {loading ? "Fetching..." : "Fetch news now"}
      </button>

      <div className="manual-fetch__status" aria-live="polite">
        {message && <p className="status-text status-text--success">{message}</p>}
        {error && <p className="status-text status-text--error">{error}</p>}
      </div>
    </section>
  );
};
