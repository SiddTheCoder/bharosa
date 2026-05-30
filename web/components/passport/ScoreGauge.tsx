"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function ScoreGauge({ score, confidence }: { score: number; confidence: number }) {
  const [shown, setShown] = useState(score);
  const shownRef = useRef(score);

  useEffect(() => {
    const controls = animate(shownRef.current, score, {
      duration: 1,
      ease: "easeOut",
      onUpdate: (v) => {
        shownRef.current = v;
        setShown(v);
      }
    });
    return controls.stop;
  }, [score]);

  const pct = Math.min(100, Math.max(0, (shown / 1000) * 100));

  return (
    <div className="relative grid aspect-square place-items-center">
      <div className="absolute inset-6 rounded-full transition-[background] duration-300" style={{ background: `conic-gradient(var(--primary) ${pct}%, var(--border) 0)` }} />
      <div className={cn("absolute inset-10 rounded-full bg-background transition-[filter] duration-500", confidence < 0.6 && "blur-[1px]")} />
      <div className="relative text-center">
        <p className="text-5xl font-semibold tabular-nums">{Math.round(shown)}</p>
        <p className="text-xs uppercase text-muted-foreground">out of 1000</p>
      </div>
    </div>
  );
}
