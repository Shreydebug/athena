"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MODULES = [
  "mounting kernel modules",
  "connecting to database",
  "initializing analytics engine",
  "loading intelligence core",
  "calibrating visualization layer",
  "ATHENA OS ready",
];

export default function Boot() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    MODULES.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i), 350 + i * 520));
    });
    const total = 350 + MODULES.length * 520;
    timers.push(setTimeout(() => setProgress(100), total - 200));

    const skip = () => {
      if (done.current) return;
      done.current = true;
      timers.forEach(clearTimeout);
      router.replace("/overview");
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") skip();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("click", skip);
    timers.push(setTimeout(skip, total + 450));

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", key);
      window.removeEventListener("click", skip);
    };
  }, [router]);

  const progressPct = useMemo(() => {
    if (progress > 0) return progress;
    return Math.min(92, ((step + 1) / MODULES.length) * 100);
  }, [step, progress]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void cursor-pointer select-none"
      role="status"
      aria-label="System boot in progress"
    >
      <div className="w-full max-w-xl px-8">
        <div className="flex items-baseline gap-3 mb-8">
          <span className="font-tech text-xl text-primary glow-text blink">▮</span>
          <h1
            className="font-display text-3xl md:text-4xl tracking-[0.3em] text-primary glow-text"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            ATHENA
          </h1>
        </div>

        <div className="space-y-2 font-mono text-[13px] h-44 overflow-hidden">
          <p className="boot-line text-muted" style={{ animationDelay: "100ms" }}>
            &gt; crime_intelligence_system v1.0
          </p>
          {MODULES.map((m, i) => (
            <p
              key={m}
              className="boot-line flex items-center gap-2"
              style={{ animationDelay: `${350 + i * 90}ms` }}
            >
              {step >= i ? (
                <span className="text-primary">[ OK ]</span>
              ) : (
                <span className="text-faint">[ -- ]</span>
              )}
              <span className={step >= i ? "text-foreground" : "text-faint"}>{m}</span>
              {step === i && <span className="blink text-primary">_</span>}
            </p>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex justify-between font-mono text-[11px] text-muted mb-2">
            <span>INITIALIZING CONSOLE</span>
            <span className="text-primary">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 bg-surface border border-border rounded overflow-hidden">
            <div className="boot-progress h-full rounded" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <p className="mt-6 font-mono text-[11px] text-faint tracking-widest uppercase">
          press any key to skip — source: NCRB 2001–2021
        </p>
      </div>
    </div>
  );
}