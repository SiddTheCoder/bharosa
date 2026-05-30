"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function KycBanner() {
  const { kycStatus } = useAuth();
  if (kycStatus === "verified") return null;

  const pending = kycStatus === "pending";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm text-foreground">
      <Sparkles className="size-4 shrink-0 text-primary" />
      {pending ? (
        <span>Your KYC is <b>under review</b>. You can keep exploring while we verify.</span>
      ) : (
        <span>
          <b>Complete your KYC</b> to unlock <b>+50 trust credit points</b> and full lending features.
        </span>
      )}
      <Link href="/kyc" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
        {pending ? "View status" : "Verify now"} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
