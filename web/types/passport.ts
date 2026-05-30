export type CounterpartyStat = {
  counterparty: string;
  name: string;
  txns: number;
  total_amount: number;
  tenure_months: number;
  regularity: number;
  recurring: boolean;
};

export type RelationshipMetrics = {
  incoming_txns: number;
  outgoing_txns: number;
  n_customers: number;
  n_repeat_customers: number;
  n_regular_customers: number;
  repeat_revenue_share: number;
  customer_regularity: number;
  n_suppliers: number;
  n_regular_suppliers: number;
  supplier_stability: number;
  hhi: number;
  top_customer_share: number;
  concentration_risk: boolean;
};

export type Relationships = {
  metrics: RelationshipMetrics;
  customers: CounterpartyStat[];
  suppliers: CounterpartyStat[];
};

export type Passport = {
  merchant_id: string;
  merchant_name: string;
  score: number;
  confidence: number;
  interval: { p5: number; p50: number; p95: number };
  fraud_risk: "LOW" | "MEDIUM" | "HIGH";
  evidence: Array<{ source: string; label: string; impact: number; action_type?: string }>;
  next_steps: string[];
  loan: { amount_npr: number; schedule_note: string };
  relationships: Relationships;
  why: string;
};

export type PassportUpdate = Partial<Passport> & { merchant_id: string };
