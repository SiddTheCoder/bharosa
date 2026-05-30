"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";
import type { AdminMerchantSignal } from "@/types/admin";

export default function AdminRiskPage() {
  const { merchants, details } = useAppSelector((state) => state.admin);
  const risky = merchants
    .filter((merchant) => merchant.fraud_risk !== "LOW" || merchant.score < 65 || merchant.kyc_status !== "verified")
    .sort((a, b) => riskRank(b.fraud_risk) - riskRank(a.fraud_risk) || a.score - b.score);
  const highRisk = merchants.filter((merchant) => merchant.fraud_risk === "HIGH").length;
  const mediumRisk = merchants.filter((merchant) => merchant.fraud_risk === "MEDIUM").length;
  const lowScore = merchants.filter((merchant) => merchant.score < 60).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Risk operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Risk queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Prioritized merchants with score, identity, and behavior signals that need closer inspection.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RiskMetric label="High risk" value={highRisk} icon={ShieldAlert} />
        <RiskMetric label="Medium risk" value={mediumRisk} icon={AlertTriangle} />
        <RiskMetric label="Low score" value={lowScore} icon={TrendingDown} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Prioritized cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risky.map((merchant) => {
              const detail = details[merchant.id];
              const dangerSignals = (detail?.signals ?? []).filter((signal) => signal.sentiment === "danger" || signal.sentiment === "warning");
              return (
                <Link
                  key={merchant.id}
                  href={`/admin/merchants/${merchant.id}`}
                  className="group grid gap-4 rounded-lg border border-border bg-background p-4 transition-[border-color,background-color,transform] duration-150 ease-out hover:border-primary/30 hover:bg-accent/35 active:scale-[0.995] md:grid-cols-[1fr_140px_160px_24px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{merchant.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{merchant.business_type} - {dangerSignals.length} warning signals</div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Score</span>
                      <span>{Math.round(merchant.confidence * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${scoreColor(merchant.score)}`} style={{ width: `${merchant.score}%` }} />
                    </div>
                    <div className="mt-1 text-sm font-semibold">{merchant.score}/100</div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-center">
                    <Badge variant={merchant.fraud_risk === "HIGH" ? "destructive" : "outline"}>{merchant.fraud_risk}</Badge>
                    <Badge variant={merchant.kyc_status === "rejected" ? "destructive" : merchant.kyc_status === "pending" ? "outline" : "secondary"}>{merchant.kyc_status ?? "none"}</Badge>
                  </div>
                  <ArrowRight className="hidden size-4 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 md:block" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Signal watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risky.slice(0, 4).map((merchant) => (
              <SignalBundle key={merchant.id} name={merchant.name ?? merchant.id} signals={details[merchant.id]?.signals ?? []} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RiskMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof ShieldAlert }) {
  return (
    <Card className="shadow-[0_10px_28px_rgba(0,0,0,0.04)]">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold">{value}</div>
        </div>
        <span className="flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function SignalBundle({ name, signals }: { name: string; signals: AdminMerchantSignal[] }) {
  const watchSignals = signals.filter((signal) => signal.sentiment === "danger" || signal.sentiment === "warning").slice(0, 3);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="truncate text-sm font-semibold">{name}</div>
      <div className="mt-3 space-y-2">
        {watchSignals.length ? watchSignals.map((signal) => (
          <div key={signal.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{signal.label}</span>
            <Badge variant={signal.sentiment === "danger" ? "destructive" : "outline"}>{signal.value}</Badge>
          </div>
        )) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="size-4 text-primary" /> No active warnings
          </div>
        )}
      </div>
    </div>
  );
}

function riskRank(risk: string) {
  if (risk === "HIGH") return 3;
  if (risk === "MEDIUM") return 2;
  return 1;
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-primary";
  if (score >= 60) return "bg-amber-500";
  return "bg-destructive";
}
