"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface User {
  email: string;
  name: string;
}

interface SavedView {
  id: string;
  name: string;
  path: string;
  params: string;
  createdAt: number;
}

const LS_KEY = "athena-views";

type Tab = "closed" | "account" | "views";

export default function AccountMenu() {
  const [tab, setTab] = useState<Tab>("closed");
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [views, setViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const refreshViews = useCallback(async () => {
    if (user) {
      try {
        const res = await fetch("/api/views");
        const data = (await res.json()) as { views: SavedView[] };
        setViews(data.views ?? []);
      } catch {
        setViews([]);
      }
    } else {
      try {
        const raw = localStorage.getItem(LS_KEY);
        setViews(raw ? (JSON.parse(raw) as SavedView[]) : []);
      } catch {
        setViews([]);
      }
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user: User | null };
        if (alive) setUser(data.user ?? null);
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (user) {
        try {
          const res = await fetch("/api/views");
          const data = (await res.json()) as { views: SavedView[] };
          if (alive) setViews(data.views ?? []);
        } catch {
          if (alive) setViews([]);
        }
      } else {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (alive) setViews(raw ? (JSON.parse(raw) as SavedView[]) : []);
        } catch {
          if (alive) setViews([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTab("closed");
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setTab("closed");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  async function submitAuth() {
    setError(null);
    if (!email || !password) {
      setError("email and password are required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = (await res.json()) as { user?: User; error?: string };
      if (!res.ok) {
        setError(data.error ?? "request failed");
        setBusy(false);
        return;
      }
      setUser(data.user ?? null);
      setEmail("");
      setPassword("");
      setName("");
      setTab("closed");
    } catch {
      setError("network error");
    }
    setBusy(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setTab("closed");
    router.refresh();
  }

  async function saveView() {
    const params = searchParams.toString();
    const record = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
      name: viewName.trim() || `view · ${new Date().toLocaleDateString()}`,
      path: pathname,
      params,
      createdAt: Date.now(),
    };
    if (user) {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: record.name, path: pathname, params }),
      });
      if (!res.ok) {
        setSavedNote("save failed");
        return;
      }
    } else {
      try {
        const raw = localStorage.getItem(LS_KEY);
        const existing: SavedView[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(LS_KEY, JSON.stringify([record, ...existing].slice(0, 50)));
      } catch {
        setSavedNote("local storage unavailable");
        return;
      }
    }
    setViewName("");
    setSavedNote(`saved: ${record.name}`);
    setTimeout(() => setSavedNote(null), 2500);
    refreshViews();
  }

  async function deleteView(id: string) {
    if (user) {
      await fetch(`/api/views?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    } else {
      try {
        const existing: SavedView[] = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
        localStorage.setItem(
          LS_KEY,
          JSON.stringify(existing.filter((v) => v.id !== id)),
        );
      } catch {}
    }
    refreshViews();
  }

  function loadView(v: SavedView) {
    setTab("closed");
    const q = v.params ? `?${v.params}` : "";
    router.push(`${v.path || "/overview"}${q}`);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("views")}
          className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-2 rounded-lg border transition-colors ${
            tab === "views"
              ? "text-void bg-primary border-primary"
              : "text-muted border-border hover:text-primary hover:border-primary/50"
          }`}
          aria-label="Saved views"
          aria-expanded={tab === "views"}
        >
          ▤ VIEWS
        </button>
        <button
          onClick={() => setTab(tab === "account" ? "closed" : "account")}
          className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-2 rounded-lg border transition-colors ${
            tab === "account"
              ? "text-void bg-primary border-primary"
              : "text-muted border-border hover:text-primary hover:border-primary/50"
          }`}
          aria-label={user ? `Signed in as ${user.email}` : "Sign in or register"}
          aria-expanded={tab === "account"}
        >
          {user ? "◈ " + (user.name || user.email.split("@")[0]) : "SIGN IN"}
        </button>
      </div>

      {tab === "account" && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-surface/95 backdrop-blur-md p-4 shadow-[0_12px_48px_rgba(0,0,0,0.6)] animate-rise">
          {user ? (
            <div className="space-y-3">
              <p className="font-tech text-[9px] text-faint tracking-[0.3em] uppercase">identity</p>
              <p className="font-mono text-[12px] text-primary">{user.name || user.email}</p>
              <p className="font-mono text-[10px] text-muted">{user.email}</p>
              <button
                onClick={logout}
                className="w-full font-mono text-[10px] uppercase tracking-widest text-danger border border-danger/40 rounded-lg px-3 py-2 hover:bg-danger/10 transition-colors"
              >
                Sign out
              </button>
              <p className="font-mono text-[9px] text-faint leading-relaxed">
                Saved views are stored server-side on your account. Without an account they are
                stored locally in this browser.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex rounded-lg overflow-hidden border border-border font-mono text-[10px] uppercase tracking-widest">
                <button
                  onClick={() => setMode("login")}
                  className={`flex-1 px-3 py-2 transition-colors ${
                    mode === "login" ? "bg-primary text-void" : "text-muted hover:text-primary"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setMode("register")}
                  className={`flex-1 px-3 py-2 transition-colors ${
                    mode === "register" ? "bg-primary text-void" : "text-muted hover:text-primary"
                  }`}
                >
                  Register
                </button>
              </div>
              {mode === "register" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name"
                  className="w-full bg-abyss border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-faint focus:border-primary/60 focus:outline-none"
                  aria-label="Display name"
                />
              )}
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                autoComplete="email"
                className="w-full bg-abyss border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-faint focus:border-primary/60 focus:outline-none"
                aria-label="Email"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                onKeyDown={(e) => e.key === "Enter" && submitAuth()}
                className="w-full bg-abyss border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-faint focus:border-primary/60 focus:outline-none"
                aria-label="Password"
              />
              {error && <p className="font-mono text-[10px] text-danger">{error}</p>}
              <button
                onClick={submitAuth}
                disabled={busy}
                className="w-full font-mono text-[10px] uppercase tracking-widest text-void bg-primary rounded-lg px-3 py-2 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
              </button>
              <p className="font-mono text-[9px] text-faint leading-relaxed">
                Accounts enable cloud-synced saved dashboards. Browsing works without one.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "views" && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-xl border border-border bg-surface/95 backdrop-blur-md p-4 shadow-[0_12px_48px_rgba(0,0,0,0.6)] animate-rise">
          <p className="font-tech text-[9px] text-faint tracking-[0.3em] uppercase mb-3">
            saved dashboards {user ? "· cloud" : "· local"}
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveView()}
              placeholder="View name…"
              className="flex-1 bg-abyss border border-border rounded-lg px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-faint focus:border-primary/60 focus:outline-none min-w-0"
              aria-label="Saved view name"
            />
            <button
              onClick={saveView}
              className="font-mono text-[10px] uppercase tracking-widest text-void bg-primary rounded-lg px-3 py-2 hover:brightness-110 transition-all"
            >
              Save
            </button>
          </div>
          {savedNote && <p className="font-mono text-[10px] text-primary mb-2">{savedNote}</p>}
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {views.length === 0 && (
              <p className="font-mono text-[10px] text-faint py-4 text-center">
                no saved views — save the current filter state
              </p>
            )}
            {views.map((v) => (
              <div
                key={v.id}
                className="group flex items-center gap-2 rounded-lg border border-border/60 bg-abyss/60 px-3 py-2 hover:border-primary/40 transition-colors"
              >
                <button
                  onClick={() => loadView(v)}
                  className="flex-1 min-w-0 text-left"
                  aria-label={`Load view ${v.name}`}
                >
                  <p className="font-mono text-[11px] text-foreground truncate">{v.name}</p>
                  <p className="font-mono text-[9px] text-faint truncate">
                    {v.path || "/overview"}
                    {v.params ? " · " + v.params : ""} ·{" "}
                    {new Date(v.createdAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => deleteView(v.id)}
                  className="text-faint hover:text-danger transition-colors px-1 font-mono"
                  aria-label={`Delete view ${v.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}