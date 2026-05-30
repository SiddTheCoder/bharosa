"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PassportView, fallbackPassport, normalizePassport } from "@/components/passport/PassportView";
import { VouchCard } from "@/components/passport/VouchCard";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { onPassport } from "@/lib/socket";
import type { Passport } from "@/types/passport";

export default function MerchantPassportPage() {
  const params = useParams<{ id: string }>();
  const { idToken, user } = useAuth();
  const myId = user?.merchant_id ?? "me";
  const merchantId = params.id === "me" ? myId : params.id;
  const isSelf = merchantId === myId || params.id === "me";
  const [passport, setPassport] = useState<Passport>({ ...fallbackPassport, merchant_id: merchantId });

  useEffect(() => {
    if (!idToken || !merchantId) return;
    apiGet<unknown>(`/merchant/${merchantId}/passport`, idToken)
      .then((raw) => setPassport(normalizePassport(raw)))
      .catch(() => toast.message("Showing demo passport until backend data is available"));
  }, [idToken, merchantId]);

  useEffect(() => onPassport((update) => {
    if (update.merchant_id === merchantId) setPassport(normalizePassport(update));
  }), [merchantId]);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">{isSelf ? "My Trust" : passport.merchant_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSelf ? "A clear view of your trust score, borrowing readiness, and next best actions." : "Trust passport, score drivers, and lending readiness."}
        </p>
      </div>
      {!isSelf ? <VouchCard merchantId={merchantId} merchantName={passport.merchant_name} /> : null}
      <PassportView passport={passport} />
    </main>
  );
}
