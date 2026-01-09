import { useState, useEffect } from 'react';
import { SummaryWithSources } from '../types';
import { summaryApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const SummaryHistory = () => {
  const [summaries, setSummaries] = useState<SummaryWithSources[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
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
      setError('Failed to load summaries');
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
    return <div className="loading">Loading summaries...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="summary-history">
      <h1>Summary History</h1>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor="date-filter">Date:</label>
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="topic-filter">Topic:</label>
          <input
            id="topic-filter"
            type="text"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            placeholder="Filter by topic..."
          />
        </div>
        {(dateFilter || topicFilter) && (
          <button
            className="clear-filters"
            onClick={() => {
              setDateFilter('');
              setTopicFilter('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="no-data">No summaries found</div>
      ) : (
        <div className="summaries-list">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              className="summary-card"
              onClick={() => handleSummaryClick(summary.id)}
            >
              <div className="card-header">
                <span className="topic-badge">{summary.topic}</span>
                <span className="date">{new Date(summary.created_at).toLocaleDateString()}</span>
              </div>
              <div className="card-preview">
                {summary.summary_markdown.slice(0, 200)}...
              </div>
              <div className="card-footer">
                <span className="sources-count">
                  {summary.sources?.length || 0} sources
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
