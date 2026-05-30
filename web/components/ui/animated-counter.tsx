"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  useEffect(() => {
    const controls = animate(displayRef.current, value, {
      duration: 0.8,
      onUpdate: (v) => {
        displayRef.current = v;
        setDisplay(v);
      },
    });
    return controls.stop;
  }, [value]);
  return <span>{prefix}{Math.round(display).toLocaleString()}{suffix}</span>;
}
