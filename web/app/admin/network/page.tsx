"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Network, Share2, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";
import type { AdminVouch } from "@/types/admin";

export default function AdminNetworkPage() {
  const { merchants, details, stats } = useAppSelector((state) => state.admin);
  const anchors = merchants.filter((merchant) => merchant.is_anchor);
  const vouches = Object.values(details).flatMap((detail) => detail.vouches ?? []);
  const incoming = vouches.filter((vouch) => vouch.direction === "in").length;
  const outgoing = vouches.filter((vouch) => vouch.direction === "out").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Relationship intelligence</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Network</h1>
        <p className="mt-1 text-sm text-muted-foreground">See which merchants anchor the trust graph and how vouches move through the network.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <NetworkMetric label="Anchor merchants" value={stats.anchors} icon={BadgeCheck} />
        <NetworkMetric label="Total vouches" value={vouches.length} icon={Share2} />
        <NetworkMetric label="Incoming links" value={incoming} icon={Network} />
        <NetworkMetric label="Outgoing links" value={outgoing} icon={Store} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className="shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Anchor merchants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anchors.map((anchor) => {
              const detail = details[anchor.id];
              return (
                <Link
                  key={anchor.id}
                  href={`/admin/merchants/${anchor.id}`}
                  className="group block rounded-lg border border-border bg-background p-4 transition-[border-color,background-color,transform] duration-150 ease-out hover:border-primary/30 hover:bg-accent/35 active:scale-[0.995]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-base font-semibold">{anchor.name}</span>
                        <BadgeCheck className="size-4 shrink-0 text-primary" />
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{anchor.business_type}</div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <AnchorStat label="Score" value={`${anchor.score}`} />
                    <AnchorStat label="In" value={`${detail?.counts.vouches_in ?? 0}`} />
                    <AnchorStat label="Out" value={`${detail?.counts.vouches_out ?? 0}`} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle>Recent relationship activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vouches.slice(0, 12).map((vouch) => (
              <VouchRow key={vouch.id ?? `${vouch.from_id}-${vouch.to_id}`} vouch={vouch} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NetworkMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Network }) {
  return (
    <Card className="shadow-[0_10px_28px_rgba(0,0,0,0.04)]">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold">{value}</div>
        </div>
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function AnchorStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function VouchRow({ vouch }: { vouch: AdminVouch }) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_150px_90px] md:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{vouch.from_name ?? vouch.from_id} to {vouch.to_name ?? vouch.to_id}</div>
        <div className="mt-1 text-xs text-muted-foreground">{formatDate(vouch.created_at)}</div>
      </div>
      <Badge className="w-fit" variant="outline">{formatKind(vouch.kind)}</Badge>
      <Badge className="w-fit" variant={vouch.direction === "in" ? "secondary" : "outline"}>{vouch.direction}</Badge>
    </div>
  );
}

function formatKind(value: string | null | undefined) {
  return (value ?? "unknown").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
