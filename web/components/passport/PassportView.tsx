"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowUpRight, CheckCircle2, Download, FileText, Landmark, Loader2, Mic, Receipt, Repeat, ShieldAlert, ShieldCheck, Sparkles, Store, Table2, Truck, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreGauge } from "@/components/passport/ScoreGauge";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBills, setBillsStatus, type Bill } from "@/store/slices/billsSlice";
import type { CounterpartyStat, Passport, Relationships } from "@/types/passport";

export const fallbackPassport: Passport = {
  merchant_id: "me",
  merchant_name: "Bharosa Merchant",
  score: 712,
  confidence: 0.74,
  interval: { p5: 628, p50: 712, p95: 806 },
  fraud_risk: "LOW",
  evidence: [
    { source: "social", label: "2 trusted businesses vouched for you", impact: 42, action_type: "vouch" },
    { source: "behavior", label: "5 of 6 utility bills paid on time", impact: 30, action_type: "bill" },
    { source: "behavior", label: "Steady QR sales every month", impact: 22, action_type: "qr" },
    { source: "psychometric", label: "Completed the business interview", impact: 18, action_type: "interview" }
  ],
  next_steps: [
    "Finish your KYC verification to prove who you are",
    "Ask two trusted businesses you work with to vouch for you",
    "Pay one regular bill (like electricity) on time"
  ],
  loan: { amount_npr: 120000, schedule_note: "Pay back weekly, with a 2-week grace period" },
  relationships: {
    metrics: {
      incoming_txns: 32, outgoing_txns: 18, n_customers: 14, n_repeat_customers: 3,
      n_regular_customers: 3, repeat_revenue_share: 0.62, customer_regularity: 0.71,
      n_suppliers: 2, n_regular_suppliers: 2, supplier_stability: 0.7, hhi: 0.21,
      top_customer_share: 0.28, concentration_risk: false
    },
    customers: [
      { counterparty: "c1", name: "Regular customer", txns: 8, total_amount: 22000, tenure_months: 8, regularity: 0.88, recurring: true },
      { counterparty: "c2", name: "Nearby hostel", txns: 6, total_amount: 18000, tenure_months: 6, regularity: 0.8, recurring: true }
    ],
    suppliers: [
      { counterparty: "s1", name: "Wholesale supplier", txns: 10, total_amount: 110000, tenure_months: 10, regularity: 0.93, recurring: true }
    ]
  },
  why: "You have steady support from your community and early signs of paying on time. Add a few more records and your score will climb."
};

const EMPTY_RELATIONSHIPS: Relationships = {
  metrics: {
    incoming_txns: 0, outgoing_txns: 0, n_customers: 0, n_repeat_customers: 0,
    n_regular_customers: 0, repeat_revenue_share: 0, customer_regularity: 0,
    n_suppliers: 0, n_regular_suppliers: 0, supplier_stability: 0, hhi: 0,
    top_customer_share: 0, concentration_risk: false
  },
  customers: [],
  suppliers: []
};

function num(v: unknown, d: number): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : d;
}
function str(v: unknown, d: string): string {
  return typeof v === "string" && v ? v : d;
}
function bool(v: unknown, d: boolean): boolean {
  return typeof v === "boolean" ? v : d;
}

function normalizeCounterparties(input: unknown): CounterpartyStat[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return {
      counterparty: str(c.counterparty, ""),
      name: str(c.name, "Unknown"),
      txns: num(c.txns, 0),
      total_amount: num(c.total_amount, 0),
      tenure_months: num(c.tenure_months, 0),
      regularity: num(c.regularity, 0),
      recurring: bool(c.recurring, false)
    };
  });
}

