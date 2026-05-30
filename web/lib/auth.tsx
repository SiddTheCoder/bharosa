"use client";

import { User, onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { auth, googleSignIn, signOutFirebase } from "@/lib/firebase";
import { useAppDispatch } from "@/store/hooks";
import { setIdToken as setAuthIdToken, setLoading as setAuthLoading, setUser as setAuthUser } from "@/store/slices/authSlice";
import { hydrateProfileDefaults } from "@/store/slices/profileSlice";
import type { AuthUser, KycStatus } from "@/types/user";

type AuthContextValue = {
  firebaseUser: User | null;
  user: AuthUser | null;
  idToken: string | null;
  kycStatus: KycStatus;
  loading: boolean;
  refreshMe: () => Promise<AuthUser | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  // Mirror auth state into the Redux store so any component can read it.
  useEffect(() => {
    dispatch(setAuthLoading(loading));
  }, [dispatch, loading]);
  useEffect(() => {
    dispatch(setAuthUser(user));
    if (user) {
      dispatch(
        hydrateProfileDefaults({
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          phone: user.phone ?? undefined,
        })
      );
    }
  }, [dispatch, user]);
  useEffect(() => {
    dispatch(setAuthIdToken(idToken));
  }, [dispatch, idToken]);

  const refreshMe = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return null;
    const token = await current.getIdToken();
    setIdToken(token);
    document.cookie = "bharosa-auth=1; path=/; SameSite=Lax";
    const me = await apiGet<AuthUser>("/auth/me", token);
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (current) => {
      setFirebaseUser(current);
      setLoading(true);
      try {
        if (current) {
          await refreshMe();
        } else {
          setUser(null);
          setIdToken(null);
          document.cookie = "bharosa-auth=; Max-Age=0; path=/";
        }
      } catch (error) {
        console.error(error);
        toast.error("Could not sync your Bharosa account");
      } finally {
        setLoading(false);
      }
    });
  }, [refreshMe]);

  useEffect(() => {
    if (loading) return;
    const appRoute = pathname?.startsWith("/dashboard") || pathname?.startsWith("/kyc") || pathname?.startsWith("/merchant") || pathname?.startsWith("/atlas") || pathname?.startsWith("/me") || pathname?.startsWith("/profile") || pathname?.startsWith("/demo");
    if (!firebaseUser && appRoute) router.replace("/login");
    // KYC is no longer a hard gate: authenticated users can use the whole app.
    // A persistent top banner nudges them to verify (see KycBanner).
    if (firebaseUser && (pathname === "/" || pathname === "/login")) router.replace("/dashboard");
  }, [firebaseUser, loading, pathname, router, user?.kyc_status]);

  const value = useMemo<AuthContextValue>(() => ({
    firebaseUser,
    user,
    idToken,
    kycStatus: user?.kyc_status ?? "unverified",
    loading,
    refreshMe,
    signInWithGoogle: async () => {
      await googleSignIn();
      await refreshMe();
      router.replace("/dashboard");
    },
    signOut: async () => {
      await signOutFirebase();
      router.replace("/");
    }
  }), [firebaseUser, idToken, loading, refreshMe, router, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
