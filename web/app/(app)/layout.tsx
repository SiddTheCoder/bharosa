"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Bell, ChevronsUpDown, Gauge, Inbox, LayoutDashboard, LogOut, Mic, Network, PlusCircle, ReceiptText, Search, ShieldCheck, Sparkles, Store, UserCircle, Wand2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { KycBanner } from "@/components/dashboard/KycBanner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useKycProfilePhoto } from "@/hooks/use-kyc-profile-photo";
import { useAuth } from "@/lib/auth";
import { useAppSelector } from "@/store/hooks";

const groups = [
  {
    label: "Workspace",
    items: [
      [LayoutDashboard, "Dashboard", "/dashboard"],
      [Gauge, "My Trust", "/merchant/me"],
      [PlusCircle, "Add Records", "/records"],
      [ReceiptText, "Timely Bill Payments", "/bills"],
      [Network, "Trust Atlas", "/atlas"],
      [Mic, "Voice Interview", "/me"]
    ]
  },
  {
    label: "Account",
    items: [
      [ShieldCheck, "KYC", "/kyc"],
      [UserCircle, "Profile", "/profile"],
      [Wand2, "Demo", "/demo"]
    ]
  }
] as const;

const activeClass =
  "data-[active=true]:bg-primary/10 data-[active=true]:text-foreground data-[active=true]:font-medium data-[active=true]:ring-1 data-[active=true]:ring-primary/20 [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-primary";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const profilePhoto = useKycProfilePhoto(user?.photo_url ?? "");
  const profile = useAppSelector((state) => state.profile.profile);
  if (loading) return <main className="p-6"><Skeleton className="h-[80vh] w-full rounded-lg" /></main>;

  const verified = user?.kyc_status === "verified";
  const name = user?.name ?? user?.phone ?? "Merchant";
  const initial = (user?.name ?? "B")[0]?.toUpperCase();
  const isDashboard = pathname === "/dashboard";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="border-b border-border p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-1 py-1 group-data-[collapsible=icon]:justify-center">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <BadgeCheck className="size-5" />
            </span>
            <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
              <span className="text-base font-semibold">Bharosa</span>
              <span className="text-xs text-muted-foreground">भरोसा · trust</span>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          {groups.map((group) => (
            <SidebarGroup key={group.label} className="px-0">
              <SidebarGroupLabel className="px-2 text-[0.68rem] uppercase text-muted-foreground">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map(([Icon, label, href]) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        className={activeClass}
                        isActive={pathname === href || (href !== "/dashboard" && !!pathname?.startsWith(`${href}/`))}
                        tooltip={label}
                      >
                        <Link href={href}><Icon /><span>{label}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-border p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          {!verified ? (
            <Link
              href="/kyc"
              className="group flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/10 p-3 transition-colors hover:bg-primary/15 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="size-4 shrink-0" /> <span className="group-data-[collapsible=icon]:hidden">Get verified</span></span>
              <span className="text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">Complete KYC to earn +50 credit points and unlock lending.</span>
            </Link>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
              <span className="flex items-center gap-2 text-sm text-primary">
                <BadgeCheck className="size-4 shrink-0" /> <span className="group-data-[collapsible=icon]:hidden">Verified account</span>
              </span>
              <div className="flex items-center gap-2 border-t border-border pt-2 group-data-[collapsible=icon]:hidden">
                <Store className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{profile.businessName}</span>
                  <span className="truncate text-xs text-muted-foreground">{profile.businessType}</span>
                </div>
              </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <KycBanner />
        <div className="sticky top-0 z-30">
          <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <label className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm md:flex">
                <Search className="size-4" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="Search merchants, vouches, signals..."
                  type="search"
                />
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon-lg" aria-label="Inbox" className="relative">
                <Inbox />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
              </Button>
              <Button variant="ghost" size="icon-lg" aria-label="Notifications" className="relative">
                <Bell />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="lg" className="h-10 gap-2 px-2">
                    <Avatar className="size-8"><AvatarImage src={profilePhoto} /><AvatarFallback className="bg-primary/15 text-xs text-primary">{initial}</AvatarFallback></Avatar>
                    <span className="hidden text-sm font-medium sm:inline">{name}</span>
                    <ChevronsUpDown className="hidden size-3.5 text-muted-foreground sm:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user?.email ?? user?.phone ?? "No contact added"}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/profile"><UserCircle /> Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/kyc"><ShieldCheck /> {verified ? "KYC verified" : "Verify KYC"}</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        </div>
        <div className={isDashboard ? "w-full p-0" : "mx-auto w-full max-w-6xl p-4 md:p-5"}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
