import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthSession, getStoredUser, loginApi, logoutApi, meApi, setAuthSession } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const profile = await meApi();
        if (!cancelled) {
          setUser(profile);
          setAuthSession(localStorage.getItem("lia_auth_token") || "", profile);
        }
      } catch {
        clearAuthSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    if (localStorage.getItem("lia_auth_token")) {
      restore();
    } else {
      setReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      async login(email, password) {
        const response = await loginApi({ email, password });
        setAuthSession(response.access_token, response.user);
        setUser(response.user);
        return response.user;
      },
      async logout() {
        try {
          await logoutApi();
        } catch {
          // Ignore logout transport failures and still clear the local session.
        }
        clearAuthSession();
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
