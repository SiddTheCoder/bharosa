"use client";

import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GlowButton } from "@/components/ui/glow-button";
import type { KycStatus } from "@/types/user";

export function KycCallout({ status }: { status: KycStatus }) {
  const verified = status === "verified";
  return (
    <Card className="glass overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {verified ? <CheckCircle2 className="size-5" /> : <ShieldAlert className="size-5" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{verified ? "You are verified" : "Verify your KYC"}</h2>
              <Badge variant={verified ? "default" : "secondary"}>{status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">भरोसा grows when identity, behavior, and community evidence agree.</p>
          </div>
        </div>
        {!verified ? <GlowButton asChild><Link href="/kyc">Start KYC</Link></GlowButton> : null}
      </CardContent>
    </Card>
  );
}
