"use client";

import { BadgeCheck, Check, FileCheck2, Loader2, Upload, UserCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { KycStatusPanel } from "@/components/kyc/KycStatus";
import { SelfieCapture } from "@/components/kyc/SelfieCapture";
import { saveKycProfilePhoto } from "@/hooks/use-kyc-profile-photo";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setKycBusy, setKycStatus, setKycStep, updateKycForm, type KycStep } from "@/store/slices/kycSlice";
import type { KycStatusResponse } from "@/types/kyc";

const steps = [
  { id: 1, label: "Step 1", title: "Identity document" },
  { id: 2, label: "Step 2", title: "Selfie check" },
  { id: 3, label: "Step 3", title: "Review" }
] as const;

function UploadBox({
  id,
  label,
  hint,
  file,
  onChange,
  required
}: {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  const previewUrl = useMemo(() => {
    if (!file) return null;
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(file.name);
    if (!isImage) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <label
      htmlFor={id}
      className="grid min-h-48 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
    >
      <Input
        id={id}
        className="sr-only"
        type="file"
        accept="image/*,.pdf"
        required={required}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <div className="w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={label} className="h-56 w-full rounded-md border border-border object-contain bg-background" />
          <div className="mt-3 flex items-center justify-between gap-3 px-1 text-left">
            <span className="min-w-0 truncate text-sm font-medium">{file?.name}</span>
            <span className="shrink-0 text-xs text-primary">Change image</span>
          </div>
        </div>
      ) : (
        <div className="grid place-items-center py-6">
          <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-primary">
            <Upload className="size-4" />
          </span>
          <span className="mt-3 font-medium">{label}</span>
          <span className="mt-1 max-w-56 text-xs text-muted-foreground">{file ? file.name : hint}</span>
        </div>
      )}
    </label>
  );
}

function CheckingPanel() {
  return (
    <div className="grid min-h-44 place-items-center rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
      <div>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-5 animate-spin" />
        </span>
        <h2 className="mt-4 text-base font-semibold">Checking your data</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Please wait a while. We are verifying your document, selfie, and identity details.
        </p>
      </div>
    </div>
  );
}

