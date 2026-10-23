"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Hit {
  type: "state" | "crime" | "year" | "nav" | "insight";
  label: string;
  sub?: string;
  href: string;
}

export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, hits.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter" && hits[active]) {
        router.push(hits[active].href);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, active, router, onClose]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (!query) return;
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setHits(data.hits ?? []);
      setActive(0);
    }, 160);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  if (!open) return null;

  const visibleHits = q.trim() ? hits : [];

  const typeIcon: Record<string, string> = {
    state: "⌖",
    crime: "△",
    year: "◈",
    nav: "»",
    insight: "✦",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh] bg-black/70 backdrop-blur-sm no-print" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl panel p-0 overflow-hidden scale-in"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Universal search"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-primary text-lg">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search states, crimes, years… e.g. Delhi, 2020, Cyber, Top States"
            className="flex-1 bg-transparent outline-none font-mono text-sm text-foreground placeholder:text-faint"
            aria-label="Search"
          />
          <span className="font-mono text-[10px] text-muted border border-border rounded px-2 py-1">ESC</span>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-2">
          {visibleHits.length === 0 && q.trim() === "" ? (
            <p className="px-3 py-6 text-center font-mono text-[11px] text-faint uppercase tracking-widest">
              Query the intelligence index
            </p>
          ) : visibleHits.length === 0 ? (
            <p className="px-3 py-6 text-center font-mono text-[11px] text-faint uppercase tracking-widest">
              no matches for “{q}”
            </p>
          ) : (
            visibleHits.map((h, i) => (
              <button
                key={`${h.type}-${h.label}-${i}`}
                onClick={() => {
                  router.push(h.href);
                  onClose();
                }}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  i === active ? "bg-primary/10 border border-primary/30" : "border border-transparent"
                }`}
              >
                <span className="text-primary text-xs w-4 text-center">{typeIcon[h.type]}</span>
                <span className="font-mono text-sm text-foreground flex-1 truncate">{h.label}</span>
                {h.sub && <span className="font-mono text-[10px] text-muted uppercase tracking-wider truncate">{h.sub}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}