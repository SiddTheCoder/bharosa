"use client";

import { ConfirmationResult } from "firebase/auth";
import { Loader2, Lock, Phone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlowButton } from "@/components/ui/glow-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ApiError } from "@/lib/api";
import { confirmPhoneOtp, firebaseMessage, sendPhoneOtp } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useAdmin } from "@/lib/admin";

export default function LoginPage() {
  const { signInWithGoogle, refreshMe } = useAuth();
  const { login: adminLogin } = useAdmin();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  async function completeAdmin() {
    setBusy(true);
    try {
      await adminLogin(adminEmail.trim(), adminPassword);
      toast.success("Welcome, admin");
      router.replace("/admin");
    } catch (error) {
      const msg = error instanceof ApiError && error.status === 401
        ? "Invalid admin email or password"
        : "Could not sign in as admin";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function completePhone() {
    if (!confirmation) return;
    setBusy(true);
    try {
      await confirmPhoneOtp(confirmation, code);
      await refreshMe();
      router.replace("/dashboard");
    } catch (error) {
      toast.error(firebaseMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="glass w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><ShieldCheck /></div>
          <CardTitle className="text-2xl">Enter Bharosa</CardTitle>
          <p className="text-sm text-muted-foreground">Authenticate first. KYC unlocks the dashboard after this.</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google">
            <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="google">Google</TabsTrigger><TabsTrigger value="phone">Phone</TabsTrigger><TabsTrigger value="admin">Admin</TabsTrigger></TabsList>
            <TabsContent value="google" className="pt-4">
              <GlowButton className="w-full" disabled={busy} onClick={async () => { setBusy(true); try { await signInWithGoogle(); } catch (e) { toast.error(firebaseMessage(e)); } finally { setBusy(false); } }}>
                {busy ? <Loader2 className="animate-spin" /> : null} Continue with Google
              </GlowButton>
            </TabsContent>
            <TabsContent value="phone" className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Phone number</Label><Input placeholder="+97798..." value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              {confirmation ? <div className="space-y-2"><Label>OTP code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div> : null}
              <Button className="w-full" disabled={busy} onClick={async () => {
                setBusy(true);
                try {
                  if (!confirmation) { setConfirmation(await sendPhoneOtp(phone, "recaptcha")); toast.success("OTP sent"); }
                  else await completePhone();
                } catch (e) { toast.error(firebaseMessage(e)); } finally { setBusy(false); }
              }}>
                {busy ? <Loader2 className="animate-spin" /> : <Phone />} {confirmation ? "Confirm OTP" : "Send OTP"}
              </Button>
              <div id="recaptcha" />
            </TabsContent>
            <TabsContent value="admin" className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground">Operator access only. Sign in with your admin credentials to review merchants and KYC.</p>
              <form
                className="space-y-4"
                onSubmit={(e) => { e.preventDefault(); if (!busy) completeAdmin(); }}
              >
                <div className="space-y-2"><Label>Admin email</Label><Input type="email" autoComplete="username" placeholder="admin@gmail.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" autoComplete="current-password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy || !adminEmail || !adminPassword}>
                  {busy ? <Loader2 className="animate-spin" /> : <Lock />} Sign in as admin
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
