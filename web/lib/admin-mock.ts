import type {
  AdminMerchantDetail,
  AdminMerchantsResponse,
  AdminMerchantRow,
  AdminMerchantTransactionsResponse,
  AdminStats,
} from "@/types/admin";

export const MOCK_ADMIN_TOKEN = "bharosa-mock-admin-token";
export const MOCK_ADMIN_USER = { email: "demo.admin@bharosa.local" };

export function isAdminMockEnabled() {
  return process.env.NEXT_PUBLIC_ADMIN_MOCKS !== "false";
}

const rows: AdminMerchantRow[] = [
  {
    id: "mkt-ktm-001",
    name: "Asha Kirana & Mobile Pay",
    business_type: "Neighborhood retail",
    is_anchor: true,
    created_at: "2025-11-14T09:30:00.000Z",
    kyc_status: "verified",
    score: 86,
    confidence: 0.91,
    fraud_risk: "LOW",
  },
  {
    id: "tea-lalit-017",
    name: "Lalitpur Tea House",
    business_type: "Food service",
    is_anchor: false,
    created_at: "2026-01-08T08:15:00.000Z",
    kyc_status: "verified",
    score: 73,
    confidence: 0.77,
    fraud_risk: "LOW",
  },
  {
    id: "farm-pok-044",
    name: "Pokhara Fresh Produce",
    business_type: "Fresh produce supplier",
    is_anchor: true,
    created_at: "2025-09-22T11:05:00.000Z",
    kyc_status: "verified",
    score: 92,
    confidence: 0.94,
    fraud_risk: "LOW",
  },
  {
    id: "tailor-bkt-026",
    name: "Bhaktapur Tailor Works",
    business_type: "Apparel services",
    is_anchor: false,
    created_at: "2026-02-17T13:40:00.000Z",
    kyc_status: "pending",
    score: 61,
    confidence: 0.63,
    fraud_risk: "MEDIUM",
  },
  {
    id: "ride-ktm-089",
    name: "City Ride Repair Hub",
    business_type: "Vehicle repair",
    is_anchor: false,
    created_at: "2026-03-02T06:50:00.000Z",
    kyc_status: "verified",
    score: 78,
    confidence: 0.82,
    fraud_risk: "LOW",
  },
  {
    id: "craft-jan-052",
    name: "Janakpur Craft Collective",
    business_type: "Handmade goods",
    is_anchor: false,
    created_at: "2026-02-27T15:20:00.000Z",
    kyc_status: "pending",
    score: 54,
    confidence: 0.58,
    fraud_risk: "MEDIUM",
  },
  {
    id: "elec-bir-038",
    name: "Birgunj Electronics Mart",
    business_type: "Electronics reseller",
    is_anchor: false,
    created_at: "2025-12-05T10:45:00.000Z",
    kyc_status: "rejected",
    score: 39,
    confidence: 0.72,
    fraud_risk: "HIGH",
  },
];

