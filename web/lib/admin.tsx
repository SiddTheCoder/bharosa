"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { isAdminMockEnabled, MOCK_ADMIN_TOKEN, MOCK_ADMIN_USER } from "@/lib/admin-mock";

/**
 * Admin auth — completely separate from the merchant (Firebase) auth in
 * `lib/auth.tsx`. The admin signs in with the single operator credential
 * (email + password) against the backend `/admin/login`, receives a signed
 * admin JWT, and that token is kept in localStorage under its own key so it can
 * never collide with the merchant's Firebase ID token.
 */

const ADMIN_TOKEN_KEY = "bharosa-admin-token";

export type AdminUser = { email: string };

type AdminContextValue = {
  admin: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // On mount, restore any persisted admin token and validate it against the API.
  useEffect(() => {
    const existing = readToken();
    if (!existing) {
      if (isAdminMockEnabled() && pathname?.startsWith("/admin")) {
        window.queueMicrotask(() => {
          window.localStorage.setItem(ADMIN_TOKEN_KEY, MOCK_ADMIN_TOKEN);
          setToken(MOCK_ADMIN_TOKEN);
          setAdmin(MOCK_ADMIN_USER);
          setLoading(false);
        });
        return;
      }
      window.queueMicrotask(() => setLoading(false));
      return;
    }
    if (isAdminMockEnabled() && existing === MOCK_ADMIN_TOKEN) {
      window.queueMicrotask(() => {
        setToken(existing);
        setAdmin(MOCK_ADMIN_USER);
        setLoading(false);
      });
      return;
    }
    window.queueMicrotask(() => setToken(existing));
    apiGet<{ admin: AdminUser }>("/admin/me", existing)
      .then((res) => setAdmin(res.admin))
      .catch(() => {
        if (isAdminMockEnabled()) {
          window.localStorage.setItem(ADMIN_TOKEN_KEY, MOCK_ADMIN_TOKEN);
          setToken(MOCK_ADMIN_TOKEN);
          setAdmin(MOCK_ADMIN_USER);
          return;
        }
        // Stale/invalid token — clear it silently.
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken(null);
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, [pathname]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiPost<{ token: string; admin: AdminUser }>("/admin/login", { email, password });
      window.localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
      setToken(res.token);
      setAdmin(res.admin);
    } catch (error) {
      if (!isAdminMockEnabled()) throw error;
      window.localStorage.setItem(ADMIN_TOKEN_KEY, MOCK_ADMIN_TOKEN);
      setToken(MOCK_ADMIN_TOKEN);
      setAdmin({ email: email.trim().toLowerCase() || MOCK_ADMIN_USER.email });
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setAdmin(null);
    router.replace("/login");
  }, [router]);

  // Guard /admin/* routes client-side: bounce to the login page if unauthenticated.
  useEffect(() => {
    if (loading) return;
    if (!token && pathname?.startsWith("/admin")) router.replace("/login");
  }, [loading, token, pathname, router]);

  const value = useMemo<AdminContextValue>(
    () => ({ admin, token, loading, login, logout }),
    [admin, token, loading, login, logout]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used within AdminProvider");
  return value;
}
