"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchPalette from "./SearchPalette";
import AccountMenu from "./AccountMenu";
import { useFilters } from "./Filters";

const NAV: Array<{ href: string; label: string; icon: string; section?: string }> = [
  { href: "/overview", label: "Overview", icon: "◉", section: "COMMAND" },
  { href: "/national", label: "National Analytics", icon: "◈" },
  { href: "/state", label: "State Analytics", icon: "⌖" },
  { href: "/compare", label: "Compare", icon: "⇄", section: "ANALYSIS" },
  { href: "/insights", label: "Insights", icon: "✦" },
  { href: "/forecast", label: "Forecast", icon: "⟳" },
  { href: "/reports", label: "Reports", icon: "▤", section: "OUTPUT" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="text-primary tabular-nums">
      {now.toLocaleTimeString("en-GB")} <span className="text-muted">IST</span>
    </span>
  );
}

export default function ConsoleShell({ children, source }: { children: ReactNode; source: string }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const { crime } = useFilters();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));

  return (
    <div className="min-h-screen flex">
      <a
        href="#main"
        className="skip-link font-mono text-[10px] uppercase tracking-widest text-void bg-primary px-4 py-2 rounded-lg"
      >
        Skip to content
      </a>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-56 border-r border-border bg-abyss/90 backdrop-blur-md transition-transform duration-300 md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
          <span className="text-primary text-lg">▮</span>
          <span
            className="font-display text-lg tracking-[0.25em] text-primary glow-text"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            ATHENA
          </span>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 64px)" }}>
          {NAV.map((item, i) => (
            <div key={item.href}>
              {item.section && i > 0 && (
                <p className="px-3 pt-4 pb-1 font-tech text-[9px] text-faint tracking-[0.3em]">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-mono text-[12px] tracking-wider uppercase transition-all ${
                  active?.href === item.href
                    ? "text-void bg-primary shadow-[0_0_18px_rgba(0,245,212,0.35)] font-bold"
                    : "text-muted hover:text-primary hover:bg-primary/5"
                }`}
              >
                <span className="text-[13px]">{item.icon}</span>
                {item.label}
              </Link>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 font-mono text-[9px] text-faint uppercase tracking-widest leading-relaxed">
          <p>NCRB · 2001–2021</p>
          <p className="text-primary/60">intelligence core: ACTIVE</p>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 md:pl-56 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-void/80 backdrop-blur-md flex items-center gap-4 px-4 md:px-6 no-print">
          <button
            className="md:hidden text-primary text-xl"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-tech text-[9px] text-faint tracking-[0.3em] uppercase">sector / console</p>
            <p className="font-display text-sm text-foreground uppercase tracking-[0.2em] truncate">
              {active?.label ?? "Command Center"}
              {crime !== "all" && <span className="text-primary ml-2">· {crime}</span>}
            </p>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-3 font-mono text-[11px] text-muted border border-border rounded-lg px-3 py-2 hover:border-primary/50 hover:text-primary transition-colors w-64"
          >
            <span>⌕</span>
            <span className="flex-1 text-left uppercase tracking-widest">Search…</span>
            <span className="text-[9px] border border-border rounded px-1.5 py-0.5">CTRL K</span>
          </button>
          <button onClick={() => setSearchOpen(true)} className="md:hidden text-primary text-lg" aria-label="Search">
            ⌕
          </button>

          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
            <Clock />
          </div>
          <span
            className={`hidden lg:inline-block font-mono text-[9px] px-2 py-1 rounded border uppercase tracking-widest ${
              source === "mongodb"
                ? "text-accent border-accent/40"
                : "text-muted border-border"
            }`}
            title={source === "mongodb" ? "Serving from MongoDB Atlas" : "Serving from bundled seed data — set MONGODB_URI to switch"}
          >
            {source}
          </span>
          <AccountMenu />
        </header>

        <main id="main" className="flex-1 px-4 md:px-6 py-6 max-w-[1600px] w-full mx-auto">{children}</main>

        <footer className="border-t border-border px-6 py-4 font-mono text-[9px] text-faint uppercase tracking-widest flex flex-wrap gap-x-6 gap-y-1 no-print">
          <span>ATHENA v1.0</span>
          <span>data: NCRB crimes against women 2001–2021</span>
          <span>coded for analysis — not for citation as official statistics</span>
        </footer>
      </div>

      <SearchPalette key={String(searchOpen)} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}