const details: Record<string, AdminMerchantDetail> = {
  "mkt-ktm-001": makeDetail(rows[0], {
    owner: "Asha Gurung",
    email: "asha.gurung@example.com",
    phone: "+977 984-111-2401",
    provider: "phone",
    transactionCount: 248,
    vouchesIn: 19,
    vouchesOut: 8,
    scoreHistory: [
      ["Jan", 68, 0.62],
      ["Feb", 72, 0.7],
      ["Mar", 76, 0.76],
      ["Apr", 82, 0.86],
      ["May", 86, 0.91],
    ],
    signals: [
      ["Repeat counterparties", "82%", "positive"],
      ["Bill payment timeliness", "96%", "positive"],
      ["Cash flow volatility", "Low", "positive"],
      ["KYC review", "Verified", "positive"],
    ],
    kycReasons: ["Document face match passed", "Address matched two recent utility events"],
    transactions: [
      ["txn-9011", "qr_revenue", 18400, true, "in", "Walk-in QR customers", "2026-05-28T08:12:00.000Z"],
      ["txn-8976", "supplier_payment", 9200, true, "out", "Everest Wholesale", "2026-05-25T10:30:00.000Z"],
      ["txn-8912", "electricity", 1850, true, "out", "NEA", "2026-05-20T06:00:00.000Z"],
      ["txn-8841", "airtime", 4200, true, "in", "Prepaid customers", "2026-05-16T15:45:00.000Z"],
      ["txn-8798", "internet", 1450, true, "out", "WorldLink", "2026-05-11T12:05:00.000Z"],
    ],
    vouches: [
      ["vou-3001", "supplier", "in", "farm-pok-044", "Pokhara Fresh Produce", "mkt-ktm-001", "Asha Kirana & Mobile Pay", "2026-05-21T09:00:00.000Z"],
      ["vou-3010", "customer", "out", "mkt-ktm-001", "Asha Kirana & Mobile Pay", "tailor-bkt-026", "Bhaktapur Tailor Works", "2026-05-08T11:25:00.000Z"],
      ["vou-3032", "anchor", "in", "tea-lalit-017", "Lalitpur Tea House", "mkt-ktm-001", "Asha Kirana & Mobile Pay", "2026-04-29T14:10:00.000Z"],
    ],
  }),
  "tea-lalit-017": makeDetail(rows[1], {
    owner: "Nima Tamang",
    email: "nima.tea@example.com",
    phone: "+977 981-445-7782",
    provider: "google",
    transactionCount: 126,
    vouchesIn: 7,
    vouchesOut: 4,
    scoreHistory: [
      ["Jan", 58, 0.52],
      ["Feb", 64, 0.61],
      ["Mar", 67, 0.69],
      ["Apr", 70, 0.73],
      ["May", 73, 0.77],
    ],
    signals: [
      ["Seasonal stability", "Improving", "positive"],
      ["Utility evidence", "4 months", "positive"],
      ["Network strength", "Moderate", "neutral"],
      ["Missed payments", "1 recent", "warning"],
    ],
    kycReasons: ["National ID OCR passed", "Selfie confidence above threshold"],
    transactions: [
      ["txn-7712", "qr_revenue", 9650, true, "in", "Cafe QR revenue", "2026-05-29T07:40:00.000Z"],
      ["txn-7671", "water", 770, true, "out", "KUKL", "2026-05-24T05:30:00.000Z"],
      ["txn-7598", "supplier_payment", 6200, false, "out", "Himalayan Tea Supply", "2026-05-18T13:10:00.000Z"],
      ["txn-7442", "internet", 1200, true, "out", "Vianet", "2026-05-09T09:15:00.000Z"],
    ],
    vouches: [
      ["vou-2001", "customer", "in", "mkt-ktm-001", "Asha Kirana & Mobile Pay", "tea-lalit-017", "Lalitpur Tea House", "2026-05-03T11:10:00.000Z"],
      ["vou-2034", "supplier", "out", "tea-lalit-017", "Lalitpur Tea House", "farm-pok-044", "Pokhara Fresh Produce", "2026-04-15T13:20:00.000Z"],
    ],
  }),
  "farm-pok-044": makeDetail(rows[2], {
    owner: "Rajan Subedi",
    email: "rajan.produce@example.com",
    phone: "+977 980-332-1190",
    provider: "phone",
    transactionCount: 392,
    vouchesIn: 31,
    vouchesOut: 22,
    scoreHistory: [
      ["Jan", 84, 0.81],
      ["Feb", 86, 0.86],
      ["Mar", 88, 0.9],
      ["Apr", 90, 0.93],
      ["May", 92, 0.94],
    ],
    signals: [
      ["Anchor network", "31 incoming", "positive"],
      ["Payment timeliness", "98%", "positive"],
      ["Revenue trend", "+18%", "positive"],
      ["Counterparty diversity", "High", "positive"],
    ],
    kycReasons: ["VAT certificate validated", "Business address confirmed by anchor vouchers"],
    transactions: [
      ["txn-6510", "supplier_payment", 24500, true, "in", "Asha Kirana & Mobile Pay", "2026-05-29T12:45:00.000Z"],
      ["txn-6491", "supplier_payment", 18200, true, "in", "Lalitpur Tea House", "2026-05-26T08:35:00.000Z"],
      ["txn-6402", "electricity", 3100, true, "out", "NEA", "2026-05-18T04:20:00.000Z"],
      ["txn-6321", "qr_revenue", 22100, true, "in", "Market buyers", "2026-05-12T16:00:00.000Z"],
    ],
    vouches: [
      ["vou-1001", "anchor", "in", "mkt-ktm-001", "Asha Kirana & Mobile Pay", "farm-pok-044", "Pokhara Fresh Produce", "2026-05-23T09:20:00.000Z"],
      ["vou-1002", "supplier", "in", "tea-lalit-017", "Lalitpur Tea House", "farm-pok-044", "Pokhara Fresh Produce", "2026-05-17T12:30:00.000Z"],
    ],
  }),
  "tailor-bkt-026": makeDetail(rows[3], {
    owner: "Sushma Shrestha",
    email: "sushma.tailor@example.com",
    phone: "+977 986-222-4890",
    provider: "phone",
    transactionCount: 72,
    vouchesIn: 5,
    vouchesOut: 2,
    scoreHistory: [
      ["Jan", 45, 0.38],
      ["Feb", 50, 0.45],
      ["Mar", 53, 0.51],
      ["Apr", 59, 0.58],
      ["May", 61, 0.63],
    ],
    signals: [
      ["KYC review", "Pending", "warning"],
      ["Payment timeliness", "89%", "neutral"],
      ["Network strength", "Thin", "warning"],
      ["Recent revenue", "+9%", "positive"],
    ],
    kycReasons: ["Selfie submitted", "Business registration image needs operator review"],
    transactions: [
      ["txn-5108", "qr_revenue", 5400, true, "in", "Tailoring customers", "2026-05-27T10:00:00.000Z"],
      ["txn-5074", "supplier_payment", 3600, true, "out", "Fabric Center", "2026-05-22T09:40:00.000Z"],
      ["txn-5012", "electricity", 980, false, "out", "NEA", "2026-05-18T05:10:00.000Z"],
      ["txn-4941", "internet", 1100, true, "out", "Classic Tech", "2026-05-08T14:30:00.000Z"],
    ],
    vouches: [
      ["vou-4401", "customer", "in", "mkt-ktm-001", "Asha Kirana & Mobile Pay", "tailor-bkt-026", "Bhaktapur Tailor Works", "2026-05-09T12:00:00.000Z"],
      ["vou-4408", "supplier", "out", "tailor-bkt-026", "Bhaktapur Tailor Works", "craft-jan-052", "Janakpur Craft Collective", "2026-04-27T08:45:00.000Z"],
    ],
  }),
  "ride-ktm-089": makeDetail(rows[4], {
    owner: "Bikash Maharjan",
    email: "bikash.repair@example.com",
    phone: "+977 984-771-9020",
    provider: "google",
    transactionCount: 184,
    vouchesIn: 10,
    vouchesOut: 6,
    scoreHistory: [
      ["Jan", 66, 0.6],
      ["Feb", 68, 0.66],
      ["Mar", 72, 0.73],
      ["Apr", 76, 0.79],
      ["May", 78, 0.82],
    ],
    signals: [
      ["Repeat customers", "64%", "positive"],
      ["Bill consistency", "Strong", "positive"],
      ["Refund anomalies", "None", "positive"],
      ["Cash flow volatility", "Medium", "neutral"],
    ],
    kycReasons: ["Driving workshop permit verified", "Operator approved selfie match"],
    transactions: [
      ["txn-4210", "qr_revenue", 12900, true, "in", "Repair customers", "2026-05-28T13:35:00.000Z"],
      ["txn-4177", "supplier_payment", 8700, true, "out", "Parts Nepal", "2026-05-24T10:10:00.000Z"],
      ["txn-4102", "electricity", 2300, true, "out", "NEA", "2026-05-16T06:20:00.000Z"],
      ["txn-4040", "water", 680, true, "out", "KUKL", "2026-05-10T07:50:00.000Z"],
    ],
    vouches: [
      ["vou-5001", "customer", "in", "mkt-ktm-001", "Asha Kirana & Mobile Pay", "ride-ktm-089", "City Ride Repair Hub", "2026-05-19T10:20:00.000Z"],
      ["vou-5004", "supplier", "out", "ride-ktm-089", "City Ride Repair Hub", "elec-bir-038", "Birgunj Electronics Mart", "2026-04-30T15:05:00.000Z"],
    ],
  }),
  "craft-jan-052": makeDetail(rows[5], {
    owner: "Mina Yadav",
    email: "mina.craft@example.com",
    phone: "+977 980-778-6612",
    provider: "phone",
    transactionCount: 58,
    vouchesIn: 4,
    vouchesOut: 1,
    scoreHistory: [
      ["Jan", 42, 0.31],
      ["Feb", 43, 0.39],
      ["Mar", 49, 0.47],
      ["Apr", 52, 0.53],
      ["May", 54, 0.58],
    ],
    signals: [
      ["KYC review", "Pending", "warning"],
      ["Evidence depth", "Thin", "warning"],
      ["Revenue trend", "+6%", "neutral"],
      ["Network age", "New", "neutral"],
    ],
    kycReasons: ["Document uploaded", "Waiting for operator decision"],
    transactions: [
      ["txn-3301", "qr_revenue", 4100, true, "in", "Craft buyers", "2026-05-26T11:20:00.000Z"],
      ["txn-3271", "supplier_payment", 1800, true, "out", "Thread Supplier", "2026-05-22T09:10:00.000Z"],
      ["txn-3198", "airtime", 900, true, "out", "Ncell", "2026-05-18T12:45:00.000Z"],
    ],
    vouches: [
      ["vou-6201", "supplier", "in", "tailor-bkt-026", "Bhaktapur Tailor Works", "craft-jan-052", "Janakpur Craft Collective", "2026-05-02T07:30:00.000Z"],
    ],
  }),
  "elec-bir-038": makeDetail(rows[6], {
    owner: "Kamal Sah",
    email: "kamal.electronics@example.com",
    phone: "+977 982-115-0081",
    provider: "google",
    transactionCount: 111,
    vouchesIn: 2,
    vouchesOut: 9,
    scoreHistory: [
      ["Jan", 64, 0.56],
      ["Feb", 60, 0.61],
      ["Mar", 51, 0.66],
      ["Apr", 43, 0.7],
      ["May", 39, 0.72],
    ],
    signals: [
      ["KYC review", "Rejected", "danger"],
      ["Refund anomaly", "High", "danger"],
      ["Counterparty churn", "Elevated", "warning"],
      ["Bill payment timeliness", "72%", "warning"],
    ],
    kycReasons: ["Document name did not match claimed owner", "Repeated high-value reversals flagged"],
    transactions: [
      ["txn-2107", "qr_revenue", 31500, false, "in", "Retail customers", "2026-05-28T16:30:00.000Z"],
      ["txn-2077", "supplier_payment", 41000, false, "out", "Unknown supplier", "2026-05-24T13:50:00.000Z"],
      ["txn-2012", "internet", 1600, true, "out", "WorldLink", "2026-05-18T06:55:00.000Z"],
      ["txn-1988", "electricity", 5400, false, "out", "NEA", "2026-05-12T09:25:00.000Z"],
    ],
    vouches: [
      ["vou-7001", "supplier", "out", "elec-bir-038", "Birgunj Electronics Mart", "ride-ktm-089", "City Ride Repair Hub", "2026-05-04T11:10:00.000Z"],
      ["vou-7008", "customer", "in", "craft-jan-052", "Janakpur Craft Collective", "elec-bir-038", "Birgunj Electronics Mart", "2026-04-21T08:15:00.000Z"],
    ],
  }),
};

