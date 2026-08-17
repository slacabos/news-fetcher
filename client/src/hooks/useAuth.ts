import { useState, useEffect, useCallback } from "react";
import { authApi, type AuthUser } from "../services/api";

const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === "true";
const devAuthUser: AuthUser = {
  email: "local@news-fetcher.dev",
  name: "Local User",
  picture: "",
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (AUTH_DISABLED) {
      setUser(devAuthUser);
      setLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, []);

  const login = useCallback(async (credential: string) => {
    if (AUTH_DISABLED) {
      setUser(devAuthUser);
      return;
    }

    const data = await authApi.loginWithGoogle(credential);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    if (AUTH_DISABLED) {
      setUser(devAuthUser);
      return;
    }

    await authApi.logout();
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
