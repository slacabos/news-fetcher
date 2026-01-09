import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { LatestSummary } from "./components/LatestSummary";
import { SummaryHistory } from "./components/SummaryHistory";
import { SummaryDetail } from "./components/SummaryDetail";
import { ManualFetch } from "./components/ManualFetch";
import "./App.css";

function App() {
  console.log("App component rendering...");

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              📰 News Fetcher
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">
                Latest
              </Link>
              <Link to="/history" className="nav-link">
                History
              </Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <div>
                  <LatestSummary />
                  <ManualFetch />
                </div>
              }
            />
            <Route path="/history" element={<SummaryHistory />} />
            <Route path="/summary/:id" element={<SummaryDetail />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>News Fetcher - Powered by Ollama & Reddit</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
