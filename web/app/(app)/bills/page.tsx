"use client";

import Link from "next/link";
import { Bolt, CheckCircle2, Clock, Droplets, FileX2, ImageOff, Loader2, PlusCircle, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiBlobUrl, apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBills, setBillsStatus, type Bill } from "@/store/slices/billsSlice";

const KIND_META = {
  electricity: { label: "Electricity", icon: Bolt },
  water: { label: "Water", icon: Droplets },
  internet: { label: "Internet", icon: Wifi }
} as const;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Loads the private receipt image as an authed blob URL and renders it. */
function Receipt({ uri }: { uri: string | null }) {
  const { idToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uri) return;
    let revoke: string | null = null;
    apiBlobUrl(`/me/file/${uri}`, idToken)
      .then((u) => { revoke = u; setUrl(u); })
      .catch(() => setFailed(true));
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [uri, idToken]);

  const empty = (Icon: typeof ImageOff, text: string) => (
    <div className="grid h-full min-h-32 place-items-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground">
      <span className="grid place-items-center gap-1 text-xs"><Icon className="size-5" /> {text}</span>
    </div>
  );

  if (!uri) return empty(FileX2, "No receipt attached");
  if (failed) return empty(ImageOff, "Receipt unavailable");
  if (!url) return <div className="grid h-full min-h-32 place-items-center rounded-lg border border-border bg-muted/20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Bill receipt" className="max-h-48 w-full rounded-lg border border-border object-contain bg-background" />
  );
}

export default function BillsPage() {
  const { idToken } = useAuth();
  const dispatch = useAppDispatch();
  const { items: bills, status } = useAppSelector((s) => s.bills);
  const loading = status === "idle" || status === "loading";

  useEffect(() => {
    if (status !== "idle") return;
    // Wait for the auth token before fetching. On first paint `idToken` is null
    // (it resolves after Firebase + /auth/me); firing now would 401 and wedge the
    // page in the "error" state, since this effect only refetches while status is
    // "idle". Bail until the token arrives — the effect re-runs when it does.
    if (!idToken) return;
    dispatch(setBillsStatus("loading"));
    apiGet<{ bills: Bill[] }>("/me/bills", idToken)
      .then((res) => dispatch(setBills(res.bills ?? [])))
      .catch(() => { dispatch(setBillsStatus("error")); toast.message("Could not load your bill payments"); });
  }, [status, idToken, dispatch]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Timely Bill Payments</h1>
          <p className="text-muted-foreground">Every bill you&apos;ve logged, with the proof you attached.</p>
        </div>
        <Button asChild variant="outline"><Link href="/records"><PlusCircle /> Add a bill</Link></Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : bills.length === 0 ? (
        <Card className="glass">
          <CardContent className="grid place-items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><FileX2 className="size-6" /></span>
            <div>
              <p className="font-medium">No bill payments yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Add your first utility bill with a photo of the receipt to start building this record.</p>
            </div>
            <Button asChild><Link href="/records"><PlusCircle /> Add a bill</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => {
            const meta = KIND_META[bill.kind];
            const Icon = meta?.icon ?? Bolt;
            return (
              <Card key={bill.id} className="glass">
                <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_240px] sm:items-center">
                  {/* Left: details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
                      <div>
                        <p className="font-medium">{meta?.label ?? bill.kind} bill</p>
                        <p className="text-sm text-muted-foreground">{formatDate(bill.date)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold tabular-nums">NPR {bill.amount?.toLocaleString() ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant={bill.on_time ? "default" : "destructive"} className="gap-1">
                          {bill.on_time ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                          {bill.on_time ? "Paid on time" : "Paid late"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {/* Right: the asset */}
                  <Receipt uri={bill.receipt_uri} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
