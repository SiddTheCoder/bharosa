"use client";

import Link from "next/link";
import { Bolt, CheckCircle2, Droplets, ImageUp, Loader2, Receipt, ShieldAlert, Store, Truck, Users, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAppDispatch } from "@/store/hooks";
import { invalidateBills } from "@/store/slices/billsSlice";

type BillKind = "electricity" | "water" | "internet";

const BILLS: { kind: BillKind; label: string; icon: typeof Bolt }[] = [
  { kind: "electricity", label: "Electricity", icon: Bolt },
  { kind: "water", label: "Water", icon: Droplets },
  { kind: "internet", label: "Internet", icon: Wifi }
];

function handleError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 403) {
    toast.error("Verify your KYC before adding records to your trust profile");
  } else {
    toast.error(fallback);
  }
}

function AddBillCard() {
  const { idToken } = useAuth();
  const dispatch = useAppDispatch();
  const [kind, setKind] = useState<BillKind>("electricity");
  const [amount, setAmount] = useState("1500");
  const [onTime, setOnTime] = useState(true);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const previewUrl = useMemo(() => (receipt ? URL.createObjectURL(receipt) : null), [receipt]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter the bill amount in NPR");
      return;
    }
    if (!receipt) {
      toast.error("Add a photo of the bill or receipt to support your claim");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("amount", String(value));
      form.set("on_time", String(onTime));
      form.set("receipt", receipt);
      await apiPost("/me/bill", form, idToken);
      toast.success(`${BILLS.find((b) => b.kind === kind)?.label} bill added — your trust score is updating`);
      setReceipt(null);
      dispatch(invalidateBills());
    } catch (error) {
      handleError(error, "Could not add that bill — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 border-b border-border">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Receipt className="size-5" /></span>
        <div>
          <CardTitle>Add a bill payment</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Paying utilities on time is one of the strongest signals of trust.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <Label>Which bill did you pay?</Label>
          <div className="grid grid-cols-3 gap-2">
            {BILLS.map(({ kind: k, label, icon: Icon }) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                data-active={kind === k}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary"
              >
                <Icon className="size-5" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bill-amount">Amount (NPR)</Label>
          <Input id="bill-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1500" />
        </div>

        <div className="space-y-2">
          <Label>Did you pay on time?</Label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOnTime(true)} data-active={onTime} className="rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary">
              On time
            </button>
            <button type="button" onClick={() => setOnTime(false)} data-active={!onTime} className="rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary">
              Paid late
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bill-receipt">Proof of payment</Label>
          <label
            htmlFor="bill-receipt"
            className="grid min-h-32 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <Input id="bill-receipt" className="sr-only" type="file" accept="image/*" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Receipt preview" className="max-h-44 w-full rounded-md border border-border object-contain bg-background" />
            ) : (
              <span className="grid place-items-center py-4 text-muted-foreground">
                <span className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary"><ImageUp className="size-4" /></span>
                <span className="mt-2 text-sm font-medium text-foreground">Upload a photo of the bill</span>
                <span className="mt-0.5 text-xs">A clear photo of the receipt supports your claim</span>
              </span>
            )}
          </label>
          {receipt ? <p className="truncate text-xs text-muted-foreground">{receipt.name}</p> : null}
        </div>

        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Receipt />} Add bill
        </Button>
      </CardContent>
    </Card>
  );
}

function AddSaleCard() {
  const { idToken } = useAuth();
  const [amount, setAmount] = useState("30000");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter your sales amount in NPR");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/me/event", { kind: "qr_revenue", amount: value }, idToken);
      toast.success("Sales recorded — steady sales raise your trust score");
    } catch (error) {
      handleError(error, "Could not record those sales — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 border-b border-border">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Store className="size-5" /></span>
        <div>
          <CardTitle>Record monthly sales</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Log the QR sales you took this month so lenders can see steady income.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <Label htmlFor="sale-amount">This month&apos;s sales (NPR)</Label>
          <Input id="sale-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="30000" />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Store />} Record sales
        </Button>
      </CardContent>
    </Card>
  );
}

function AddPaymentCard() {
  const { idToken } = useAuth();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("1500");
  const [busy, setBusy] = useState(false);
  const isCustomer = direction === "in";

  async function submit() {
    const value = Number(amount);
    if (!name.trim()) {
      toast.error(isCustomer ? "Enter the customer's name" : "Enter the supplier's name");
      return;
    }
    if (!value || value <= 0) {
      toast.error("Enter the payment amount in NPR");
      return;
    }
    setBusy(true);
    try {
      await apiPost(
        "/me/event",
        {
          kind: isCustomer ? "qr_revenue" : "supplier_payment",
          amount: value,
          counterparty_name: name.trim(),
          direction
        },
        idToken
      );
      toast.success(
        isCustomer
          ? "Customer payment recorded — repeat customers raise your trust score"
          : "Supplier payment recorded — a steady supply chain builds trust"
      );
      setName("");
    } catch (error) {
      handleError(error, "Could not record that payment — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 border-b border-border">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {isCustomer ? <Users className="size-5" /> : <Truck className="size-5" />}
        </span>
        <div>
          <CardTitle>Record a payment</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Naming the other party lets us spot repeat customers and steady suppliers.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <Label>What kind of payment?</Label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDirection("in")} data-active={isCustomer} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary">
              <Users className="size-4" /> Customer paid me
            </button>
            <button type="button" onClick={() => setDirection("out")} data-active={!isCustomer} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary">
              <Truck className="size-4" /> I paid a supplier
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-name">{isCustomer ? "Customer name" : "Supplier name"}</Label>
          <Input id="payment-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={isCustomer ? "e.g. Ram, Bagmati Hostel" : "e.g. Himal Dairy"} />
          <p className="text-xs text-muted-foreground">Use the same name each time so repeat payments are recognised.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-amount">Amount (NPR)</Label>
          <Input id="payment-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1500" />
        </div>

        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : isCustomer ? <Users /> : <Truck />} Record payment
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RecordsPage() {
  const { kycStatus } = useAuth();
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Grow your trust</h1>
        <p className="text-muted-foreground">Add real records about your business. Each one updates your trust score right away.</p>
      </div>

      {kycStatus !== "verified" ? (
        <Card className="glass border-primary/30">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldAlert className="size-5" /></span>
              <p className="text-sm text-muted-foreground">Verify your KYC first — records only count once we know who you are.</p>
            </div>
            <Button asChild><Link href="/kyc">Verify KYC</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass border-primary/20">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-primary">
            <CheckCircle2 className="size-4" /> You&apos;re verified — every record you add here counts toward your score.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <AddBillCard />
        <AddSaleCard />
        <AddPaymentCard />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Want community trust too? Ask businesses you work with to open your{" "}
        <Link href="/merchant/me" className="text-primary underline-offset-4 hover:underline">passport</Link> and vouch for you.
      </p>
    </main>
  );
}