export function mockAdminStats(): AdminStats {
  const scored = rows.filter((row) => row.score > 0);
  return {
    total_merchants: rows.length,
    anchors: rows.filter((row) => row.is_anchor).length,
    fraud_flagged: rows.filter((row) => row.fraud_risk === "HIGH").length,
    pending_kyc: rows.filter((row) => row.kyc_status === "pending").length,
    avg_score: Math.round(scored.reduce((sum, row) => sum + row.score, 0) / scored.length),
    scored: scored.length,
  };
}

export function mockAdminMerchants(q = "", limit = 100, skip = 0): AdminMerchantsResponse {
  const query = q.trim().toLowerCase();
  const filtered = query
    ? rows.filter((row) =>
        [row.id, row.name, row.business_type, row.kyc_status, row.fraud_risk]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
    : rows;

  return {
    merchants: filtered.slice(skip, skip + limit),
    total: filtered.length,
    skip,
    limit,
  };
}

export function mockAdminMerchantDetail(id: string): AdminMerchantDetail | null {
  return details[id] ?? null;
}

export function mockAdminMerchantDetails(): Record<string, AdminMerchantDetail> {
  return { ...details };
}

export function mockAdminMerchantTransactions(id: string): AdminMerchantTransactionsResponse | null {
  const detail = details[id];
  if (!detail) return null;

  return {
    transactions: detail.transactions ?? [],
    total: detail.transactions?.length ?? 0,
    skip: 0,
    limit: 100,
    vouches: detail.vouches ?? [],
  };
}

function makeDetail(
  row: AdminMerchantRow,
  input: {
    owner: string;
    email: string;
    phone: string;
    provider: string;
    transactionCount: number;
    vouchesIn: number;
    vouchesOut: number;
    scoreHistory: [string, number, number][];
    signals: [string, string, "positive" | "neutral" | "warning" | "danger"][];
    kycReasons: string[];
    transactions: [string, string, number, boolean, string, string, string][];
    vouches: [string, string, "in" | "out", string, string, string, string, string][];
  }
): AdminMerchantDetail {
  return {
    merchant: {
      id: row.id,
      name: row.name,
      business_type: row.business_type,
      is_anchor: row.is_anchor,
      created_at: row.created_at,
    },
    passport: {
      merchant_name: row.name,
      score: row.score,
      confidence: row.confidence,
      fraud_risk: row.fraud_risk,
      kyc_status: row.kyc_status,
      explanation: `${row.name} has a ${row.fraud_risk.toLowerCase()} risk profile with ${Math.round(row.confidence * 100)}% score confidence.`,
    },
    user: {
      uid: `uid-${row.id}`,
      name: input.owner,
      email: input.email,
      phone: input.phone,
      provider: input.provider,
      kyc_status: row.kyc_status,
      created_at: row.created_at,
    },
    kyc: {
      submission_id: `kyc-${row.id}`,
      doc_type: "national_id",
      decision: row.kyc_status === "pending" ? null : row.kyc_status,
      confidence: row.kyc_status === "rejected" ? 0.52 : row.kyc_status === "pending" ? 0.68 : 0.91,
      reasons: input.kycReasons,
      claimed: { name: input.owner, business_name: row.name, phone: input.phone },
      extracted: { name: input.owner, business_name: row.name, document_country: "NP" },
      checks: { face_match: row.kyc_status !== "rejected", liveness: true, duplicate_document: row.kyc_status === "rejected" },
      doc_uris: [],
      selfie_uri: null,
      created_at: row.created_at,
    },
    counts: {
      transactions: input.transactionCount,
      vouches_in: input.vouchesIn,
      vouches_out: input.vouchesOut,
    },
    score_history: input.scoreHistory.map(([month, score, confidence]) => ({ month, score, confidence })),
    signals: input.signals.map(([label, value, sentiment]) => ({ label, value, sentiment })),
    transactions: input.transactions.map(([id, kind, amount, on_time, direction, counterparty_name, date]) => ({
      id,
      kind,
      amount,
      on_time,
      direction,
      counterparty_name,
      date,
    })),
    vouches: input.vouches.map(([id, kind, direction, from_id, from_name, to_id, to_name, created_at]) => ({
      id,
      kind,
      direction,
      from_id,
      from_name,
      to_id,
      to_name,
      created_at,
    })),
  };
}
