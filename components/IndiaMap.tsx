"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { geoConicEqualArea, geoPath } from "d3-geo";
import type { GeoStream } from "d3-geo";
import { useRouter } from "next/navigation";
import type { FeatureCollection } from "geojson";
import { fmt, fmtCompact } from "@/lib/analytics";
import { heatColor } from "@/lib/map-colors";

type Stream = {
  point: (x: number, y: number) => void;
  lineStart: () => void;
  lineEnd: () => void;
  polygonStart: () => void;
  polygonEnd: () => void;
  sphere: () => void;
};

const passThrough = (sink: GeoStream): GeoStream => {
  const s = sink as Stream;
  return {
    point: (x: number, y: number) => s.point(x, y),
    lineStart: () => s.lineStart(),
    lineEnd: () => s.lineEnd(),
    polygonStart: () => s.polygonStart(),
    polygonEnd: () => s.polygonEnd(),
    sphere: () => s.sphere(),
  };
};

interface MapDatum {
  state: string;
  value: number;
  rank: number;
  share: number;
  growth: number | null;
}

const GEO_TO_DATA: Record<string, string[]> = {
  "Andaman & Nicobar": ["Andaman & Nicobar Islands"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra & Nagar Haveli", "Daman & Diu"],
};

export default function IndiaMap({
  data,
  onSelect,
}: {
  data: MapDatum[];
  onSelect?: (state: string) => void;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hover, setHover] = useState<MapDatum | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 800, h: 620 });

  useEffect(() => {
    fetch("/india-states.geojson")
      .then((r) => r.json())
      .then((g) => setGeo(g))
      .catch(() => setGeo(null));
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const byName = useMemo(() => {
    const m = new Map<string, MapDatum>();
    for (const d of data) m.set(d.state, d);
    return m;
  }, [data]);

  const { paths, max } = useMemo(() => {
    if (!geo) return { paths: [], max: 0 };
    const projection = geoConicEqualArea()
      .rotate([-83, 0])
      .center([0, 22])
      .parallels([8, 34])
      .preclip(passThrough);
    const pad = 14;
    const projected: [number, number][] = [];
    for (const f of geo.features) {
      const geom = f.geometry;
      if (geom?.type !== "Polygon" && geom?.type !== "MultiPolygon") continue;
      const rings =
        geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat(1);
      for (const ring of rings) {
        for (const c of ring) {
          const p = projection([c[0], c[1]]);
          if (p) projected.push(p);
        }
      }
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of projected) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const k = Math.min(
      (size.w - 2 * pad) / (x1 - x0),
      (size.h - 2 * pad) / (y1 - y0),
    );
    projection.scale(projection.scale() * k);
    const t = projection.translate();
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    projection.translate([
      size.w / 2 - (cx - t[0]) * k,
      size.h / 2 - (cy - t[1]) * k,
    ]);
    const path = geoPath(projection);
    let m = 0;
    const ps = geo.features.map((f) => {
      const name = (f.properties as Record<string, string>).ST_NM;
      const datumNames = GEO_TO_DATA[name] ?? [name];
      const value = datumNames.reduce((a, n) => a + (byName.get(n)?.value ?? 0), 0);
      if (value > m) m = value;
      return { name, value, d: path(f as never) ?? "" };
    });
    return { paths: ps, max: m };
  }, [geo, size, byName]);

  const colorFor = (value: number) => heatColor(value, max);

  const onMove = (e: React.MouseEvent, name: string) => {
    const datumNames = GEO_TO_DATA[name] ?? [name];
    const merged = datumNames
      .map((n) => byName.get(n))
      .filter((d): d is MapDatum => !!d);
    if (!merged.length) return;
    const d: MapDatum = {
      state: name,
      value: merged.reduce((a, x) => a + x.value, 0),
      rank: merged[0]?.rank ?? 0,
      share: merged.reduce((a, x) => a + x.share, 0),
      growth: merged.length === 1 ? merged[0].growth : null,
    };
    setHover(d);
    const rect = wrapRef.current?.getBoundingClientRect();
    setPos({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
  };

  const click = (name: string) => {
    const datumNames = GEO_TO_DATA[name] ?? [name];
    const target = onSelect ? datumNames[0] : undefined;
    if (target) onSelect?.(target);
    else if (!onSelect) router.push(`/state/${encodeURIComponent(datumNames[0])}`);
  };

  const focusMove = (name: string) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const x = rect ? rect.width * 0.5 : 0;
    const y = rect ? rect.height * 0.4 : 0;
    setPos({ x, y });
    setHover(mergedFor(name));
  };

  function mergedFor(name: string): MapDatum {
    const datumNames = GEO_TO_DATA[name] ?? [name];
    const merged = datumNames
      .map((n) => byName.get(n))
      .filter((d): d is MapDatum => !!d);
    if (!merged.length) {
      return { state: name, value: 0, rank: 0, share: 0, growth: null };
    }
    return {
      state: name,
      value: merged.reduce((a, x) => a + x.value, 0),
      rank: merged[0]?.rank ?? 0,
      share: merged.reduce((a, x) => a + x.share, 0),
      growth: merged.length === 1 ? merged[0].growth : null,
    };
  }

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: 560 }}>
      {!geo ? (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted uppercase tracking-widest">
          <span className="ring-spin inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-3" />
          mapping geometry…
        </div>
      ) : (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="select-none"
          role="img"
          aria-label="India crime heat map"
        >
          <defs>
            <filter id="mapGlow">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {paths.map((p) => {
            const datumNames = GEO_TO_DATA[p.name] ?? [p.name];
            const value = datumNames.reduce((a, n) => a + (byName.get(n)?.value ?? 0), 0);
            const active = hover?.state === p.name;
            const label = `${p.name} — ${fmt(value)} cases, rank ${byName.get(datumNames[0])?.rank ?? "—"}`;
            return (
              <path
                key={p.name}
                d={p.d}
                className="map-path"
                fill={colorFor(value)}
                filter={active ? "url(#mapGlow)" : undefined}
                opacity={value > 0 ? 1 : 0.55}
                role="button"
                tabIndex={0}
                aria-label={label}
                onMouseMove={(e) => onMove(e, p.name)}
                onMouseLeave={() => setHover(null)}
                onClick={() => click(p.name)}
                onFocus={() => focusMove(p.name)}
                onBlur={() => setHover(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    click(p.name);
                  }
                }}
              />
            );
          })}
        </svg>
      )}

      {hover && (
        <div
          className="tooltip-card font-mono"
          style={{
            left: Math.min(pos.x + 14, size.w - 230),
            top: Math.min(pos.y + 14, size.h - 170),
          }}
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="font-display text-sm text-primary uppercase tracking-wider">
              {hover.state}
            </span>
            <span className="text-[10px] text-muted">RANK #{hover.rank}</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between gap-6">
              <span className="text-muted">Total cases</span>
              <span className="text-foreground font-semibold">{fmt(hover.value)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted">Share</span>
              <span className="text-foreground">{hover.share}%</span>
            </div>
            {hover.growth !== null && (
              <div className="flex justify-between gap-6">
                <span className="text-muted">Window growth</span>
                <span className={hover.growth > 0 ? "text-danger" : "text-primary"}>
                  {hover.growth > 0 ? "+" : ""}
                  {hover.growth}%
                </span>
              </div>
            )}
            <div className="flex justify-between gap-6">
              <span className="text-muted">Intensity</span>
              <span className="text-warning">{fmtCompact(hover.value)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex items-center gap-2 font-mono text-[10px] text-muted uppercase tracking-widest">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(255,255,255,0.14)" }} />
        low
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(255,176,42,0.82)" }} />
        mid
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#BB0E0E" }} />
        high
      </div>
    </div>
  );
}