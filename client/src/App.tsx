import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { LatestSummary } from "./components/LatestSummary";
import { SummaryHistory } from "./components/SummaryHistory";
import { SummaryDetail } from "./components/SummaryDetail";
import { ManualFetch } from "./components/ManualFetch";
import { useState } from "react";

function App() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <nav className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-xl">
                📰
              </span>
              <span className="tracking-tight">News Fetcher</span>
            </Link>
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link
                to="/"
                className="rounded-full px-4 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Latest
              </Link>
              <Link
                to="/history"
                className="rounded-full px-4 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                History
              </Link>
            </div>
          </div>
        </nav>

        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-6">
                  <LatestSummary refreshToken={refreshToken} />
                  <ManualFetch
                    onFetchComplete={() => setRefreshToken((prev) => prev + 1)}
                  />
                </div>
              }
            />
            <Route path="/history" element={<SummaryHistory />} />
            <Route path="/summary/:id" element={<SummaryDetail />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800 bg-slate-950/90 py-8">
          <div className="mx-auto max-w-6xl px-6 text-sm text-slate-400">
            News Fetcher - Powered by Ollama & Reddit
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
