import type { Passport } from './passport';

export const mockPassport: Passport = {
  merchant_id: 'me',
  merchant_name: 'Asha Store',
  score: 712,
  confidence: 0.74,
  interval: { p5: 628, p50: 712, p95: 806 },
  fraud_risk: 'LOW',
  evidence: [
    { source: 'social', label: '2 trusted businesses vouched for you', impact: 42, action_type: 'vouch' },
    { source: 'behavior', label: '5 of 6 utility bills paid on time', impact: 30, action_type: 'bill' },
    { source: 'sales', label: 'Steady QR sales every month', impact: 22, action_type: 'qr' },
    { source: 'psychometric', label: 'Completed the business interview', impact: 18, action_type: 'interview' },
  ],
  next_steps: [
    'Finish the voice check in Nepali',
    'Set up water bill autopay',
    'Invite 1 more business to vouch',
  ],
  loan: { amount_npr: 120000, schedule_note: 'Pay back weekly, with a 2-week grace period' },
  relationships: {
    metrics: {
      incoming_txns: 32,
      outgoing_txns: 18,
      n_customers: 14,
      n_repeat_customers: 3,
      n_regular_customers: 3,
      repeat_revenue_share: 0.62,
      customer_regularity: 0.71,
      n_suppliers: 2,
      n_regular_suppliers: 2,
      supplier_stability: 0.7,
      hhi: 0.21,
      top_customer_share: 0.28,
      concentration_risk: false,
    },
    customers: [
      { counterparty: 'c1', name: 'Regular customer', txns: 8, total_amount: 22000, tenure_months: 8, regularity: 0.88, recurring: true },
      { counterparty: 'c2', name: 'Nearby hostel', txns: 6, total_amount: 18000, tenure_months: 6, regularity: 0.8, recurring: true },
    ],
    suppliers: [
      { counterparty: 's1', name: 'Wholesale supplier', txns: 10, total_amount: 110000, tenure_months: 10, regularity: 0.93, recurring: true },
    ],
  },
  why: 'You have steady support from your community and early signs of paying on time. Add a few more records and your score will climb.',
  season: { lean_score: 628, current_score: 712, boom_score: 806 },
  cashflow: [
    { label: 'Slow month', amount_npr: 84000, score: 628 },
    { label: 'Typical', amount_npr: 126000, score: 712 },
    { label: 'Good month', amount_npr: 188000, score: 806 },
  ],
};

export const mockMerchant = {
  initials: 'AS',
  name: 'Asha Store',
  owner: 'Asha',
  business: 'Kirana shop',
  city: 'Bhaktapur',
  since: '2019',
};

export const mockTimeline = [
  { title: 'Electricity bill paid on time.', date: 'Today' },
  { title: 'Wholesale supplier vouched for your store.', date: 'Yesterday' },
  { title: 'QR sales stayed steady this month.', date: '3 days ago' },
  { title: 'Voice check ready in Nepali with typed fallback.', date: '1 week ago' },
  { title: 'A regular customer paid through QR.', date: '2 weeks ago' },
  { title: 'Internet bill receipt uploaded.', date: '2 weeks ago' },
  { title: 'Inventory restock recorded with supplier.', date: '3 weeks ago' },
  { title: 'Monthly cashflow pattern refreshed.', date: 'Last month' },
];

export const mockQuestions = [
  {
    text_ne: 'तपाईंको पसलमा व्यस्त हप्ता आउँदैछ। आपूर्तिकर्ताले उधारोमा थप सामान दिन्छन्। तपाईं के गर्नुहुन्छ?',
    text_en: 'Your busiest week is coming. A supplier offers extra stock on credit. What do you do?',
    chips: [
      ['Take only what I can sell', 'बेच्न सक्ने जति मात्र लिन्छु'],
      ['Take the full offer', 'मौका नछुटोस् भनेर सबै लिन्छु'],
      ["Check last year's sales first", 'गत वर्षको बिक्री हेरेर निर्णय गर्छु'],
    ],
  },
];

export function useMockPassport() {
  return mockPassport;
}
