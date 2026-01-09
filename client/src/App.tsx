import { BrowserRouter as Router, Routes, Route, NavLink, Link } from "react-router-dom";
import { LatestSummary } from "./components/LatestSummary";
import { SummaryHistory } from "./components/SummaryHistory";
import { SummaryDetail } from "./components/SummaryDetail";
import { ManualFetch } from "./components/ManualFetch";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-shell">
        <header className="site-header">
          <div className="brand-cluster">
            <Link to="/" className="brand-mark" aria-label="News Fetcher home">
              🗞
            </Link>
            <div className="brand-copy">
              <p className="eyebrow">News Fetcher</p>
              <h1>Daily AI intelligence briefings</h1>
            </div>
          </div>
          <nav className="primary-nav" aria-label="Primary">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "nav-link is-active" : "nav-link"
              }
            >
              Latest
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                isActive ? "nav-link is-active" : "nav-link"
              }
            >
              History
            </NavLink>
          </nav>
        </header>

        <main className="content-region">
          <Routes>
            <Route
              path="/"
              element={
                <div className="home-grid">
                  <LatestSummary />
                  <ManualFetch />
                </div>
              }
            />
            <Route path="/history" element={<SummaryHistory />} />
            <Route path="/summary/:id" element={<SummaryDetail />} />
          </Routes>
        </main>

        <footer className="site-footer">
          <p>⚡ Curated Reddit signals meets LLM synthesis.</p>
          <p>Powered by Ollama, ready for OpenAI.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
