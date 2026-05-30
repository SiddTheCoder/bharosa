"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiBlobUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { KycStatusResponse } from "@/types/kyc";

/** Loads a private, owner-scoped KYC image (needs the bearer token) and shows it. */
function AuthedImage({ fileId, alt }: { fileId?: string | null; alt: string }) {
  const { idToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!fileId || !idToken) return;
    let active = true;
    let objectUrl: string | null = null;
    apiBlobUrl(`/kyc/file/${fileId}`, idToken)
      .then((u) => {
        if (!active) {
          URL.revokeObjectURL(u);
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, idToken]);

  if (!fileId) return null;
  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/20">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-40 w-full object-contain bg-background" />
      ) : (
        <div className="grid h-40 place-items-center text-xs text-muted-foreground">
          {failed ? "Could not load image" : "Loading…"}
        </div>
      )}
      <p className="border-t border-border px-3 py-2 text-xs font-medium text-muted-foreground">{alt}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

export function KycStatusPanel({ status }: { status: KycStatusResponse | null }) {
  const kycStatus = status?.kyc_status ?? "unverified";
  const latest = status?.latest;
  const claimed = latest?.claimed ?? {};
  const extracted = latest?.extracted ?? {};
  const verified = kycStatus === "verified";
  const pending = kycStatus === "pending";

  const StatusIcon = verified ? BadgeCheck : pending ? Clock : ShieldX;
  const tone = verified
    ? "text-emerald-600"
    : pending
      ? "text-amber-600"
      : "text-muted-foreground";

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      {/* Header + status */}
      <div className="flex items-center justify-between">
        <p className="font-medium">Verification status</p>
        <Badge variant={verified ? "default" : "secondary"} className="gap-1">
          <StatusIcon className={`size-3.5 ${verified ? "" : tone}`} />
          {kycStatus}
        </Badge>
      </div>

      {verified ? (
        <div className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
          <BadgeCheck className="size-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">
            Identity verified — your document and details passed all checks.
          </p>
        </div>
      ) : null}

      <Progress value={latest ? Math.round(latest.confidence * 100) : 8} />

      {/* Reasons */}
      <div className="space-y-1 text-sm text-muted-foreground">
        {(latest?.reasons?.length ? latest.reasons : ["Upload a document and selfie to start plausibility checks."]).map(
          (reason) => (
            <p key={reason}>{reason}</p>
          )
        )}
      </div>

      {latest ? (
        <>
          {/* What the user submitted */}
          <div className="rounded-md border border-border p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details you submitted
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" value={claimed.name} />
              <Field label="Document type" value={latest.doc_type} />
              <Field label="ID number" value={claimed.id_number} />
              <Field label="Date of birth" value={claimed.dob} />
            </div>
          </div>

          {/* What the AI read off the document */}
          {extracted.name || extracted.dob || extracted.id_number ? (
            <div className="rounded-md border border-border p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Read from your document
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name on document" value={extracted.name_romanized || extracted.name} />
                <Field label="Document number" value={extracted.id_number} />
                <Field
                  label="Date of birth"
                  value={extracted.dob_gregorian || extracted.dob}
                />
                <Field label="Issuer" value={extracted.issuer} />
              </div>
            </div>
          ) : null}

          {/* Uploaded images */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(latest.doc_uris ?? []).map((id, i) => (
              <AuthedImage key={id} fileId={id} alt={`Document ${(latest.doc_uris?.length ?? 0) > 1 ? i + 1 : ""}`.trim()} />
            ))}
            {latest.selfie_uri ? <AuthedImage fileId={latest.selfie_uri} alt="Selfie" /> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
