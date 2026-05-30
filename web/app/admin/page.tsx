"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  Gauge,
  Network,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";
import type { AdminMerchantRow } from "@/types/admin";

const metricCards = [
  {
    key: "total_merchants",
    label: "Total merchants",
    description: "All merchants visible to the operator console.",
    icon: Store,
  },
  {
    key: "anchors",
    label: "Anchor merchants",
    description: "Highly trusted merchants used as network references.",
    icon: BadgeCheck,
  },
  {
    key: "avg_score",
    label: "Average trust score",
    description: "Mean score across merchants with scoring evidence.",
    icon: Gauge,
  },
  {
    key: "fraud_flagged",
    label: "High risk flagged",
    description: "Merchants requiring fraud or anomaly review.",
    icon: AlertTriangle,
  },
  {
    key: "pending_kyc",
    label: "Pending KYC",
    description: "Submitted KYC cases still waiting on a decision.",
    icon: ShieldCheck,
  },
  {
    key: "scored",
    label: "Scored merchants",
    description: "Merchants with an active trust score.",
    icon: Users,
  },
] as const;

const workspaceLinks = [
  { label: "Review KYC", href: "/admin/kyc", icon: FileCheck2, copy: "Approve, reject, and compare extracted identity signals." },
  { label: "Risk queue", href: "/admin/risk", icon: AlertTriangle, copy: "Sort high-risk merchants by score, KYC state, and warning signals." },
  { label: "Network map", href: "/admin/network", icon: Network, copy: "Inspect anchors, vouches, and relationship strength." },
] as const;

export default function AdminOverviewPage() {
  const { stats, merchants, details } = useAppSelector((state) => state.admin);
  const detailRows = Object.values(details);
  const reviewQueue = merchants
    .filter((merchant) => merchant.fraud_risk !== "LOW" || merchant.kyc_status === "pending")
    .sort((a, b) => riskRank(b.fraud_risk) - riskRank(a.fraud_risk) || a.score - b.score)
    .slice(0, 4);
  const totalTransactions = detailRows.reduce((sum, item) => sum + item.counts.transactions, 0);
  const totalVouches = detailRows.reduce((sum, item) => sum + item.counts.vouches_in + item.counts.vouches_out, 0);
  const recentInflow = detailRows.reduce(
    (sum, item) => sum + (item.transactions ?? []).filter((txn) => txn.direction === "in").reduce((txnSum, txn) => txnSum + Number(txn.amount ?? 0), 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-[#20251f] bg-[#111613] text-white shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div>
            <p className="text-sm font-medium text-emerald-300">Operator snapshot</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Admin overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Track merchant trust health, review identity work, and jump into risk decisions from one console.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/admin/merchants"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-[transform,background-color] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98]"
              >
                Review merchants <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/admin/risk"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-out hover:bg-white/10 active:scale-[0.98]"
              >
                Open risk queue
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <HeroStat label="Recent inflow" value={formatMoney(recentInflow)} />
            <HeroStat label="Transactions monitored" value={String(totalTransactions)} />
            <HeroStat label="Relationship signals" value={String(totalVouches)} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map(({ key, label, description, icon: Icon }) => (
          <Card key={key} className="bg-card/90 shadow-[0_10px_28px_rgba(0,0,0,0.04)]">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {key === "avg_score" ? `${stats[key]}/100` : stats[key]}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card className="shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Portfolio posture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ScoreBand label="Healthy score coverage" value={stats.scored} total={stats.total_merchants} />
            <ScoreBand label="Verified identity coverage" value={merchants.filter((m) => m.kyc_status === "verified").length} total={stats.total_merchants} />
            <ScoreBand label="Anchor network coverage" value={stats.anchors} total={stats.total_merchants} />
            <div className="grid gap-3 pt-2 md:grid-cols-3">
              <PostureBlock label="Average score" value={`${stats.avg_score}/100`} detail="Mean score across scored merchants." />
              <PostureBlock label="Review load" value={`${stats.pending_kyc + stats.fraud_flagged}`} detail="Pending KYC plus high-risk merchants." />
              <PostureBlock label="Coverage" value={`${stats.scored}/${stats.total_merchants}`} detail="Merchants with active score evidence." />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Attention queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewQueue.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No merchants need attention right now.</p>
            ) : (
              reviewQueue.map((merchant) => (
                <Link
                  key={merchant.id}
                  href={`/admin/merchants/${merchant.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 transition-[background-color,transform,border-color] duration-150 ease-out hover:border-primary/30 hover:bg-accent active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{merchant.name}</div>
                    <div className="text-xs text-muted-foreground">{merchant.score}/100 score - {merchant.business_type}</div>
                  </div>
                  <Badge variant={merchant.fraud_risk === "HIGH" ? "destructive" : "outline"}>{merchant.fraud_risk}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {workspaceLinks.map(({ label, href, icon: Icon, copy }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-lg border border-border bg-card p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-[border-color,background-color,transform,box-shadow] duration-150 ease-out hover:border-primary/30 hover:bg-accent/30 hover:shadow-[0_16px_42px_rgba(0,0,0,0.07)] active:scale-[0.995]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
            </div>
            <div className="mt-5 text-base font-semibold">{label}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.06] px-4 py-3">
      <span className="text-sm text-white/65">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function ScoreBand({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}/{total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function PostureBlock({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function riskRank(risk: AdminMerchantRow["fraud_risk"]) {
  if (risk === "HIGH") return 3;
  if (risk === "MEDIUM") return 2;
  return 1;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(value);
}
