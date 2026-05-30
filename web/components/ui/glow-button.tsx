import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlowButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("h-10 rounded-lg bg-primary px-5 font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90", className)}
      {...props}
    />
  );
}
