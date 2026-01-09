import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SummaryWithSources } from '../types';
import { summaryApi } from '../services/api';
import ReactMarkdown from 'react-markdown';

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
      setError('Failed to load summary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading summary...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  if (!summary) {
    return <div className="no-data">Summary not found</div>;
  }

  return (
    <div className="summary-detail">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="summary-header">
        <h1>{summary.topic} News Summary</h1>
        <div className="summary-meta">
          <span className="topic-badge">{summary.topic}</span>
          <span className="date">{new Date(summary.created_at).toLocaleString()}</span>
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
