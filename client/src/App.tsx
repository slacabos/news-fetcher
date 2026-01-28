import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Link,
} from "react-router-dom";
import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { LatestSummary } from "./components/LatestSummary";
import { SummaryHistory } from "./components/SummaryHistory";
import { SummaryDetail } from "./components/SummaryDetail";
import { ManualFetch } from "./components/ManualFetch";
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./hooks/useAuth";
import "./App.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function AuthenticatedApp() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, loading, login, logout } = useAuth();

  const handleFetchComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={login} />;
  }

  return (
    <Router>
      <div className="app-shell">
        <header className="site-header">
          <div className="brand-cluster">
            <Link to="/" className="brand-mark" aria-label="News Fetcher home">
              <img src="/logo.svg" alt="News Fetcher logo" width={64} height={64} />
            </Link>
            <div className="brand-copy">
              <p className="eyebrow">News Fetcher</p>
              <h1>Daily AI intelligence briefings</h1>
            </div>
          </div>
          <div className="header-right">
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
            <button className="sign-out-btn" onClick={logout} title={`Sign out ${user.name}`}>
              {user.picture && (
                <img
                  src={user.picture}
                  alt=""
                  aria-hidden="true"
                  className="user-avatar"
                  width={24}
                  height={24}
                  referrerPolicy="no-referrer"
                />
              )}
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="content-region">
          <Routes>
            <Route
              path="/"
              element={
                <div className="home-grid">
                  <LatestSummary refreshTrigger={refreshTrigger} />
                  <ManualFetch onFetchComplete={handleFetchComplete} />
                </div>
              }
            />
            <Route path="/history" element={<SummaryHistory />} />
            <Route path="/summary/:id" element={<SummaryDetail />} />
          </Routes>
        </main>

        <footer className="site-footer">
          <p>Latest news syntetised by an LLM.</p>
          <p>Powered by Ollama, ready for OpenAI.</p>
        </footer>
      </div>
    </Router>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthenticatedApp />
    </GoogleOAuthProvider>
  );
}

export default App;
