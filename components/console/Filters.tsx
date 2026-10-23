"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CrimeKey } from "@/lib/types";

interface FilterCtx {
  crime: CrimeKey | "all";
  from: number;
  to: number;
  setCrime: (c: CrimeKey | "all") => void;
  setRange: (from: number, to: number) => void;
  reset: () => void;
}

const Ctx = createContext<FilterCtx | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const crimeParam = sp.get("crime");
  const fromParam = Number(sp.get("from"));
  const toParam = Number(sp.get("to"));
  const crime: CrimeKey | "all" =
    crimeParam && crimeParam !== "all" ? (crimeParam as CrimeKey) : "all";
  const from = Number.isFinite(fromParam) && fromParam >= 2001 && fromParam <= 2021 ? fromParam : 2001;
  const to = Number.isFinite(toParam) && toParam >= 2001 && toParam <= 2021 ? toParam : 2021;

  const [busy, setBusy] = useState(0);

  const update = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    setBusy((b) => b + 1);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (busy === 0) return;
    const t = setTimeout(() => setBusy(0), 300);
    return () => clearTimeout(t);
  }, [busy]);

  return (
    <Ctx.Provider
      value={{
        crime,
        from: Math.min(from, to),
        to: Math.max(from, to),
        setCrime: (c) => update({ crime: c === "all" ? null : c }),
        setRange: (f, t) => update({ from: f === 2001 ? null : String(f), to: t === 2021 ? null : String(t) }),
        reset: () => {
          setBusy((b) => b + 1);
          router.replace(pathname, { scroll: false });
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFilters(): FilterCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}