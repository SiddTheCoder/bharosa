import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser, KycStatus } from "@/types/user";

export type AuthState = {
  user: AuthUser | null;
  idToken: string | null;
  kycStatus: KycStatus;
  loading: boolean;
};

const initialState: AuthState = {
  user: null,
  idToken: null,
  kycStatus: "unverified",
  loading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<Partial<AuthState>>) {
      Object.assign(state, action.payload);
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.kycStatus = action.payload?.kyc_status ?? "unverified";
    },
    setIdToken(state, action: PayloadAction<string | null>) {
      state.idToken = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    clearAuth() {
      return { ...initialState, loading: false };
    },
  },
});

export const { setAuth, setUser, setIdToken, setLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
