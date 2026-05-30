"use client";

import { useState } from "react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export default function CounterTestPage() {
  const [value, setValue] = useState(720);
  return (
    <div style={{ padding: 40, fontSize: 24 }}>
      <div data-testid="counter">
        <AnimatedCounter value={value} suffix="%" />
      </div>
      <button data-testid="bump" onClick={() => setValue((v) => v + 500)}>
        bump
      </button>
    </div>
  );
}
