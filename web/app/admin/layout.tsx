"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileCheck2, LogOut, Network, ShieldAlert, ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAdmin } from "@/lib/admin";

const nav = [
  [BarChart3, "Overview", "/admin"],
  [Store, "Merchants", "/admin/merchants"],
  [FileCheck2, "KYC Review", "/admin/kyc"],
  [ShieldAlert, "Risk Queue", "/admin/risk"],
  [Network, "Network", "/admin/network"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin, loading, logout } = useAdmin();

  // While restoring the token, or before the guard redirect kicks in, show a skeleton
  // rather than flashing protected content.
  if (loading || !admin) {
    return <main className="p-6"><Skeleton className="h-[80vh] w-full rounded-lg" /></main>;
  }

  return (
    <div className="h-screen overflow-hidden bg-[#fafbf9] dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 shrink-0 flex-col border-r border-border bg-card/95 shadow-[8px_0_32px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 border-b border-border p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <ShieldCheck className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-semibold tracking-tight">Bharosa</span>
            <span className="mt-1 text-xs text-muted-foreground">Admin console</span>
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 p-3">
          {nav.map(([Icon, label, href]) => {
            const active = pathname === href || (href !== "/admin" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.99] ${
                  active
                    ? "bg-primary/10 font-semibold text-foreground ring-1 ring-primary/20 shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 truncate px-1 text-xs text-muted-foreground">{admin.email}</div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="ml-64 flex h-screen min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur">
          <h2 className="text-sm font-medium text-muted-foreground">Operator console</h2>
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
