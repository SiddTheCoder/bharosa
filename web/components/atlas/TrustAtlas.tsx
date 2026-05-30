"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BadgeCheck, CircleAlert, Landmark, Link2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Real seeded merchants (see server/app/services/seed.py) so "Open full passport"
// links to a live profile where vouching actually works.
const nodes = [
  { id: "anchor_coop", x: 48, y: 42, score: 945, label: "Lalitpur Cooperative", risk: "LOW", links: 14 },
  { id: "good_merchant", x: 28, y: 58, score: 695, label: "Gita's Grocery", risk: "LOW", links: 8 },
  { id: "seasonal_farmer", x: 68, y: 32, score: 565, label: "Hari the Farmer", risk: "MEDIUM", links: 5 },
  { id: "fraud_target", x: 72, y: 66, score: 240, label: "Suspicious Stall", risk: "HIGH", links: 3 },
  { id: "sita_tea_shop", x: 36, y: 30, score: 180, label: "Sita's Tea Shop", risk: "LOW", links: 1 }
] as const;

function riskLabel(risk: string) {
  if (risk === "HIGH") return "Needs review";
  if (risk === "MEDIUM") return "Watch";
  return "Low risk";
}

export function TrustAtlas() {
  const [selected, setSelected] = useState<(typeof nodes)[number] | null>(null);
  const score = selected?.score ?? 0;
  const trustProgress = Math.round(Math.max(0, Math.min(100, (score / 1000) * 100)));

  return (
    <>
      <div className="relative h-[68vh] overflow-hidden rounded-lg border border-border bg-card">
        <svg className="absolute inset-0 size-full">
          {nodes.slice(1).map((node) => <line key={node.id} x1="48%" y1="42%" x2={`${node.x}%`} y2={`${node.y}%`} stroke="rgba(16,185,129,.22)" />)}
        </svg>
        {nodes.map((node) => (
          <motion.button
            key={node.id}
            className="absolute grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-xs shadow-sm transition-colors hover:border-primary/50"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            animate={{ transform: "translate(-50%, -50%) scale(1)" }}
            whileHover={{ transform: "translate(-50%, -50%) scale(1.03)" }}
            transition={{ duration: 0.16 }}
            onClick={() => setSelected(node)}
          >
            <span className={node.risk === "HIGH" ? "text-destructive" : "text-primary"}>{node.score}</span>
            <span className="px-2 text-center text-muted-foreground">{node.label}</span>
          </motion.button>
        ))}
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle>{selected?.label ?? "Merchant"}</SheetTitle>
            <SheetDescription>Compact trust summary from the atlas.</SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="space-y-4 p-4 pt-0">
              <Card className="glass">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Trust score</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Current merchant signal</p>
                  </div>
                  <Badge variant={selected.risk === "HIGH" ? "destructive" : "secondary"}>
                    {selected.risk === "HIGH" ? <CircleAlert /> : <BadgeCheck />} {riskLabel(selected.risk)}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-5xl font-semibold tabular-nums">{selected.score}</p>
                    <p className="pb-2 text-sm text-primary"><TrendingUp className="mr-1 inline size-4" /> {trustProgress}%</p>
                  </div>
                  <Progress className="mt-4 h-2" value={trustProgress} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="glass">
                  <CardContent className="p-4">
                    <Link2 className="mb-3 size-5 text-primary" />
                    <p className="text-2xl font-semibold">{selected.links}</p>
                    <p className="text-sm text-muted-foreground">Evidence links</p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="p-4">
                    <Landmark className="mb-3 size-5 text-primary" />
                    <p className="text-2xl font-semibold">NPR 120k</p>
                    <p className="text-sm text-muted-foreground">Estimated fit</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {["Supplier vouch from verified anchor", "On-time utility payment", "Voice intake matched business pattern"].map((signal) => (
                    <div key={signal} className="flex items-start gap-2">
                      <span className="mt-1 size-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{signal}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Separator />
              <Button asChild className="w-full">
                <Link href={`/merchant/${selected.id}`}>Open full passport & vouch</Link>
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
