import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Business categories — mirror the engine's `business_type` values. */
export const BUSINESS_TYPES = [
  "Farmer",
  "Tea shop",
  "Vegetable vendor",
  "Retail / general store",
  "Street vendor",
  "Services",
  "Other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type Profile = {
  name: string;
  businessName: string;
  businessType: BusinessType;
  /** How many months the business has been running (seasonal-tenure signal). */
  businessMonths: string;
  /** Typical monthly income in NPR (drives the monthly-based score). */
  monthlyIncome: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  language: string;
  timezone: string;
  nationality: string;
};

export type ProfileState = {
  profile: Profile;
  /** Profile photo as a data URL or remote URL (persisted to localStorage). */
  photo: string;
};

export const emptyProfile: Profile = {
  name: "Merchant",
  businessName: "Bharosa Merchant",
  businessType: "Other",
  businessMonths: "",
  monthlyIncome: "",
  email: "Not provided",
  phone: "Not provided",
  dob: "",
  address: "Kathmandu, Bagmati Province",
  city: "Kathmandu",
  province: "Bagmati",
  postalCode: "",
  country: "Nepal",
  language: "English",
  timezone: "Asia/Kathmandu",
  nationality: "Nepali",
};

const initialState: ProfileState = {
  profile: emptyProfile,
  photo: "",
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<Profile>) {
      state.profile = action.payload;
    },
    updateProfile(state, action: PayloadAction<Partial<Profile>>) {
      Object.assign(state.profile, action.payload);
    },
    /** Fill any still-default fields from the authenticated user (non-destructive). */
    hydrateProfileDefaults(state, action: PayloadAction<Partial<Profile>>) {
      for (const [key, value] of Object.entries(action.payload) as [keyof Profile, Profile[keyof Profile]][]) {
        if (value && (state.profile[key] === emptyProfile[key] || !state.profile[key])) {
          (state.profile[key] as Profile[keyof Profile]) = value;
        }
      }
    },
    setProfilePhoto(state, action: PayloadAction<string>) {
      state.photo = action.payload;
    },
  },
});

export const { setProfile, updateProfile, hydrateProfileDefaults, setProfilePhoto } = profileSlice.actions;
export default profileSlice.reducer;
