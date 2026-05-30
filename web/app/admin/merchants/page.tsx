"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, BadgeCheck, ChevronRight, Search, ShieldCheck, Store, TrendingUp, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAdminFilter, setAdminSearch, type AdminMerchantFilter } from "@/store/slices/adminSlice";
import type { AdminMerchantRow, FraudRisk } from "@/types/admin";

const fraudVariant: Record<FraudRisk, "secondary" | "outline" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "destructive",
};

function kycVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (status === "verified") return "default";
  if (status === "pending") return "outline";
  if (status === "rejected") return "destructive";
  return "secondary";
}

export default function AdminMerchantsPage() {
  const dispatch = useAppDispatch();
  const { merchants: rows, search: q, filter } = useAppSelector((state) => state.admin);

  const searchedRows = rows.filter((merchant) => {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    return [merchant.id, merchant.name, merchant.business_type, merchant.kyc_status, merchant.fraud_risk]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const visibleRows = searchedRows.filter((merchant) => {
    if (filter === "review") return merchant.fraud_risk !== "LOW" || merchant.kyc_status === "pending";
    if (filter === "anchor") return merchant.is_anchor;
    return true;
  });
  const reviewCount = searchedRows.filter((merchant) => merchant.fraud_risk !== "LOW" || merchant.kyc_status === "pending").length;
  const avgScore = searchedRows.length ? Math.round(searchedRows.reduce((sum, merchant) => sum + merchant.score, 0) / searchedRows.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Merchants</h1>
          <p className="mt-1 text-sm text-muted-foreground">{searchedRows.length} total - open any merchant for score history, transactions, KYC, and network context.</p>
        </div>
        <label className="flex h-10 w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
          <Search className="size-4 text-muted-foreground" />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Search by name or id..."
            value={q}
            onChange={(e) => dispatch(setAdminSearch(e.target.value))}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={Store} label="Visible merchants" value={String(visibleRows.length)} />
        <Metric icon={AlertTriangle} label="Needs review" value={String(reviewCount)} />
        <Metric icon={TrendingUp} label="Average score" value={String(avgScore)} />
        <Metric icon={ShieldCheck} label="Verified KYC" value={String(searchedRows.filter((m) => m.kyc_status === "verified").length)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All merchants"],
          ["review", "Needs review"],
          ["anchor", "Anchors"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => dispatch(setAdminFilter(value as AdminMerchantFilter))}
            className={`h-9 rounded-lg border px-3 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out ${
              filter === value
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleRows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No merchants match this view.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {visibleRows.map((merchant) => (
            <MerchantRow key={merchant.id} merchant={merchant} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function MerchantRow({ merchant }: { merchant: AdminMerchantRow }) {
  const scoreWidth = Math.max(8, Math.min(100, merchant.score));

  return (
    <Link
      href={`/admin/merchants/${merchant.id}`}
      className="group grid gap-4 rounded-lg border border-border bg-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-[border-color,background-color,transform,box-shadow] duration-150 ease-out hover:border-primary/35 hover:bg-accent/35 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] active:scale-[0.995] md:grid-cols-[minmax(240px,1fr)_160px_160px_120px_24px]"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-semibold">{merchant.name ?? merchant.id}</span>
          {merchant.is_anchor ? <BadgeCheck className="size-4 shrink-0 text-primary" /> : null}
        </div>
        <div className="mt-1 truncate text-sm text-muted-foreground">{merchant.business_type ?? "Unknown business"} - {merchant.id}</div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Trust score</span>
          <span>{Math.round(merchant.confidence * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${scoreColor(merchant.score)}`} style={{ width: `${scoreWidth}%` }} />
        </div>
        <div className="mt-1 text-sm font-semibold">{merchant.score}/100</div>
      </div>

      <div className="flex items-center gap-2 md:justify-center">
        <Badge variant={kycVariant(merchant.kyc_status)}>{merchant.kyc_status ?? "none"}</Badge>
        <Badge variant={fraudVariant[merchant.fraud_risk]}>{merchant.fraud_risk}</Badge>
      </div>

      <div className="flex items-center gap-1 text-sm font-medium text-primary md:justify-end">
        Open <ArrowUpRight className="size-4" />
      </div>

      <ChevronRight className="hidden size-5 self-center text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 md:block" />
    </Link>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-primary";
  if (score >= 60) return "bg-amber-500";
  return "bg-destructive";
}