function normalizeRelationships(input: unknown): Relationships {
  if (!input || typeof input !== "object") return EMPTY_RELATIONSHIPS;
  const raw = input as Record<string, unknown>;
  const m = (raw.metrics && typeof raw.metrics === "object" ? raw.metrics : {}) as Record<string, unknown>;
  const z = EMPTY_RELATIONSHIPS.metrics;
  return {
    metrics: {
      incoming_txns: num(m.incoming_txns, z.incoming_txns),
      outgoing_txns: num(m.outgoing_txns, z.outgoing_txns),
      n_customers: num(m.n_customers, z.n_customers),
      n_repeat_customers: num(m.n_repeat_customers, z.n_repeat_customers),
      n_regular_customers: num(m.n_regular_customers, z.n_regular_customers),
      repeat_revenue_share: num(m.repeat_revenue_share, z.repeat_revenue_share),
      customer_regularity: num(m.customer_regularity, z.customer_regularity),
      n_suppliers: num(m.n_suppliers, z.n_suppliers),
      n_regular_suppliers: num(m.n_regular_suppliers, z.n_regular_suppliers),
      supplier_stability: num(m.supplier_stability, z.supplier_stability),
      hhi: num(m.hhi, z.hhi),
      top_customer_share: num(m.top_customer_share, z.top_customer_share),
      concentration_risk: bool(m.concentration_risk, z.concentration_risk)
    },
    customers: normalizeCounterparties(raw.customers),
    suppliers: normalizeCounterparties(raw.suppliers)
  };
}

/**
 * Map the backend passport (flat probabilities, `recommended_loan`, 0–100
 * confidence, `evidence[].value`) into the frontend `Passport` shape. Missing
 * fields fall back to the demo passport so partial/socket updates never crash.
 */
export function normalizePassport(input: unknown): Passport {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const fb = fallbackPassport;

  const rawConf = num(raw.confidence, Number.NaN);
  const confidence = Number.isNaN(rawConf) ? fb.confidence : rawConf > 1 ? rawConf / 100 : rawConf;
  const score = num(raw.score, fb.score);

  const toScore = (p: number) => Math.round(Math.max(0, Math.min(1, p)) * 1000);
  const p5 = num(raw.p5, Number.NaN);
  const p95 = num(raw.p95, Number.NaN);
  const interval =
    raw.interval && typeof raw.interval === "object"
      ? (raw.interval as Passport["interval"])
      : !Number.isNaN(p5) && !Number.isNaN(p95)
      ? { p5: toScore(p5), p50: score, p95: toScore(p95) }
      : fb.interval;

  const rawEvidence = Array.isArray(raw.evidence) ? raw.evidence : [];
  const evidence = rawEvidence.length
    ? rawEvidence.map((item) => {
        const e = (item ?? {}) as Record<string, unknown>;
        return { source: str(e.source, "Signal"), label: str(e.label, ""), impact: num(e.impact, Math.round(num(e.value, 0) * 100)), action_type: str(e.action_type, "") };
      })
    : fb.evidence;

  const loanObj = raw.loan && typeof raw.loan === "object" ? (raw.loan as Record<string, unknown>) : null;
  const loan = loanObj
    ? { amount_npr: num(loanObj.amount_npr, fb.loan.amount_npr), schedule_note: str(loanObj.schedule_note, fb.loan.schedule_note) }
    : { amount_npr: num(raw.recommended_loan, fb.loan.amount_npr), schedule_note: str(raw.schedule_note, fb.loan.schedule_note) };

  const fr = str(raw.fraud_risk, fb.fraud_risk);
  const fraud_risk: Passport["fraud_risk"] = fr === "HIGH" || fr === "MEDIUM" || fr === "LOW" ? fr : fb.fraud_risk;

  return {
    merchant_id: str(raw.merchant_id, fb.merchant_id),
    merchant_name: str(raw.merchant_name, fb.merchant_name),
    score,
    confidence,
    interval,
    fraud_risk,
    evidence,
    next_steps: Array.isArray(raw.next_steps) && raw.next_steps.length ? (raw.next_steps as string[]) : fb.next_steps,
    loan,
    relationships: "relationships" in raw ? normalizeRelationships(raw.relationships) : EMPTY_RELATIONSHIPS,
    why: str(raw.why, fb.why)
  };
}

const TIERS = [
  { min: 800, label: "Established", headline: "Strong credit story", blurb: "Well-proven repayment and business signals." },
  { min: 650, label: "Growing", headline: "Steady and trusted", blurb: "Good enough to support a small working-capital review." },
  { min: 450, label: "Starter", headline: "Early trust profile", blurb: "Some useful signals, with room to add records." },
  { min: 0, label: "Building", headline: "Needs more records", blurb: "Add bills, sales, and vouches to build confidence." }
] as const;

