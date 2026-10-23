"use client";

import { ReactNode, useState } from "react";

/** Collapsed-by-default temporal view. Timelines live here — never forced on the page. */
export default function TemporalToggle({
  title = "Temporal view",
  hint = "year-by-year curve · optional",
  children,
  defaultOpen = false,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="temporal-root">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="temporal-head"
      >
        <span className="flex items-center gap-2">
          <span className={`temporal-dot ${open ? "temporal-dot-on" : ""}`} />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            {title}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-faint">
            {hint}
          </span>
        </span>
        <span className="cs-btn !py-1 !px-2">{open ? "■ hide" : "▶ reveal"}</span>
      </button>
      {open && <div className="temporal-body float-in">{children}</div>}
      {!open && (
        <p className="font-mono text-[10px] text-faint px-1 pb-1">
          Hidden to keep this view structural — reveal only if you need chronology.
        </p>
      )}
    </div>
  );
}
