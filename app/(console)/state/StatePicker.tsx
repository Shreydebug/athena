"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, SectionHeader, Tag } from "@/components/ui/Panel";
import { RankingsTable } from "@/components/console/Modules";
import { useFilters } from "@/components/console/Filters";
import IndiaMap from "@/components/IndiaMap";
import { heatStop } from "@/lib/map-colors";
import type { DashboardPayload } from "@/lib/types";

export default function StatePicker({ states }: { states: string[] }) {
  const router = useRouter();
  const { crime, from, to } = useFilters();
  const [q, setQ] = useState("");
  const [atlas, setAtlas] = useState<DashboardPayload | null>(null);

  const filtered = useMemo(
    () => states.filter((s) => s.toLowerCase().includes(q.toLowerCase())),
    [states, q],
  );

  // Burden atlas lives here now (merged from the old /heatmap route).
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ from: String(from), to: String(to) });
    if (crime !== "all") params.set("crime", crime);
    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then((d) => alive && setAtlas(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [crime, from, to]);

  const crimeLabel = atlas?.meta.crimeList.find((c) => c.key === crime)?.label ?? "All Crimes";

  const legend = useMemo(() => {
    if (!atlas) return null;
    const max = Math.max(...atlas.map.map((m) => m.value), 1);
    return (
      <div className="flex items-center gap-1 font-mono text-[9px] text-muted uppercase tracking-widest">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span
            key={t}
            className="inline-block w-5 h-2.5 rounded-sm"
            style={{ background: heatStop(t) }}
          />
        ))}
        <span className="ml-2">0 → {max.toLocaleString("en-IN")}</span>
      </div>
    );
  }, [atlas]);

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="state intelligence"
        title="State Analytics"
        right={
          <div className="flex gap-2">
            <Tag tone="accent">36 ENTITIES</Tag>
            <Tag>{crimeLabel}</Tag>
            <Tag tone="accent">{from}–{to}</Tag>
          </div>
        }
      />

      <div className="dossier-lede dossier-lede-tight">
        <p className="dossier-sub">
          The heat atlas now lives here, not on a separate page. Read the map, then drop
          into any state dossier — divisions, crimes, ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Burden Atlas" corners className="xl:col-span-2" right={legend}>
          {atlas ? (
            <IndiaMap
              data={atlas.map}
              onSelect={(s) => router.push(`/state/${encodeURIComponent(s)}`)}
            />
          ) : (
            <p className="font-mono text-[11px] text-faint py-10 text-center">loading atlas…</p>
          )}
          <p className="font-mono text-[10px] text-muted leading-relaxed mt-2">
            Shaded white → red on a log-normalised scale. Hover for the intelligence card,
            click any state to open its dossier.
          </p>
        </Panel>
        <Panel title="Heaviest Burdens" right={<Tag tone="accent">TOP 7</Tag>}>
          {atlas && <RankingsTable rows={atlas.rankings} limit={7} />}
        </Panel>
      </div>

      <Panel title="Select Target State" className="!p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter states…"
          className="w-full bg-transparent border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-faint focus:border-primary/60 focus:shadow-[0_0_14px_rgba(0,245,212,0.15)] outline-none"
          aria-label="Filter states"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 mt-4 max-h-[52vh] overflow-y-auto pr-1">
          {filtered.map((s) => (
            <button
              key={s}
              onClick={() => router.push(`/state/${encodeURIComponent(s)}?from=${from}&to=${to}`)}
              className="cs-chip !py-2.5 text-left !rounded-lg hover:!bg-primary/10"
            >
              {s}
            </button>
          ))}
          {!filtered.length && (
            <p className="col-span-full text-center font-mono text-xs text-faint uppercase tracking-widest py-8">
              no state matches “{q}”
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