export default function KycPage() {
  const { idToken, refreshMe, user, firebaseUser, kycStatus } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Serializable KYC state lives in Redux; File objects stay local (not serializable).
  const step = useAppSelector((s) => s.kyc.step);
  const status = useAppSelector((s) => s.kyc.status);
  const busy = useAppSelector((s) => s.kyc.busy);
  const { docType, fullName, dob, idNumber, selfieSource } = useAppSelector((s) => s.kyc.form);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const setStep = (v: KycStep | ((c: KycStep) => KycStep)) =>
    dispatch(setKycStep(typeof v === "function" ? v(step) : v));
  const setStatus = (v: KycStatusResponse | null) => dispatch(setKycStatus(v));
  const setBusy = (v: boolean) => dispatch(setKycBusy(v));
  const setDocType = (v: string) => dispatch(updateKycForm({ docType: v }));
  const setFullName = (v: string) => dispatch(updateKycForm({ fullName: v }));
  const setDob = (v: string) => dispatch(updateKycForm({ dob: v }));
  const setIdNumber = (v: string) => dispatch(updateKycForm({ idNumber: v }));
  const setSelfieSource = (v: "upload" | "camera") => dispatch(updateKycForm({ selfieSource: v }));

  // Seed the name from the signed-in user the first time (if still blank).
  useEffect(() => {
    if (!fullName && (user?.name || firebaseUser?.displayName)) {
      dispatch(updateKycForm({ fullName: user?.name ?? firebaseUser?.displayName ?? "" }));
    }
  }, [dispatch, fullName, user?.name, firebaseUser?.displayName]);

  useEffect(() => {
    if (idToken) apiGet<KycStatusResponse>("/kyc/status", idToken).then((s) => dispatch(setKycStatus(s))).catch(() => null);
  }, [idToken, dispatch]);

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(fullName.trim() && idNumber.trim() && documentFile);
    if (step === 2) return Boolean(selfieFile);
    return true;
  }, [documentFile, fullName, idNumber, selfieFile, step]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentFile) {
      toast.error("Upload your identity document first");
      setStep(1);
      return;
    }
    if (!selfieFile) {
      toast.error("Add a selfie check before submitting");
      setStep(2);
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.set("doc_type", docType);
      form.set("name", fullName);
      form.set("dob", dob);
      form.set("id_number", idNumber);
      form.set("document", documentFile);
      form.set("selfie_source", selfieSource);
      form.set("selfie", selfieFile);
      const result = await apiPost<{ kyc_status: string; reasons: string[] }>("/kyc/submit", form, idToken);
      await saveKycProfilePhoto(selfieFile);
      toast.success(result.kyc_status === "verified" ? "KYC verified" : "KYC submitted");
      const me = await refreshMe();
      if (me?.kyc_status === "verified") router.replace("/dashboard");
      if (idToken) setStatus(await apiGet<KycStatusResponse>("/kyc/status", idToken));
    } catch (error) {
      console.error(error);
      toast.error("KYC submission failed");
    } finally {
      setBusy(false);
    }
  }

  // Already verified → show the record on file instead of an empty form.
  if (kycStatus === "verified") {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4">
        <Card className="glass">
          <CardContent className="space-y-6 p-5 md:p-8">
            <div className="space-y-2 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <BadgeCheck className="size-7" />
              </span>
              <h1 className="text-2xl font-semibold">You&apos;re verified</h1>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Your identity has been confirmed. Here is the information we have on file.
              </p>
            </div>
            <KycStatusPanel status={status} />
            <div className="flex justify-center">
              <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4">
      <Card className="glass">
        <CardContent className="p-5 md:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="relative mx-auto max-w-xl px-4">
              <span className="absolute left-[17%] right-[17%] top-5 h-px bg-border" />
              <span
                className="absolute left-[17%] top-5 h-px bg-primary transition-[width]"
                style={{ width: step === 1 ? "0%" : step === 2 ? "33%" : "66%" }}
              />
              <div className="relative grid grid-cols-3 items-start gap-4">
              {steps.map((item) => {
                const active = step === item.id;
                const done = step > item.id;
                return (
                  <div key={item.id} className="relative text-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setStep(item.id)}
                      className="relative z-10 mx-auto flex size-10 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-muted-foreground data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                      data-active={active || done}
                    >
                      {done ? <Check className="size-4" /> : item.id}
                    </button>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                );
              })}
              </div>
            </div>

            <form className="mt-10" onSubmit={submit}>
              {step === 1 ? (
                <section className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-semibold">Upload proof of identity</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Use a valid government ID with your name, photo, and ID number.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Your country</Label>
                      <Input value="Nepal" readOnly className="bg-muted/40" />
                    </div>
                    <div className="space-y-2">
                      <Label>Document type</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>{["citizenship", "nid", "pan", "passport", "license"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your legal name" />
                    </div>
                    <div className="space-y-2">
                      <Label>ID number</Label>
                      <Input value={idNumber} onChange={(event) => setIdNumber(event.target.value)} placeholder="Document ID number" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Date of birth</Label>
                      <Input value={dob} onChange={(event) => setDob(event.target.value)} placeholder="YYYY-MM-DD" />
                    </div>
                  </div>
                  <UploadBox id="document-upload" label="Front side of your document" hint="Supports JPG, PNG, or PDF" file={documentFile} onChange={setDocumentFile} />
                </section>
              ) : null}

              {step === 2 ? (
                <section className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-semibold">Add a selfie check</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Upload a clear selfie or use your camera for face match.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <button type="button" onClick={() => setSelfieSource("upload")} className="rounded-lg border border-border bg-card p-4 text-left data-[active=true]:border-primary data-[active=true]:bg-primary/5" data-active={selfieSource === "upload"}>
                      <FileCheck2 className="mb-3 size-5 text-primary" />
                      <p className="font-semibold">Upload selfie</p>
                      <p className="mt-1 text-sm text-muted-foreground">Choose an existing photo.</p>
                    </button>
                    <button type="button" onClick={() => setSelfieSource("camera")} className="rounded-lg border border-border bg-card p-4 text-left data-[active=true]:border-primary data-[active=true]:bg-primary/5" data-active={selfieSource === "camera"}>
                      <UserCheck className="mb-3 size-5 text-primary" />
                      <p className="font-semibold">Use camera</p>
                      <p className="mt-1 text-sm text-muted-foreground">Capture a fresh selfie.</p>
                    </button>
                  </div>
                  {selfieSource === "upload" ? (
                    <UploadBox id="selfie-upload" label="Selfie image" hint="Use a bright, front-facing photo" file={selfieFile} onChange={setSelfieFile} />
                  ) : (
                    <SelfieCapture onCapture={setSelfieFile} />
                  )}
                </section>
              ) : null}

              {step === 3 ? (
                <section className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-semibold">Review and submit</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Make sure everything looks right before verification starts.</p>
                  </div>
                  <div className="rounded-lg border border-border">
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{fullName || "Not added"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Document</p>
                        <p className="font-medium">{documentFile?.name ?? "Not uploaded"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Document type</p>
                        <p className="font-medium">{docType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Selfie</p>
                        <p className="font-medium">{selfieFile ? "Ready" : "Not added"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="p-4">
                      {busy ? <CheckingPanel /> : <KycStatusPanel status={status} />}
                    </div>
                  </div>
                </section>
              ) : null}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button type="button" variant="outline" disabled={step === 1 || busy} onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3)}>
                  Back
                </Button>
                {step < 3 ? (
                  <Button type="button" disabled={!canContinue || busy} onClick={() => setStep((current) => (current + 1) as 1 | 2 | 3)}>
                    Continue
                  </Button>
                ) : (
                  <Button disabled={busy || !canContinue}>
                    {busy ? <Loader2 className="animate-spin" /> : <Upload />} {busy ? "Checking..." : "Submit KYC"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
