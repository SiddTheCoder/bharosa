"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  FileCheck2,
  Gauge,
  Loader2,
  Network,
  ShieldCheck,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiBlobUrl, apiGet, apiPost } from "@/lib/api";
import { useAdmin } from "@/lib/admin";
import { isAdminMockEnabled, mockAdminMerchantDetail, mockAdminMerchantTransactions } from "@/lib/admin-mock";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAdminMerchantDetail, updateAdminKycDecision } from "@/store/slices/adminSlice";
import type {
  AdminMerchantDetail,
  AdminMerchantSignal,
  AdminMerchantTransactionsResponse,
  AdminScorePoint,
  AdminTransaction,
  AdminVouch,
} from "@/types/admin";

/** A KYC image streamed from the authed admin file endpoint and shown as a blob URL. */
function AdminImage({ fileUri, token, alt }: { fileUri: string; token: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const path = fileUri.startsWith("/") ? fileUri : `/admin/file/${fileUri}`;

  useEffect(() => {
    let revoked: string | null = null;
    apiBlobUrl(path, token).then((u) => { revoked = u; setUrl(u); }).catch(() => setUrl(null));
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [path, token]);

  if (!url) return <Skeleton className="h-40 w-full rounded-lg" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="h-40 w-full rounded-lg border border-border object-cover" />;
}

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const merchantId = params.id;
  const { token } = useAdmin();
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.admin.details[merchantId] ?? null);
  const [error, setError] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError(false);
    try {
      const detail = await apiGet<AdminMerchantDetail>(`/admin/merchants/${merchantId}`, token);
      let activity: AdminMerchantTransactionsResponse | null = null;
      try {
        activity = await apiGet<AdminMerchantTransactionsResponse>(`/admin/merchants/${merchantId}/transactions?limit=100`, token);
      } catch {
        activity = null;
      }
      dispatch(setAdminMerchantDetail({
        ...detail,
        transactions: activity?.transactions ?? detail.transactions ?? [],
        vouches: activity?.vouches ?? detail.vouches ?? [],
      }));
    } catch {
      if (!isAdminMockEnabled()) {
        setError(true);
        return;
      }
      const detail = mockAdminMerchantDetail(merchantId);
      const activity = mockAdminMerchantTransactions(merchantId);
      if (!detail) {
        setError(true);
        return;
      }
      dispatch(setAdminMerchantDetail({
        ...detail,
        transactions: activity?.transactions ?? detail.transactions ?? [],
        vouches: activity?.vouches ?? detail.vouches ?? [],
      }));
    }
  }, [token, merchantId, dispatch]);

  useEffect(() => {
    if (data || isAdminMockEnabled()) return;
    const timer = window.setTimeout(() => { load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [data, load]);

  async function decide(decision: "verified" | "rejected") {
    if (!token || !data?.kyc) return;
    setActing(true);
    try {
      await apiPost(
        `/admin/merchants/${merchantId}/kyc/${data.kyc.submission_id}/decision`,
        { decision },
        token
      );
      toast.success(`KYC ${decision}`);
      dispatch(updateAdminKycDecision({ merchantId, decision }));
      await load();
    } catch (e) {
      if (isAdminMockEnabled()) {
        dispatch(updateAdminKycDecision({ merchantId, decision }));
        toast.success(`Mock KYC ${decision}`);
      } else {
        toast.error(e instanceof ApiError ? e.message : "Could not update KYC");
      }
    } finally {
      setActing(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Merchant not found or API unavailable.</CardContent></Card>
      </div>
    );
  }

  if (!data) {
    return <div className="space-y-4"><BackLink /><Skeleton className="h-[520px] w-full rounded-lg" /></div>;
  }

  const { merchant, user, kyc, counts } = data;
  const score = Number((data.passport as Record<string, unknown>).score ?? 0);
  const confidence = Number((data.passport as Record<string, unknown>).confidence ?? 0);
  const fraudRisk = String((data.passport as Record<string, unknown>).fraud_risk ?? "LOW");
  const transactions = data.transactions ?? [];
  const vouches = data.vouches ?? [];
  const scoreHistory = data.score_history?.length ? data.score_history : fallbackScoreHistory(score, confidence);
  const signals = data.signals ?? fallbackSignals(data, fraudRisk);
  const inflow = transactions.filter((txn) => txn.direction === "in").reduce((sum, txn) => sum + Number(txn.amount ?? 0), 0);
  const outflow = transactions.filter((txn) => txn.direction !== "in").reduce((sum, txn) => sum + Number(txn.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {merchant.name ?? merchant.id}
            </h1>
            {merchant.is_anchor ? <Badge className="gap-1"><BadgeCheck className="size-3" /> Anchor</Badge> : null}
            <Badge variant={fraudRisk === "HIGH" ? "destructive" : fraudRisk === "MEDIUM" ? "outline" : "secondary"}>{fraudRisk} risk</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{merchant.business_type ?? "Unknown business"} - {merchant.id}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Score" value={String(Math.round(score))} />
          <MiniStat label="Confidence" value={`${Math.round(confidence * 100)}%`} />
          <MiniStat label="Transactions" value={String(counts.transactions)} />
          <MiniStat label="Vouches" value={String(counts.vouches_in + counts.vouches_out)} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gauge className="size-4 text-primary" /> Trust posture</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDial score={score} confidence={confidence} />
            <div className="mt-5 grid gap-2">
              {signals.map((signal) => <SignalRow key={signal.label} signal={signal} />)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Score history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip content={<ScoreTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="confidence" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={ArrowDownLeft} label="Recent inflow" value={formatMoney(inflow)} detail={`${transactions.filter((txn) => txn.direction === "in").length} incoming transactions`} />
        <SummaryCard icon={ArrowUpRight} label="Recent outflow" value={formatMoney(outflow)} detail={`${transactions.filter((txn) => txn.direction !== "in").length} outgoing transactions`} />
        <SummaryCard icon={Network} label="Network activity" value={`${vouches.length} vouches`} detail={`${counts.vouches_in} incoming, ${counts.vouches_out} outgoing`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CircleDollarSign className="size-4 text-primary" /> Transaction history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionTable transactions={transactions} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AccountPanel user={user} kycStatus={kyc?.decision ?? user?.kyc_status ?? null} />
          <NetworkPanel vouches={vouches} merchantId={merchant.id} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><FileCheck2 className="size-4 text-primary" /> KYC submission</CardTitle>
          {kyc ? <Badge variant={kyc.decision === "rejected" ? "destructive" : kyc.decision === "verified" ? "default" : "outline"}>{kyc.decision ?? "undecided"}</Badge> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!kyc ? (
            <p className="text-sm text-muted-foreground">No KYC submission for this merchant.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Doc type" value={kyc.doc_type} />
                <Field label="Confidence" value={kyc.confidence != null ? `${Math.round(kyc.confidence * 100)}%` : null} />
                <Field label="Submitted" value={formatDate(kyc.created_at)} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <KeyValuePanel title="Claimed" data={kyc.claimed} />
                <KeyValuePanel title="Extracted" data={kyc.extracted} />
                <KeyValuePanel title="Checks" data={kyc.checks} />
              </div>

              {kyc.reasons.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/25 p-4">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Reasons and notes</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {kyc.reasons.map((reason, index) => <li key={index}>{reason}</li>)}
                  </ul>
                </div>
              ) : null}

              {token && (kyc.doc_uris.length > 0 || kyc.selfie_uri) ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {kyc.doc_uris.map((uri, index) => <AdminImage key={uri} fileUri={uri} token={token} alt={`Document ${index + 1}`} />)}
                  {kyc.selfie_uri ? <AdminImage fileUri={kyc.selfie_uri} token={token} alt="Selfie" /> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button onClick={() => decide("verified")} disabled={acting}>
                  {acting ? <Loader2 className="animate-spin" /> : <Check />} Approve
                </Button>
                <Button variant="outline" onClick={() => decide("rejected")} disabled={acting}>
                  <X /> Reject
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/merchants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Back to merchants
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function ScoreDial({ score, confidence }: { score: number; confidence: number }) {
  const background = useMemo(() => `conic-gradient(var(--primary) ${score * 3.6}deg, var(--muted) 0deg)`, [score]);

  return (
    <div className="flex items-center justify-center">
      <div className="relative grid size-52 place-items-center rounded-full" style={{ background }}>
        <div className="grid size-40 place-items-center rounded-full border border-border bg-card text-center shadow-inner">
          <div>
            <div className="text-5xl font-semibold tracking-tight">{Math.round(score)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{Math.round(confidence * 100)}% confidence</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: AdminMerchantSignal }) {
  const styles: Record<AdminMerchantSignal["sentiment"], string> = {
    positive: "bg-primary/10 text-primary",
    neutral: "bg-muted text-muted-foreground",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <span className="text-sm text-muted-foreground">{signal.label}</span>
      <span className={`rounded-md px-2 py-1 text-xs font-medium ${styles[signal.sentiment]}`}>{signal.value}</span>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function TransactionTable({ transactions }: { transactions: AdminTransaction[] }) {
  if (transactions.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">No transactions found for this merchant.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Counterparty</th>
            <th className="px-4 py-3 font-medium">Direction</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id ?? `${txn.kind}-${txn.date}`} className="border-b border-border last:border-0 hover:bg-accent/35">
              <td className="px-4 py-3 text-muted-foreground">{formatDate(txn.date)}</td>
              <td className="px-4 py-3 font-medium">{formatKind(txn.kind)}</td>
              <td className="px-4 py-3 text-muted-foreground">{txn.counterparty_name ?? "Unknown"}</td>
              <td className="px-4 py-3">
                <Badge variant="outline">{txn.direction === "in" ? "Inflow" : "Outflow"}</Badge>
              </td>
              <td className="px-4 py-3 text-right font-medium">{formatMoney(Number(txn.amount ?? 0))}</td>
              <td className="px-4 py-3">
                <Badge variant={txn.on_time === false ? "destructive" : "secondary"}>{txn.on_time === false ? "Late" : "On time"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountPanel({ user, kycStatus }: { user: AdminMerchantDetail["user"]; kycStatus: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Owner" value={user?.name} />
        <Field label="Email" value={user?.email} />
        <Field label="Phone" value={user?.phone} />
        <Field label="Provider" value={user?.provider} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">KYC status</span>
          <Badge variant={kycStatus === "rejected" ? "destructive" : kycStatus === "verified" ? "default" : "outline"}>{kycStatus ?? "none"}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function NetworkPanel({ vouches, merchantId }: { vouches: AdminVouch[]; merchantId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Network className="size-4 text-primary" /> Relationship history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {vouches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vouches recorded.</p>
        ) : (
          vouches.slice(0, 5).map((vouch) => {
            const incoming = vouch.to_id === merchantId || vouch.direction === "in";
            const otherName = incoming ? vouch.from_name : vouch.to_name;
            return (
              <div key={vouch.id ?? `${vouch.from_id}-${vouch.to_id}`} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{otherName ?? "Unknown merchant"}</div>
                    <div className="text-xs text-muted-foreground">{formatKind(vouch.kind)} - {formatDate(vouch.created_at)}</div>
                  </div>
                  <Badge variant={incoming ? "secondary" : "outline"}>{incoming ? "In" : "Out"}</Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function KeyValuePanel({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {});
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">{title}</div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{formatKind(key)}</span>
              <span className="truncate font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value ?? "-"}</span>
    </div>
  );
}

function ScoreTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const score = payload.find((item) => item.dataKey === "score")?.value;
  const confidence = payload.find((item) => item.dataKey === "confidence")?.value;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="font-medium">{label}</div>
      <div className="mt-1 text-muted-foreground">Score: {score}</div>
      <div className="text-muted-foreground">Confidence: {Math.round(Number(confidence ?? 0) * 100)}%</div>
    </div>
  );
}

function fallbackScoreHistory(score: number, confidence: number): AdminScorePoint[] {
  return ["Jan", "Feb", "Mar", "Apr", "May"].map((month, index) => ({
    month,
    score: Math.max(20, Math.round(score - (4 - index) * 4)),
    confidence: Math.max(0.25, Number((confidence - (4 - index) * 0.04).toFixed(2))),
  }));
}

function fallbackSignals(data: AdminMerchantDetail, fraudRisk: string): AdminMerchantSignal[] {
  return [
    { label: "KYC review", value: data.user?.kyc_status ?? "none", sentiment: data.user?.kyc_status === "verified" ? "positive" : "warning" },
    { label: "Fraud risk", value: fraudRisk, sentiment: fraudRisk === "HIGH" ? "danger" : fraudRisk === "MEDIUM" ? "warning" : "positive" },
    { label: "Evidence depth", value: `${data.counts.transactions} events`, sentiment: data.counts.transactions > 100 ? "positive" : "neutral" },
    { label: "Network support", value: `${data.counts.vouches_in} incoming`, sentiment: data.counts.vouches_in > 5 ? "positive" : "neutral" },
  ];
}

function formatKind(value: string | null | undefined) {
  return (value ?? "unknown").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(value);
}
