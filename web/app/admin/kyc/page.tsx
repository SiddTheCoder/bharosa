"use client";

import Link from "next/link";
import { ArrowRight, Check, FileCheck2, Search, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateAdminKycDecision } from "@/store/slices/adminSlice";

export default function AdminKycPage() {
  const dispatch = useAppDispatch();
  const { merchants, details } = useAppSelector((state) => state.admin);
  const rows = merchants
    .map((merchant) => ({ merchant, detail: details[merchant.id] }))
    .sort((a, b) => statusRank(a.merchant.kyc_status) - statusRank(b.merchant.kyc_status));
  const pending = rows.filter(({ merchant }) => merchant.kyc_status === "pending").length;
  const verified = rows.filter(({ merchant }) => merchant.kyc_status === "verified").length;
  const rejected = rows.filter(({ merchant }) => merchant.kyc_status === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Identity operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">KYC review</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review submitted identity evidence and resolve pending merchant verification.</p>
        </div>
        <label className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm shadow-sm">
          <Search className="size-4 text-muted-foreground" />
          <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Search queue..." />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <QueueMetric label="Pending decision" value={pending} tone="warning" />
        <QueueMetric label="Verified merchants" value={verified} tone="success" />
        <QueueMetric label="Rejected cases" value={rejected} tone="danger" />
      </div>

      <Card className="shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileCheck2 className="size-4 text-primary" /> Review queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map(({ merchant, detail }) => {
            const confidence = detail?.kyc?.confidence != null ? `${Math.round(detail.kyc.confidence * 100)}%` : "n/a";
            return (
              <div key={merchant.id} className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_150px_160px_220px] md:items-center">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{merchant.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{detail?.user?.name ?? "Unknown owner"} - {merchant.business_type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Document confidence</div>
                  <div className="mt-1 font-semibold">{confidence}</div>
                </div>
                <Badge className="w-fit" variant={kycVariant(merchant.kyc_status)}>{merchant.kyc_status ?? "none"}</Badge>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {merchant.kyc_status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => dispatch(updateAdminKycDecision({ merchantId: merchant.id, decision: "verified" }))}>
                        <Check className="size-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => dispatch(updateAdminKycDecision({ merchantId: merchant.id, decision: "rejected" }))}>
                        <X className="size-4" /> Reject
                      </Button>
                    </>
                  ) : null}
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/admin/merchants/${merchant.id}`}>Open <ArrowRight className="size-4" /></Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueMetric({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" }) {
  const toneClass = {
    success: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
  }[tone];

  return (
    <Card className="shadow-[0_10px_28px_rgba(0,0,0,0.04)]">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold">{value}</div>
        </div>
        <span className={`flex size-11 items-center justify-center rounded-lg ${toneClass}`}>
          <ShieldCheck className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function kycVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (status === "verified") return "default";
  if (status === "pending") return "outline";
  if (status === "rejected") return "destructive";
  return "secondary";
}

function statusRank(status: string | null) {
  if (status === "pending") return 0;
  if (status === "rejected") return 1;
  if (status === "verified") return 2;
  return 3;
}
