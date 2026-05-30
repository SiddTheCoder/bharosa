import { configureStore } from "@reduxjs/toolkit";
import adminReducer from "./slices/adminSlice";
import authReducer from "./slices/authSlice";
import billsReducer from "./slices/billsSlice";
import kycReducer, { setKycStatus, setKycStep, updateKycForm, type KycState } from "./slices/kycSlice";
import profileReducer, { setProfile, setProfilePhoto, type ProfileState } from "./slices/profileSlice";

const PERSIST = {
  profile: "bharosa-redux-profile",
  kyc: "bharosa-redux-kyc",
} as const;

function readJson<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function makeStore() {
  const store = configureStore({
    reducer: {
      admin: adminReducer,
      auth: authReducer,
      bills: billsReducer,
      kyc: kycReducer,
      profile: profileReducer,
    },
  });

  if (typeof window !== "undefined") {
    // Rehydrate the profile + kyc slices from localStorage so the form/status stay put.
    const profile = readJson<ProfileState>(PERSIST.profile);
    if (profile?.profile) store.dispatch(setProfile(profile.profile));
    if (profile?.photo) store.dispatch(setProfilePhoto(profile.photo));

    const kyc = readJson<KycState>(PERSIST.kyc);
    if (kyc?.form) store.dispatch(updateKycForm(kyc.form));
    if (kyc?.step) store.dispatch(setKycStep(kyc.step));
    if (kyc?.status) store.dispatch(setKycStatus(kyc.status));

    // Persist the profile + kyc slices on every change.
    let lastProfile: ProfileState | undefined;
    let lastKyc: KycState | undefined;
    store.subscribe(() => {
      const state = store.getState();
      if (state.profile !== lastProfile) {
        lastProfile = state.profile;
        try {
          window.localStorage.setItem(PERSIST.profile, JSON.stringify(state.profile));
        } catch {
          /* quota / private mode — ignore */
        }
      }
      if (state.kyc !== lastKyc) {
        lastKyc = state.kyc;
        try {
          // Don't persist a transient "checking…" flag.
          window.localStorage.setItem(PERSIST.kyc, JSON.stringify({ ...state.kyc, busy: false }));
        } catch {
          /* quota / private mode — ignore */
        }
      }
    });
  }

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
