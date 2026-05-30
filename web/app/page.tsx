import Link from "next/link";
import { ArrowRight, BadgeCheck, Network, ShieldCheck } from "lucide-react";
import { Constellation } from "@/components/three/Constellation";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlowButton } from "@/components/ui/glow-button";

const steps = [
  ["Problem", "Good merchants are invisible when trust is trapped in cash, memory, and social proof."],
  ["Insight", "Bharosa models vouches, repayments, interviews, and uncertainty as living evidence."],
  ["Assurance", "Every user authenticates and passes KYC before touching real account data."]
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <section className="relative flex min-h-[92vh] items-center px-6 py-20">
        <Constellation />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-sm font-semibold uppercase text-primary">Bharosa भरोसा</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-foreground sm:text-7xl">
              Trust passports for merchants with thin paperwork.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Bharosa turns vouches, behavior, and voice intake into a confidence-aware credit passport lenders can understand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GlowButton asChild size="lg"><Link href="/login">Get Started <ArrowRight /></Link></GlowButton>
              <GlowButton asChild size="lg" className="bg-none bg-secondary text-secondary-foreground shadow-none ring-1 ring-border hover:bg-accent"><Link href="/atlas">View Atlas</Link></GlowButton>
            </div>
          </div>
          <div className="grid content-end gap-3 pt-[56vh] lg:pt-[46vh]">
            {steps.map(([title, body]) => (
              <div key={title} className="glass rounded-lg p-4">
                <p className="text-sm font-semibold text-primary">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 px-6 pb-16 md:grid-cols-3">
        {[
          [ShieldCheck, "KYC gate", "Identity plausibility and face match before app access."],
          [Network, "Trust graph", "Anchors, vouches, repayments, and risk clusters in one map."],
          [BadgeCheck, "Uncertainty shown", "Confidence bands tighten as new evidence arrives."]
        ].map(([Icon, title, body]) => (
          <div key={String(title)} className="glass rounded-lg p-6">
            <Icon className="mb-4 size-6 text-primary" />
            <h2 className="text-xl font-semibold">{title as string}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body as string}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
