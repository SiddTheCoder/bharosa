"use client";

import { BadgePlus, Bolt, ShieldAlert, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Demo control deck — fires real events against a seeded demo merchant so the
// passport climb is visible live (via the passport-updated socket).
const TARGET = "sita_tea_shop";

const actions = [
  { icon: BadgePlus, label: "Anchor vouch", path: "/event", body: { merchant_id: TARGET, kind: "vouch", from_id: "anchor_coop" } },
  { icon: Bolt, label: "Pay electricity bill", path: "/event", body: { merchant_id: TARGET, kind: "electricity", amount: 1500, on_time: true } },
  { icon: Store, label: "Record monthly sales", path: "/event", body: { merchant_id: TARGET, kind: "qr_revenue", amount: 30000 } },
  { icon: ShieldAlert, label: "Inject fraud ring", path: "/demo/inject-fraud-ring", body: { target_id: "fraud_target" } }
] as const;

export function DemoDeck() {
  const { idToken } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(path: string, body: object, label: string) {
    setBusy(label);
    try {
      await apiPost(path, body, idToken);
      toast.success(`${label} — passport updating live`);
    } catch {
      toast.error(`Could not run "${label}" — is the API running?`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Demo control deck</CardTitle>
        <p className="text-sm text-muted-foreground">Invisible → climb → fraud caught → path out. Open Sita&apos;s Tea Shop passport to watch it move.</p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        {actions.map(({ icon: Icon, label, path, body }) => (
          <Button key={label} variant="outline" className="h-20 flex-col" disabled={!!busy} onClick={() => run(path, body, label)}>
            <Icon />{label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
