/** Response shapes for the backend `/admin/*` API (see server/app/api/routes/admin.py). */

export type FraudRisk = "LOW" | "MEDIUM" | "HIGH";

export type AdminMerchantRow = {
  id: string;
  name: string | null;
  business_type: string | null;
  is_anchor: boolean;
  created_at: string | null;
  kyc_status: string | null;
  score: number;
  confidence: number;
  fraud_risk: FraudRisk;
};

export type AdminMerchantsResponse = {
  merchants: AdminMerchantRow[];
  total: number;
  skip: number;
  limit: number;
};

export type AdminStats = {
  total_merchants: number;
  anchors: number;
  fraud_flagged: number;
  pending_kyc: number;
  avg_score: number;
  scored: number;
};

export type AdminUserPublic = {
  uid: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  provider: string | null;
  kyc_status: string | null;
  created_at: string | null;
};

export type AdminKycSubmission = {
  submission_id: string;
  doc_type: string | null;
  decision: string | null;
  confidence: number | null;
  reasons: string[];
  claimed: Record<string, unknown>;
  extracted: Record<string, unknown>;
  checks: Record<string, unknown>;
  doc_uris: string[];
  selfie_uri: string | null;
  created_at: string | null;
};

export type AdminMerchantDetail = {
  merchant: {
    id: string;
    name: string | null;
    business_type: string | null;
    is_anchor: boolean;
    created_at: string | null;
  };
  passport: Record<string, unknown> & { merchant_name?: string | null };
  user: AdminUserPublic | null;
  kyc: AdminKycSubmission | null;
  counts: { transactions: number; vouches_in: number; vouches_out: number };
  score_history?: AdminScorePoint[];
  transactions?: AdminTransaction[];
  vouches?: AdminVouch[];
  signals?: AdminMerchantSignal[];
};

export type AdminKycResponse = {
  user: AdminUserPublic | null;
  submissions: AdminKycSubmission[];
};

export type AdminScorePoint = {
  month: string;
  score: number;
  confidence: number;
};

export type AdminTransaction = {
  id: string | null;
  kind: string | null;
  amount: number | null;
  on_time: boolean | null;
  direction: string | null;
  counterparty_name: string | null;
  date: string | null;
  receipt_uri?: string | null;
};

export type AdminVouch = {
  id: string | null;
  kind: string | null;
  direction: "in" | "out" | string;
  from_id: string | null;
  from_name: string | null;
  to_id: string | null;
  to_name: string | null;
  created_at: string | null;
};

export type AdminMerchantTransactionsResponse = {
  transactions: AdminTransaction[];
  total: number;
  skip: number;
  limit: number;
  vouches: AdminVouch[];
};

export type AdminMerchantSignal = {
  label: string;
  value: string;
  sentiment: "positive" | "neutral" | "warning" | "danger";
};
