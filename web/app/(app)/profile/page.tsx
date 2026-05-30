"use client";

import { BadgeCheck, Briefcase, CalendarDays, ChevronDown, CreditCard, Edit3, Mail, MapPin, MoreVertical, Phone, Store, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useKycProfilePhoto } from "@/hooks/use-kyc-profile-photo";
import { useAuth } from "@/lib/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { BUSINESS_TYPES, type BusinessType, setProfile, setProfilePhoto } from "@/store/slices/profileSlice";

const NPR = new Intl.NumberFormat("en-IN");

function tenureLabel(months: string): string {
  const n = Number(months);
  if (!months || Number.isNaN(n) || n <= 0) return "Not provided";
  if (n < 12) return `${n} month${n === 1 ? "" : "s"}`;
  const years = Math.floor(n / 12);
  const rem = n % 12;
  return rem ? `${years}y ${rem}m` : `${years} year${years === 1 ? "" : "s"}`;
}

function incomeLabel(income: string): string {
  const n = Number(income);
  if (!income || Number.isNaN(n) || n <= 0) return "Not provided";
  return `Rs. ${NPR.format(n)} / mo`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, firebaseUser } = useAuth();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.profile.profile);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(profile);
  const initial = profile.name[0]?.toUpperCase() ?? "B";
  const verified = user?.kyc_status === "verified";
  const profilePhoto = useKycProfilePhoto(user?.photo_url ?? firebaseUser?.photoURL ?? "");

  // Keep the KYC-selfie photo mirrored into the Redux store.
  useEffect(() => {
    dispatch(setProfilePhoto(profilePhoto));
  }, [dispatch, profilePhoto]);

  function openEditor() {
    setDraft(profile);
    setOpen(true);
  }

  function saveProfile() {
    dispatch(setProfile(draft));
    setOpen(false);
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Setting</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and account preferences.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <Card className="glass">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>Your profile</CardTitle>
              <span className="text-xs text-muted-foreground">Joined 2026</span>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarImage src={profilePhoto} />
                    <AvatarFallback className="bg-primary/15 text-lg text-primary">{initial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold">{profile.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{profile.businessName}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={openEditor}>
                  <Edit3 /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>Business</CardTitle>
              <Button variant="ghost" size="sm" onClick={openEditor}>
                <Edit3 /> Edit
              </Button>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><Store className="size-4 text-primary" /> Business name</span>
                <span className="min-w-0 truncate font-medium">{profile.businessName}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><Briefcase className="size-4 text-primary" /> Type</span>
                <span className="font-medium">{profile.businessType}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4 text-primary" /> Months running</span>
                <span className="font-medium">{tenureLabel(profile.businessMonths)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><CreditCard className="size-4 text-primary" /> Monthly income</span>
                <span className="font-medium">{incomeLabel(profile.monthlyIncome)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Emails</CardTitle>
              <Button variant="ghost" size="icon-sm" aria-label="Email actions"><MoreVertical /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">Primary</Badge>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-primary" />
                <span className="min-w-0 truncate">{profile.email}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm">See all email</Button>
                <Button variant="secondary" size="sm">Add Email</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Phone Number</CardTitle>
              <Button variant="ghost" size="icon-sm" aria-label="Phone actions"><MoreVertical /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">Primary</Badge>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-primary" />
                <span>{profile.phone}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Badge variant="secondary">Primary</Badge>
                  <p className="text-sm leading-6">{profile.address}<br />{profile.city}, {profile.country}</p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Address actions"><MoreVertical /></Button>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 text-primary" />
                Add a full business address after KYC.
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Account Options</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow label="Language" value={profile.language} />
              <InfoRow label="Time zone" value={profile.timezone} />
              <InfoRow label="Nationality" value={profile.nationality} />
              <InfoRow label="Merchant ID" value={user?.merchant_id ?? "Pending sync"} />
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-muted-foreground">KYC</span>
                <Badge variant={verified ? "default" : "secondary"}><BadgeCheck /> {user?.kyc_status ?? "unverified"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><UserRound className="size-4 text-primary" /> Authentication</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> Last profile sync</span>
                <span className="text-muted-foreground">Today</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] w-[min(560px,calc(100vw-2rem))] max-w-none overflow-y-auto sm:max-w-none">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update the details shown across your Bharosa account.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-3">
              <Avatar className="size-16">
                <AvatarImage src={profilePhoto} alt="KYC profile photo" />
                <AvatarFallback className="bg-primary/15 text-lg text-primary">{draft.name[0]?.toUpperCase() ?? "B"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  This photo comes from your submitted KYC selfie and cannot be edited here.
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-business">Business name</Label>
                <Input
                  id="profile-business"
                  value={draft.businessName}
                  onChange={(event) => setDraft((current) => ({ ...current, businessName: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-business-type">Business type</Label>
                <Select
                  value={draft.businessType}
                  onValueChange={(value) => setDraft((current) => ({ ...current, businessType: value as BusinessType }))}
                >
                  <SelectTrigger id="profile-business-type" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-business-months">Months in business</Label>
                <Input
                  id="profile-business-months"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="e.g. 8"
                  value={draft.businessMonths}
                  onChange={(event) => setDraft((current) => ({ ...current, businessMonths: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-monthly-income">Avg. monthly income (NPR)</Label>
                <Input
                  id="profile-monthly-income"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="e.g. 25000"
                  value={draft.monthlyIncome}
                  onChange={(event) => setDraft((current) => ({ ...current, monthlyIncome: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={draft.phone}
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-dob">Date of birth</Label>
                <Input
                  id="profile-dob"
                  placeholder="YYYY-MM-DD"
                  value={draft.dob}
                  onChange={(event) => setDraft((current) => ({ ...current, dob: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-nationality">Nationality</Label>
                <Input
                  id="profile-nationality"
                  value={draft.nationality}
                  onChange={(event) => setDraft((current) => ({ ...current, nationality: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-address">Street address</Label>
              <Input
                id="profile-address"
                value={draft.address}
                onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="profile-city">City</Label>
                <Input
                  id="profile-city"
                  value={draft.city}
                  onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-province">Province</Label>
                <Input
                  id="profile-province"
                  value={draft.province}
                  onChange={(event) => setDraft((current) => ({ ...current, province: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-country">Country</Label>
                <Input
                  id="profile-country"
                  value={draft.country}
                  onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-postal">Postal code</Label>
                <Input
                  id="profile-postal"
                  value={draft.postalCode}
                  onChange={(event) => setDraft((current) => ({ ...current, postalCode: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-language">Language</Label>
                <Input
                  id="profile-language"
                  value={draft.language}
                  onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveProfile}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
