import { ReactNode } from "react";

export function Panel({
  title,
  right,
  children,
  className = "",
  corners = true,
  delay = 0,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  corners?: boolean;
  delay?: number;
}) {
  return (
    <section
      className={`panel ${corners ? "panel-corners" : ""} float-in p-4 md:p-5 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="panel-title">{title}</h2>}
          {right && <div className="flex items-center gap-2">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionHeader({
  kicker,
  title,
  right,
}: {
  kicker: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <p className="font-tech text-[11px] text-accent tracking-[0.3em] uppercase">{kicker}</p>
        <h1
          className="font-display text-2xl md:text-3xl text-primary glow-text mt-1"
          style={{ fontFamily: "var(--font-pixel)" }}
        >
          {title}
        </h1>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

export function Tag({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "accent" | "warning" | "danger" | "muted" }) {
  const tones: Record<string, string> = {
    primary: "text-primary border-primary/40 bg-primary/5",
    accent: "text-accent border-accent/40 bg-accent/5",
    warning: "text-warning border-warning/40 bg-warning/5",
    danger: "text-danger border-danger/40 bg-danger/5",
    muted: "text-muted border-border bg-transparent",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}