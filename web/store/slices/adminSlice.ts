import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { mockAdminMerchantDetails, mockAdminMerchants, mockAdminStats } from "@/lib/admin-mock";
import type { AdminMerchantDetail, AdminMerchantRow, AdminStats } from "@/types/admin";

export type AdminMerchantFilter = "all" | "review" | "anchor";

export type AdminState = {
  merchants: AdminMerchantRow[];
  details: Record<string, AdminMerchantDetail>;
  stats: AdminStats;
  search: string;
  filter: AdminMerchantFilter;
  source: "mock" | "api";
};

const mockMerchants = mockAdminMerchants("", 200).merchants;

const initialState: AdminState = {
  merchants: mockMerchants,
  details: mockAdminMerchantDetails(),
  stats: mockAdminStats(),
  search: "",
  filter: "all",
  source: "mock",
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    setAdminSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setAdminFilter(state, action: PayloadAction<AdminMerchantFilter>) {
      state.filter = action.payload;
    },
    setAdminMerchants(state, action: PayloadAction<AdminMerchantRow[]>) {
      state.merchants = action.payload.map(normalizeMerchantRow);
      state.stats = summarizeMerchants(state.merchants);
      state.source = "api";
    },
    setAdminStats(state, action: PayloadAction<AdminStats>) {
      state.stats = {
        ...action.payload,
        avg_score: normalizeScore(action.payload.avg_score),
      };
      state.source = "api";
    },
    setAdminMerchantDetail(state, action: PayloadAction<AdminMerchantDetail>) {
      const detail = normalizeMerchantDetail(action.payload);
      state.details[detail.merchant.id] = detail;
      const index = state.merchants.findIndex((merchant) => merchant.id === detail.merchant.id);
      if (index >= 0) {
        state.merchants[index] = normalizeMerchantRow({
          ...state.merchants[index],
          name: detail.merchant.name,
          business_type: detail.merchant.business_type,
          is_anchor: detail.merchant.is_anchor,
          created_at: detail.merchant.created_at,
          kyc_status: detail.user?.kyc_status ?? detail.kyc?.decision ?? state.merchants[index].kyc_status,
          score: Number(detail.passport.score ?? state.merchants[index].score),
          confidence: Number(detail.passport.confidence ?? state.merchants[index].confidence),
          fraud_risk: String(detail.passport.fraud_risk ?? state.merchants[index].fraud_risk) as AdminMerchantRow["fraud_risk"],
        });
      }
      state.stats = summarizeMerchants(state.merchants);
      state.source = "api";
    },
    updateAdminKycDecision(state, action: PayloadAction<{ merchantId: string; decision: "verified" | "rejected" }>) {
      const detail = state.details[action.payload.merchantId];
      if (detail?.kyc) detail.kyc.decision = action.payload.decision;
      if (detail?.user) detail.user.kyc_status = action.payload.decision;

      const row = state.merchants.find((merchant) => merchant.id === action.payload.merchantId);
      if (row) row.kyc_status = action.payload.decision;
      state.stats = summarizeMerchants(state.merchants);
    },
  },
});

export const {
  setAdminSearch,
  setAdminFilter,
  setAdminMerchants,
  setAdminStats,
  setAdminMerchantDetail,
  updateAdminKycDecision,
} = adminSlice.actions;

export default adminSlice.reducer;

export function normalizeMerchantRow(row: AdminMerchantRow): AdminMerchantRow {
  return {
    ...row,
    score: normalizeScore(row.score),
    confidence: normalizeConfidence(row.confidence),
    fraud_risk: row.fraud_risk === "HIGH" || row.fraud_risk === "MEDIUM" ? row.fraud_risk : "LOW",
  };
}

function normalizeMerchantDetail(detail: AdminMerchantDetail): AdminMerchantDetail {
  const score = normalizeScore(Number(detail.passport.score ?? 0));
  const confidence = normalizeConfidence(Number(detail.passport.confidence ?? 0));

  return {
    ...detail,
    passport: {
      ...detail.passport,
      score,
      confidence,
    },
    score_history: detail.score_history?.map((point) => ({
      ...point,
      score: normalizeScore(point.score),
      confidence: normalizeConfidence(point.confidence),
    })),
  };
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  const scaled = value <= 1 ? value * 100 : value;
  return Math.round(Math.max(0, Math.min(100, scaled)));
}

function normalizeConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  const scaled = value > 1 ? value / 100 : value;
  return Number(Math.max(0, Math.min(1, scaled)).toFixed(2));
}

function summarizeMerchants(merchants: AdminMerchantRow[]): AdminStats {
  const scored = merchants.filter((merchant) => merchant.score > 0);
  return {
    total_merchants: merchants.length,
    anchors: merchants.filter((merchant) => merchant.is_anchor).length,
    fraud_flagged: merchants.filter((merchant) => merchant.fraud_risk === "HIGH").length,
    pending_kyc: merchants.filter((merchant) => merchant.kyc_status === "pending").length,
    avg_score: scored.length ? Math.round(scored.reduce((sum, merchant) => sum + merchant.score, 0) / scored.length) : 0,
    scored: scored.length,
  };
}
