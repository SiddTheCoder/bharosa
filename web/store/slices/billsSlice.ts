import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Bill = {
  id: string;
  kind: "electricity" | "water" | "internet";
  amount: number;
  on_time: boolean;
  date: string | null;
  receipt_uri: string | null;
};

export type BillsStatus = "idle" | "loading" | "loaded" | "error";

export type BillsState = {
  items: Bill[];
  status: BillsStatus;
};

const initialState: BillsState = {
  items: [],
  status: "idle",
};

const billsSlice = createSlice({
  name: "bills",
  initialState,
  reducers: {
    setBillsStatus(state, action: PayloadAction<BillsStatus>) {
      state.status = action.payload;
    },
    setBills(state, action: PayloadAction<Bill[]>) {
      state.items = action.payload;
      state.status = "loaded";
    },
    /** Mark the list stale so the next visit refetches (e.g. after adding a bill). */
    invalidateBills(state) {
      state.status = "idle";
    },
  },
});

export const { setBillsStatus, setBills, invalidateBills } = billsSlice.actions;
export default billsSlice.reducer;
