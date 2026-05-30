import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { KycStatusResponse } from "@/types/kyc";

export type KycStep = 1 | 2 | 3;
export type SelfieSource = "upload" | "camera";

export type KycForm = {
  docType: string;
  fullName: string;
  dob: string;
  idNumber: string;
  selfieSource: SelfieSource;
};

export type KycState = {
  /** Server-side status + latest submission (what the user submitted + AI read). */
  status: KycStatusResponse | null;
  /** Draft form the user is filling in (File objects stay in component state). */
  form: KycForm;
  step: KycStep;
  busy: boolean;
};

const initialState: KycState = {
  status: null,
  form: { docType: "citizenship", fullName: "", dob: "", idNumber: "", selfieSource: "upload" },
  step: 1,
  busy: false,
};

const kycSlice = createSlice({
  name: "kyc",
  initialState,
  reducers: {
    setKycStatus(state, action: PayloadAction<KycStatusResponse | null>) {
      state.status = action.payload;
    },
    updateKycForm(state, action: PayloadAction<Partial<KycForm>>) {
      Object.assign(state.form, action.payload);
    },
    setKycStep(state, action: PayloadAction<KycStep>) {
      state.step = action.payload;
    },
    setKycBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload;
    },
    resetKycForm(state) {
      state.form = initialState.form;
      state.step = 1;
    },
  },
});

export const { setKycStatus, updateKycForm, setKycStep, setKycBusy, resetKycForm } = kycSlice.actions;
export default kycSlice.reducer;
