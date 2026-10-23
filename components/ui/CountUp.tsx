"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function CountUp({
  value,
  format = (v) => v.toLocaleString("en-IN"),
  className = "",
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const v = useCountUp(value);
  return <span className={`count-up-num ${className}`}>{format(v)}</span>;
}