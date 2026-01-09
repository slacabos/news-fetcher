import { useState } from "react";
import { fetchApi } from "../services/api";

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
    <div className="manual-fetch">
      <h2>Manual Fetch</h2>
      <p>
        Trigger an immediate news fetch and summary generation for AI topics.
      </p>

      <button className="fetch-button" onClick={handleFetch} disabled={loading}>
        {loading ? "Fetching..." : "Fetch News Now"}
      </button>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};
