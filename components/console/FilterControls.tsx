"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useFilters } from "./Filters";
import type { CrimeMeta } from "@/lib/types";

export function CrimeChips({ crimeList }: { crimeList: CrimeMeta[] }) {
  const { crime, setCrime } = useFilters();
  const chips: Array<{ key: "all" | CrimeMeta["key"]; label: string }> = [
    { key: "all", label: "All Crimes" },
    ...crimeList.map((c) => ({ key: c.key, label: c.label })),
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          className={`cs-chip ${crime === c.key ? "cs-chip-active" : ""}`}
          onClick={() => setCrime(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Single-bar dual-handle year window selector.
 *
 * One track only — left handle trims the start year, right handle trims the
 * end year, dragging the filled window shifts the whole range.
 *
 * Lag-free by design:
 * - drag updates LOCAL draft state only (60fps, pointer-capture, no parent
 *   re-render, no router, no fetch while moving),
 * - the parent `onChange` (router.replace + dashboard fetch) is debounced
 *   and fired once on release / after the user settles,
 * - no CSS transitions run while dragging (they are re-enabled on settle).
 */
export function YearRange({
  years,
  from,
  to,
  onChange,
}: {
  years: number[];
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | { mode: "from" | "to" | "window"; startX: number; origF: number; origT: number }
    | null
  >(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lo = years.length ? years[0] : 2001;
  const hi = years.length ? years[years.length - 1] : 2021;
  const span = Math.max(hi - lo, 1);
  const f = Math.min(Math.max(from, lo), hi);
  const t = Math.min(Math.max(to, lo), hi);
  const [winFrom, winTo] = f <= t ? [f, t] : [t, f];

  // Local draft = what the user sees while dragging. Null = synced to props.
  const [draft, setDraft] = useState<{ f: number; t: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dFrom = draft?.f ?? winFrom;
  const dTo = draft?.t ?? winTo;

  // When the committed props catch up (and we're not dragging), drop the draft.
  useEffect(() => {
    if (!dragRef.current) setDraft(null);
  }, [winFrom, winTo]);

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    [],
  );

  const commit = (nf: number, nt: number, immediate: boolean) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    if (immediate) {
      onChangeRef.current(nf, nt);
      return;
    }
    commitTimer.current = setTimeout(() => {
      onChangeRef.current(nf, nt);
    }, 280);
  };

  const yearFromClientX = (clientX: number) => {
    const el = railRef.current;
    if (!el) return lo;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return lo;
    const pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return Math.round(lo + pct * span);
  };

  const draftRef = useRef<{ f: number; t: number } | null>(null);
  draftRef.current = draft;

  // Pointer-move / pointer-up handlers, installed only while dragging.
  // They read anchors from dragRef and the live draft from draftRef —
  // no stale closures, no parent updates until release.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      if (d.mode === "from") {
        const y = yearFromClientX(e.clientX);
        const fixed = draftRef.current?.t ?? d.origT;
        setDraft({ f: Math.min(Math.max(y, lo), fixed), t: fixed });
      } else if (d.mode === "to") {
        const y = yearFromClientX(e.clientX);
        const base = draftRef.current?.f ?? d.origF;
        setDraft({ f: base, t: Math.min(Math.max(Math.max(y, base), lo), hi) });
      } else {
        const el = railRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const deltaYears = Math.round(
          ((e.clientX - d.startX) / Math.max(rect.width, 1)) * span,
        );
        const w = d.origT - d.origF;
        const nf = Math.min(Math.max(d.origF + deltaYears, lo), hi - w);
        setDraft({ f: nf, t: nf + w });
      }
    };
    const onUp = () => {
      dragRef.current = null;
      if (commitTimer.current) clearTimeout(commitTimer.current);
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, lo, hi, span]);

  // Commit once, immediately, when the drag releases.
  useEffect(() => {
    if (!dragging && draftRef.current) {
      const { f: cf, t: ct } = draftRef.current;
      if (cf !== winFrom || ct !== winTo) onChangeRef.current(cf, ct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // Wheel over the rail glides the whole window (debounced commit, live draft).
  useEffect(() => {
    const el = railRef.current;
    if (!el || years.length < 2) return;
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0 || dragRef.current) return;
      e.preventDefault();
      const cur = draftRef.current ?? { f: winFrom, t: winTo };
      const w = cur.t - cur.f;
      if (w >= hi - lo) return;
      const dir = delta > 0 ? 1 : -1;
      let nf = cur.f + dir;
      let nt = nf + w;
      if (nf < lo) {
        nf = lo;
        nt = nf + w;
      }
      if (nt > hi) {
        nt = hi;
        nf = nt - w;
      }
      if (nf === cur.f) return;
      setDraft({ f: nf, t: nt });
      commit(nf, nt, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lo, hi, span, years.length, winFrom, winTo]);

  if (years.length < 2) return null;

  const left = ((dFrom - lo) / span) * 100;
  const width = Math.max(((dTo - dFrom) / span) * 100, (1 / span) * 100 * 0.4);

  const startDrag = (
    e: ReactPointerEvent,
    mode: "from" | "to" | "window",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const base = draftRef.current ?? { f: winFrom, t: winTo };
    dragRef.current = { mode, startX: e.clientX, origF: base.f, origT: base.t };
    if (!draftRef.current) setDraft(base);
    setDragging(true);
  };

  const nudge = (mode: "from" | "to", dir: 1 | -1) => {
    const cur = draftRef.current ?? { f: winFrom, t: winTo };
    if (mode === "from") {
      const nf = Math.min(Math.max(cur.f + dir, lo), cur.t);
      setDraft({ f: nf, t: cur.t });
      commit(nf, cur.t, false);
    } else {
      const nt = Math.min(Math.max(cur.t + dir, cur.f), hi);
      setDraft({ f: cur.f, t: nt });
      commit(cur.f, nt, false);
    }
  };

  const trackJump = (e: ReactPointerEvent) => {
    // Click on empty track moves the nearest handle (no drag).
    if (dragRef.current) return;
    const y = yearFromClientX(e.clientX);
    const cur = draftRef.current ?? { f: winFrom, t: winTo };
    if (Math.abs(y - cur.f) <= Math.abs(y - cur.t)) {
      const nf = Math.min(Math.max(y, lo), cur.t);
      setDraft({ f: nf, t: cur.t });
      commit(nf, cur.t, true);
    } else {
      const nt = Math.min(Math.max(y, cur.f), hi);
      setDraft({ f: cur.f, t: nt });
      commit(cur.f, nt, true);
    }
  };

  return (
    <div className="w-full min-w-[220px] lg:min-w-[300px] select-none">
      <div className="flex items-center justify-between font-mono text-[11px] mb-2">
        <span className="text-primary tabular-nums text-base font-bold">{dFrom}</span>
        <span className="text-faint uppercase tracking-widest text-[9px]">
          observation window · drag ends or middle · {dTo - dFrom + 1} yrs
        </span>
        <span className="text-primary tabular-nums text-base font-bold">{dTo}</span>
      </div>

      <div className="yearrail" role="group" aria-label="Observation window">
        <div
          ref={railRef}
          className="yearrail-track yeardual-track"
          onPointerDown={trackJump}
          style={{ touchAction: "none" }}
        >
          <div
            className={`yearrail-fill${dragging ? " yeardual-noglide" : ""}`}
            style={{ left: `${left}%`, width: `${width}%` }}
            onPointerDown={(e) => startDrag(e, "window")}
            title="Drag to shift window"
          />
          <button
            type="button"
            aria-label={`Window start year, ${dFrom}. Arrow keys adjust.`}
            aria-valuemin={lo}
            aria-valuemax={dTo}
            aria-valuenow={dFrom}
            className="yeardual-handle"
            style={{ left: `${left}%` }}
            onPointerDown={(e) => startDrag(e, "from")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                nudge("from", -1);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                nudge("from", 1);
              }
            }}
          >
            <span className="yeardual-grip" />
          </button>
          <button
            type="button"
            aria-label={`Window end year, ${dTo}. Arrow keys adjust.`}
            aria-valuemin={dFrom}
            aria-valuemax={hi}
            aria-valuenow={dTo}
            className="yeardual-handle"
            style={{ left: `calc(${left}% + ${width}%)` }}
            onPointerDown={(e) => startDrag(e, "to")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                nudge("to", -1);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                nudge("to", 1);
              }
            }}
          >
            <span className="yeardual-grip" />
          </button>
        </div>
        <div className="flex justify-between mt-1.5 font-mono text-[8px] tabular-nums text-faint select-none">
          {years.map((y) => (
            <span
              key={y}
              className={`transition-colors ${y >= dFrom && y <= dTo ? "text-primary/80 font-bold" : ""}`}
            >
              {String(y).slice(2)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
