import { ArrowUpRight, BadgeCheck, Landmark, Network, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Card } from "@/components/ui/card";

const stats = [
  { icon: TrendingUp, label: "Trust score", value: 682, prefix: "", suffix: "", delta: "+24 this week" },
  { icon: Network, label: "Evidence links", value: 38, prefix: "", suffix: "", delta: "+6 new" },
  { icon: Landmark, label: "Eligible offer", value: 120000, prefix: "NPR ", suffix: "", delta: "Pre-qualified" },
  { icon: BadgeCheck, label: "Confidence", value: 74, prefix: "", suffix: "%", delta: "Band tightening" }
] as const;

export function StatCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ icon: Icon, label, value, prefix, suffix, delta }) => (
        <Card key={label} className="glass gap-0 p-4 transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-[0_10px_28px_rgba(0,0,0,0.06)] dark:hover:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-semibold tabular-nums">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-primary">
            <ArrowUpRight className="size-3.5" /> {delta}
          </div>
        </Card>
      ))}
    </div>
  );
}
