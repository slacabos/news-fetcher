import { useState, useEffect, useCallback } from "react";
import { authApi, type AuthUser } from "../services/api";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    const data = await authApi.loginWithGoogle(credential);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