function tierOf(score: number) {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

// The real signals the app tracks — shown to the merchant as plain "trust factors".
const FACTORS = [
  {
    key: "vouch",
    icon: Users,
    name: "Community vouches",
    hint: "Ask trusted businesses you work with to vouch for you.",
    match: (a: string, t: string) => a === "vouch" || a === "guarantee" || /vouch|anchor|guarantee/.test(t)
  },
  {
    key: "bill",
    icon: Receipt,
    name: "On-time bill payments",
    hint: "Pay electricity, water or internet bills on time.",
    match: (a: string, t: string) => a === "bill" || /bill|utility|electricit|water|internet/.test(t)
  },
  {
    key: "sales",
    icon: Store,
    name: "Monthly sales (QR)",
    hint: "Accept QR payments so we can see steady sales.",
    match: (a: string, t: string) => a === "qr" || a === "airtime" || /qr|revenue|sales|airtime|transaction/.test(t)
  },
  {
    key: "interview",
    icon: Mic,
    name: "Business interview",
    hint: "Answer a few simple questions about your business.",
    match: (a: string, t: string) => a === "interview" || /interview|psychometric|voice|response/.test(t)
  }
] as const;

function factorState(passport: Passport, factor: (typeof FACTORS)[number]) {
  const matched = passport.evidence.find((e) =>
    factor.match((e.action_type ?? "").toLowerCase(), `${e.label} ${e.source}`.toLowerCase())
  );
  if (!matched) {
    return { strength: 0, status: "Not started", tone: "muted" as const, detail: factor.hint };
  }
  const strength = Math.max(0, Math.min(100, Math.round((matched.impact + 100) / 2)));
  const status =
    matched.impact <= 0 ? "Needs work" : strength >= 75 ? "Strong" : strength >= 55 ? "Good" : "Getting there";
  const tone = matched.impact <= 0 ? ("bad" as const) : strength >= 55 ? ("good" as const) : ("ok" as const);
  return { strength, status, tone, detail: matched.label };
}

function stepHref(step: string) {
  const text = step.toLowerCase();
  if (/kyc|verify|identity/.test(text)) return "/kyc";
  if (/bill|electricity|water|internet/.test(text)) return "/bills";
  if (/interview|voice|question/.test(text)) return "/me";
  return "/records";
}

function stepAction(step: string) {
  const text = step.toLowerCase();
  if (/kyc|verify|identity/.test(text)) return "Start KYC";
  if (/bill|electricity|water|internet/.test(text)) return "Add bill";
  if (/interview|voice|question/.test(text)) return "Answer";
  if (/vouch|business/.test(text)) return "Request vouch";
  return "Add record";
}

function riskLabel(risk: Passport["fraud_risk"]) {
  if (risk === "HIGH") return "Needs review";
  if (risk === "MEDIUM") return "Medium risk";
  return "Low risk";
}

function formatDateTime(iso: string | null) {
  if (!iso) return "Not recorded";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function cleanCsv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function wrapPdfLine(text: string, max = 92) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makeSimplePdf(lines: string[]) {
  const pageLines: string[][] = [];
  const chunkSize = 42;
  for (let i = 0; i < lines.length; i += chunkSize) pageLines.push(lines.slice(i, i + chunkSize));

  const objects: string[] = [];
  const pageIds: number[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  for (const page of pageLines) {
    const stream = `BT /F1 9 Tf 50 790 Td 12 TL ${page.map((line) => `(${escapePdf(line)}) Tj T*`).join(" ")} ET`;
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function exportRows(passport: Passport, bills: Bill[]) {
  const rows = [
    ["Section", "Record type", "Description", "Amount NPR", "Status", "Recorded or uploaded", "Source or proof"],
    ["Summary", "Trust score", `${passport.score}/1000`, "", riskLabel(passport.fraud_risk), new Date().toLocaleString(), "Bharosa trust passport"],
    ["Summary", "Likely range", `${passport.interval.p5}-${passport.interval.p95}`, "", `${Math.round(passport.confidence * 100)}% confidence`, new Date().toLocaleString(), "Score model"],
    ["Summary", "Pre-qualified amount", "Working-capital limit for review", passport.loan.amount_npr.toLocaleString(), passport.loan.schedule_note, new Date().toLocaleString(), "Bharosa trust passport"],
    ...passport.evidence.map((item) => [
      "Score drivers",
      item.action_type || item.source,
      item.label,
      "",
      item.impact >= 0 ? `Positive impact +${item.impact}` : `Negative impact ${item.impact}`,
      "Model generated",
      item.source
    ]),
    ...bills.map((bill) => [
      "Uploaded records",
      `${bill.kind} bill`,
      bill.on_time ? "Paid on time" : "Paid late",
      bill.amount.toLocaleString(),
      bill.on_time ? "On time" : "Late",
      formatDateTime(bill.date),
      bill.receipt_uri ? `Receipt file: ${bill.receipt_uri}` : "No receipt attached"
    ])
  ];
  if (!bills.length) {
    rows.push(["Uploaded records", "Bill uploads", "No uploaded bill records found in this session", "", "", "", ""]);
  }
  return rows;
}

function ExportCard({ passport, bills, loading }: { passport: Passport; bills: Bill[]; loading: boolean }) {
  const rows = useMemo(() => exportRows(passport, bills), [passport, bills]);
  const filenameBase = `bharosa-bank-record-${passport.merchant_id || "merchant"}`;

  function downloadCsv() {
    downloadBlob(`${filenameBase}.csv`, "text/csv;charset=utf-8", rows.map((row) => row.map(cleanCsv).join(",")).join("\n"));
  }

  function downloadPdf() {
    const lines = rows.flatMap((row, index) => {
      if (index === 0) return ["BHAROSA BANK REVIEW RECORD", `Generated: ${new Date().toLocaleString()}`, ""];
      return wrapPdfLine(row.filter(Boolean).join(" | "));
    });
    downloadBlob(`${filenameBase}.pdf`, "application/pdf", makeSimplePdf(lines));
  }

  return (
    <Card className="glass">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2"><Download className="size-5 text-primary" /> Bank export</CardTitle>
        <p className="text-sm text-muted-foreground">Score summary, uploaded bills, timestamps, and proof references.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <Button className="w-full" onClick={downloadPdf} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <FileText />} Download PDF
        </Button>
        <Button className="w-full" variant="outline" onClick={downloadCsv} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Table2 />} Download CSV
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">CSV is best for bank review systems. PDF is a readable summary for sharing.</p>
      </CardContent>
    </Card>
  );
}

const TONE_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  good: "default",
  ok: "secondary",
  bad: "destructive",
  muted: "outline"
};

function npr(value: number) {
  return `NPR ${Math.round(value).toLocaleString()}`;
}

function CounterpartyRow({ stat }: { stat: CounterpartyStat }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium">{stat.name}</p>
          {stat.recurring ? (
            <Badge variant="default" className="gap-1 px-1.5 py-0 text-[0.65rem]"><Repeat className="size-3" /> Recurring</Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {stat.txns} payment{stat.txns === 1 ? "" : "s"} · over {stat.tenure_months} mo
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{npr(stat.total_amount)}</span>
    </div>
  );
}

function RelationshipsCard({ relationships }: { relationships: Relationships }) {
  const { metrics: m, customers, suppliers } = relationships;
  const hasData = m.n_customers > 0 || m.n_suppliers > 0;
  const repeatPct = Math.round(m.repeat_revenue_share * 100);

  return (
    <Card className="glass">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" /> Customers &amp; suppliers</CardTitle>
        <p className="text-sm text-muted-foreground">Repeat buyers and a real supply chain show a stable, operating business.</p>
      </CardHeader>

      {!hasData ? (
        <CardContent className="p-5">
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              No customer or supplier payments yet. Record QR payments from buyers and payments to your suppliers to unlock this signal.
            </p>
            <Button asChild size="sm" variant="outline"><Link href="/records">Record a payment <ArrowUpRight /></Link></Button>
          </div>
        </CardContent>
      ) : (
        <CardContent className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Repeat customers</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{m.n_repeat_customers}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{repeatPct}% of revenue recurs</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Regular suppliers</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{m.n_regular_suppliers}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">restocking ties</p>
            </div>
            <div className="col-span-2 rounded-lg border border-border p-3 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Revenue concentration</p>
              {m.concentration_risk ? (
                <Badge variant="destructive" className="mt-1.5 gap-1"><ShieldAlert className="size-3.5" /> {Math.round(m.top_customer_share * 100)}% on one buyer</Badge>
              ) : (
                <Badge variant="outline" className="mt-1.5 gap-1"><CheckCircle2 className="size-3.5" /> Well spread</Badge>
              )}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-1 flex items-center gap-2 text-sm font-medium"><Store className="size-4 text-primary" /> Top customers</p>
              {customers.length ? (
                <div className="divide-y divide-border">
                  {customers.map((c) => <CounterpartyRow key={c.counterparty} stat={c} />)}
                </div>
              ) : (
                <p className="py-3 text-sm text-muted-foreground">No customer payments recorded yet.</p>
              )}
            </div>
            <div className="md:border-l md:border-border md:pl-5">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium"><Truck className="size-4 text-primary" /> Top suppliers</p>
              {suppliers.length ? (
                <div className="divide-y divide-border">
                  {suppliers.map((s) => <CounterpartyRow key={s.counterparty} stat={s} />)}
                </div>
              ) : (
                <p className="py-3 text-sm text-muted-foreground">No supplier payments recorded yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function PassportView({ passport }: { passport: Passport }) {
  const { idToken } = useAuth();
  const dispatch = useAppDispatch();
  const { items: bills, status: billsStatus } = useAppSelector((state) => state.bills);
  const tier = tierOf(passport.score);
  const steps = passport.next_steps.length
    ? passport.next_steps
    : ["You're at the top — just keep paying on time and staying active."];
  const confidencePct = Math.round(passport.confidence * 100);
  const billsLoading = billsStatus === "idle" || billsStatus === "loading";

  useEffect(() => {
    if (!idToken || billsStatus !== "idle") return;
    dispatch(setBillsStatus("loading"));
    apiGet<{ bills: Bill[] }>("/me/bills", idToken)
      .then((res) => dispatch(setBills(res.bills ?? [])))
      .catch(() => dispatch(setBillsStatus("error")));
  }, [billsStatus, dispatch, idToken]);

  return (
    <div className="space-y-5">
      <Card className="glass">
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:p-6">
          <div className="mx-auto w-full max-w-[200px] md:max-w-[240px]">
            <ScoreGauge score={passport.score} confidence={passport.confidence} />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1"><Sparkles className="size-3.5" /> {tier.label}</Badge>
              <Badge variant={passport.fraud_risk === "HIGH" ? "destructive" : "outline"} className="gap-1">
                <ShieldCheck className="size-3.5" /> {riskLabel(passport.fraud_risk)}
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-tight md:text-3xl">{tier.headline}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{tier.blurb}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Likely range</p>
                <p className="mt-1 font-semibold">{passport.interval.p5}-{passport.interval.p95}</p>
              </div>
              <div className="border-l border-border pl-3">
                <p className="text-xs font-medium text-muted-foreground">Confidence</p>
                <p className="mt-1 font-semibold">{confidencePct}%</p>
              </div>
              <div className="border-l border-border pl-3">
                <p className="text-xs font-medium text-muted-foreground">Records</p>
                <p className="mt-1 font-semibold">{passport.evidence.length + bills.length}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center border-border pt-5 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Landmark className="size-4" /> Pre-qualified
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">NPR {passport.loan.amount_npr.toLocaleString()}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{passport.loan.schedule_note}</p>
            <Button asChild className="mt-4 w-full">
              <Link href="/records">Add record <ArrowUpRight /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="glass">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-primary" /> Score drivers</CardTitle>
            <p className="text-sm text-muted-foreground">What a bank would review first.</p>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {FACTORS.map((factor) => {
              const { strength, status, tone, detail } = factorState(passport, factor);
              const Icon = factor.icon;
              return (
                <div key={factor.key} className="grid gap-3 p-4 sm:grid-cols-[1fr_180px] sm:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{factor.name}</p>
                        <Badge variant={TONE_BADGE[tone]}>{status}</Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Strength</span>
                      <span>{strength}%</span>
                    </div>
                    <Progress className="h-2" value={strength} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="glass">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-primary" /> Next best actions</CardTitle>
              <p className="text-sm text-muted-foreground">Small steps that make the score more lender-ready.</p>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {steps.map((step, i) => (
                <div key={step} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-6">{step}</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link href={stepHref(step)}>{stepAction(step)} <ArrowUpRight /></Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <ExportCard passport={passport} bills={bills} loading={billsLoading && !!idToken} />
        </div>
      </div>

      <RelationshipsCard relationships={passport.relationships} />
    </div>
  );
}
