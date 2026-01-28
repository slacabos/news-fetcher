import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import "./LoginPage.css";

interface LoginPageProps {
  onLoginSuccess: (credential: string) => Promise<void>;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.svg" alt="News Fetcher logo" className="login-logo" width={72} height={72} />
        <h1>News Fetcher</h1>
        <p>Sign in to access your AI intelligence briefings.</p>

        {error && <p className="login-error" role="alert">{error}</p>}

        <div className="login-button-wrapper">
          {loggingIn ? (
            <p>Signing in…</p>
          ) : (
            <GoogleLogin
              onSuccess={async (response) => {
                if (!response.credential) return;
                setError(null);
                setLoggingIn(true);
                try {
                  await onLoginSuccess(response.credential);
                } catch (err: unknown) {
                  const status =
                    err && typeof err === "object" && "response" in err
                      ? (err as { response?: { status?: number } }).response?.status
                      : undefined;
                  setError(
                    status === 403
                      ? "Email not authorized. Contact your administrator."
                      : "Sign-in failed. Check your connection and try again."
                  );
                  setLoggingIn(false);
                }
              }}
              onError={() => {
                setError("Google sign-in failed. Please try again.");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
