"use client";

import { useEffect, useState } from "react";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";

export default function SettingsPage() {
  const [accent, setAccent] = useState(
    () => (typeof window !== "undefined" ? (localStorage.getItem("athena-accent") ?? "#00F5D4") : "#00F5D4"),
  );
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("athena-reduced-motion") === "1",
  );
  const [source, setSource] = useState("seed");
  const [records, setRecords] = useState(0);

  useEffect(() => {
    fetch("/api/meta").then((r) => r.json()).then((d) => {
      setSource(d.source ?? "seed");
      setRecords(d.states?.length ?? 0);
    });
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent-var", accent);
    document.documentElement.style.setProperty(
      "--accent-var-soft",
      accent + "24",
    );
    localStorage.setItem("athena-accent", accent);
  }, [accent]);

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.style.setProperty("--motion", "0");
      document.documentElement.classList.add("motion-reduced");
    } else {
      document.documentElement.classList.remove("motion-reduced");
    }
    localStorage.setItem("athena-reduced-motion", reducedMotion ? "1" : "0");
  }, [reducedMotion]);

  const ACCENTS = ["#00F5D4", "#8B5CF6", "#FFD166", "#FF4D6D", "#38BDF8", "#F472B6"];

  return (
    <div className="space-y-6">
      <SectionHeader kicker="console preferences" title="Settings" right={<Tag tone="muted">LOCAL</Tag>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Accent Color" right={<Tag tone="muted">THEME</Tag>}>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => setAccent(c)}
                className="w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: accent === c ? "#ffffff" : "transparent",
                  boxShadow: accent === c ? `0 0 18px ${c}` : "none",
                }}
                aria-label={`Set accent ${c}`}
              />
            ))}
          </div>
          <p className="font-mono text-[10px] text-muted mt-4">
            Current: <span className="text-primary">{accent}</span> — applies to panels, charts, highlights.
          </p>
        </Panel>

        <Panel title="Motion" right={<Tag tone="muted">ACCESSIBILITY</Tag>}>
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`cs-chip !py-3 !text-[11px] ${reducedMotion ? "cs-chip-active" : ""}`}
          >
            {reducedMotion ? "REDUCED MOTION: ON" : "REDUCED MOTION: OFF"}
          </button>
          <p className="font-mono text-[10px] text-muted mt-4 leading-relaxed">
            Reduces ambient animation (grid drift, radar sweep, noise) while keeping
            data-driven transitions legible.
          </p>
        </Panel>

        <Panel title="Data Source" right={<Tag tone={source === "mongodb" ? "accent" : "muted"}>{source.toUpperCase()}</Tag>}>
          <div className="space-y-2 font-mono text-[11px] text-muted">
            <p>Currently serving from <span className="text-primary">{source === "mongodb" ? "MongoDB Atlas" : "bundled seed data"}</span>.</p>
            <p className="text-faint leading-relaxed">
              {source === "mongodb"
                ? "The API layer resolves queries against crime_records with precomputed analytics caches."
                : "Set MONGODB_URI (and optionally MONGODB_DB) in .env.local, run npm run import:mongo, and the API layer switches automatically."}
            </p>
          </div>
        </Panel>

        <Panel title="System" right={<Tag tone="muted">STATUS</Tag>}>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-muted">Dataset</span><span className="text-foreground">NCRB Crimes Against Women</span></div>
            <div className="flex justify-between"><span className="text-muted">Coverage</span><span className="text-foreground">2001 – 2021</span></div>
            <div className="flex justify-between"><span className="text-muted">Entities</span><span className="text-foreground">{records} states &amp; UTs</span></div>
            <div className="flex justify-between"><span className="text-muted">Crime types</span><span className="text-foreground">7</span></div>
            <div className="flex justify-between"><span className="text-muted">Version</span><span className="text-foreground">1.0.0</span></div>
          </div>
          <p className="font-mono text-[10px] text-warning mt-4 leading-relaxed">
            ⚠ Definitional note: post-2014 NCRB reclassification (IPC amendments &amp; new
            offence codes) causes sharp breaks in several series (e.g. domestic violence and
            assault categories). Treat large single-year swings around 2014 as reporting
            changes, not necessarily real crime movement.
          </p>
        </Panel>
      </div>
    </div>
  );
}