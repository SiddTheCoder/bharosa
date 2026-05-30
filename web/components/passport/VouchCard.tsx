"use client";

import Link from "next/link";
import { HeartHandshake, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type VouchKind = "vouch" | "guarantee";

const KINDS: { kind: VouchKind; title: string; blurb: string }[] = [
  { kind: "vouch", title: "Vouch", blurb: "I know this business and trust them to do honest work." },
  { kind: "guarantee", title: "Strong guarantee", blurb: "I'll personally stand behind them — worth more, so vouch carefully." }
];

/**
 * Lets a verified merchant vouch for *another* merchant. Posts to the
 * directional `/merchant/{id}/vouch` endpoint; the live socket then pushes the
 * target's updated passport, so the score climb is visible without a reload.
 */
export function VouchCard({ merchantId, merchantName }: { merchantId: string; merchantName: string }) {
  const { idToken, kycStatus } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<VouchKind | null>(null);
  const [done, setDone] = useState(false);

  async function submit(kind: VouchKind) {
    setBusy(kind);
    try {
      await apiPost(`/merchant/${merchantId}/vouch`, { kind }, idToken);
      toast.success(`You vouched for ${merchantName}`);
      setDone(true);
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error("Verify your KYC before you can vouch for others");
      } else if (error instanceof ApiError && error.status === 409) {
        toast.message("You have already vouched for this merchant");
        setDone(true);
        setOpen(false);
      } else {
        toast.error("Could not record your vouch — please try again");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="glass border-primary/30">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <HeartHandshake className="size-5" />
        </span>
        <div>
          <CardTitle>Do you trust {merchantName}?</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            A vouch from you adds real, anchor-traceable trust to their score. Only vouch for businesses you actually know.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
            <ShieldCheck className="size-4" /> Your vouch is recorded. Thank you for backing {merchantName}.
          </div>
        ) : kycStatus !== "verified" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Only verified merchants can vouch — it keeps trust honest.</p>
            <Button asChild variant="outline"><Link href="/kyc">Verify your KYC</Link></Button>
          </div>
        ) : (
          <Button onClick={() => setOpen(true)}>
            <HeartHandshake /> Vouch for {merchantName}
          </Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vouch for {merchantName}</DialogTitle>
            <DialogDescription>Choose how strongly you back this business. You can only vouch once.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {KINDS.map(({ kind, title, blurb }) => (
              <button
                key={kind}
                type="button"
                disabled={!!busy}
                onClick={() => submit(kind)}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {busy === kind ? <Loader2 className="size-4 animate-spin" /> : <HeartHandshake className="size-4" />}
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-muted-foreground">{blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
