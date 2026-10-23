import type {
  CrimeKey,
  CrimeMeta,
  CrimeRecord,
  Filters,
  ForecastPoint,
  Insight,
  RankEntry,
} from "./types";

export const CRIME_KEYS: CrimeKey[] = [
  "rape",
  "kidnapAssault",
  "dowryDeaths",
  "assaultWomen",
  "assaultModesty",
  "domesticViolence",
  "trafficking",
];

export const CRIME_META: CrimeMeta[] = [
  { key: "rape", label: "Rape", color: "#00F5D4" },
  { key: "kidnapAssault", label: "Kidnap & Assault", color: "#64FFDA" },
  { key: "dowryDeaths", label: "Dowry Deaths", color: "#8B5CF6" },
  { key: "assaultWomen", label: "Assault Against Women", color: "#FFD166" },
  { key: "assaultModesty", label: "Assault on Modesty", color: "#FF4D6D" },
  { key: "domesticViolence", label: "Domestic Violence", color: "#38BDF8" },
  { key: "trafficking", label: "Women Trafficking", color: "#F472B6" },
];

export const crimeMeta = (key: CrimeKey | "all"): CrimeMeta | undefined =>
  CRIME_META.find((c) => c.key === key);

/* ------------------------------------------------------------------ */
/* Crime hierarchy: Division → Crime → Crime dossier (state/year lens) */
/* Three non-overlapping divisions cover all 7 NCRB categories so the  */
/* UI can drill Total → Division → Crime → Detail without repetition.  */
/* ------------------------------------------------------------------ */

export interface CrimeDivision {
  key: string;
  label: string;
  tagline: string;
  icon: string;
  color: string;
  crimes: CrimeKey[];
}

export const CRIME_DIVISIONS: CrimeDivision[] = [
  {
    key: "bodily",
    label: "Bodily & Sexual Assault",
    tagline: "Direct physical and sexual violence on the person",
    icon: "◉",
    color: "#FF4D6D",
    crimes: ["rape", "assaultWomen", "assaultModesty"],
  },
  {
    key: "kinship",
    label: "Home & Dowry Cruelty",
    tagline: "Cruelty inside marriage and dowry-linked deaths",
    icon: "⌂",
    color: "#FFD166",
    crimes: ["domesticViolence", "dowryDeaths"],
  },
  {
    key: "capture",
    label: "Abduction & Exploitation",
    tagline: "Taken, moved or trafficked — control over mobility",
    icon: "⇄",
    color: "#38BDF8",
    crimes: ["kidnapAssault", "trafficking"],
  },
];

export const divisionOf = (crime: CrimeKey): CrimeDivision | undefined =>
  CRIME_DIVISIONS.find((d) => d.crimes.includes(crime));

export function divisionTotals(
  composition: Array<{ key: CrimeKey; value: number }>,
): Array<{ division: CrimeDivision; value: number; share: number }> {
  const total = composition.reduce((a, c) => a + c.value, 0);
  return CRIME_DIVISIONS.map((division) => {
    const value = composition
      .filter((c) => division.crimes.includes(c.key))
      .reduce((a, c) => a + c.value, 0);
    return {
      division,
      value,
      share: total ? Math.round((value / total) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.value - a.value);
}

export function topStatesForCrime(
  stateComposition: Array<{ state: string; byCrime: Partial<Record<CrimeKey, number>> }>,
  crime: CrimeKey,
  limit = 5,
): Array<{ state: string; value: number; share: number }> {
  const rows = stateComposition
    .map((s) => ({ state: s.state, value: s.byCrime[crime] ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((a, r) => a + r.value, 0);
  return rows.slice(0, limit).map((r) => ({
    ...r,
    share: total ? Math.round((r.value / total) * 1000) / 10 : 0,
  }));
}

export const valueOf = (r: CrimeRecord, crime: CrimeKey | "all"): number =>
  crime === "all" ? r.total : r[crime];

export function filterRecords(
  records: CrimeRecord[],
  f: Filters,
): CrimeRecord[] {
  return records.filter(
    (r) =>
      r.year >= f.from &&
      r.year <= f.to &&
      (!f.states || f.states.length === 0 || f.states.includes(r.state)),
  );
}

export function nationalSeries(
  records: CrimeRecord[],
  crime: CrimeKey | "all",
  years: number[],
): Array<{ year: number; total: number; byCrime: Partial<Record<CrimeKey, number>> }> {
  return years.map((year) => {
    const yr = records.filter((r) => r.year === year);
    const byCrime: Partial<Record<CrimeKey, number>> = {};
    let total = 0;
    for (const k of CRIME_KEYS) {
      const v = yr.reduce((a, r) => a + r[k], 0);
      byCrime[k] = v;
      total += v;
    }
    return { year, total, byCrime };
  });
}

export function growthPct(a: number, b: number): number | null {
  if (a === 0) return null;
  return Math.round(((b - a) / a) * 1000) / 10;
}

export function sum(records: CrimeRecord[], crime: CrimeKey | "all"): number {
  return records.reduce((a, r) => a + valueOf(r, crime), 0);
}

export function peakYear(
  series: Array<{ year: number; value: number }>,
): { year: number; value: number } | null {
  if (!series.length) return null;
  return series.reduce((a, b) => (b.value > a.value ? b : a), series[0]);
}

export function dominantCrime(
  records: CrimeRecord[],
): { key: CrimeKey; label: string; value: number; share: number } | null {
  const totals = CRIME_KEYS.map((k) => ({
    key: k,
    value: records.reduce((a, r) => a + r[k], 0),
  }));
  const total = totals.reduce((a, t) => a + t.value, 0);
  if (total === 0) return null;
  const top = totals.reduce((a, b) => (b.value > a.value ? b : a), totals[0]);
  return {
    key: top.key,
    label: crimeMeta(top.key)?.label ?? top.key,
    value: top.value,
    share: Math.round((top.value / total) * 1000) / 10,
  };
}

export function buildRankings(
  records: CrimeRecord[],
  crime: CrimeKey | "all",
  states: string[],
): RankEntry[] {
  const rows = states
    .map((state) => {
      const s = records.filter((r) => r.state === state);
      const byYear = new Map<number, number>();
      for (const r of s) byYear.set(r.year, valueOf(r, crime));
      const yearsSorted = [...byYear.keys()].sort((a, b) => a - b);
      const first = yearsSorted.length ? byYear.get(yearsSorted[0]) ?? 0 : 0;
      const last = yearsSorted.length ? byYear.get(yearsSorted[yearsSorted.length - 1]) ?? 0 : 0;
      const value = s.reduce((a, r) => a + valueOf(r, crime), 0);
      return {
        state,
        value,
        growth: growthPct(first, last),
        prev: last,
        first,
        last,
      };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((a, r) => a + r.value, 0);
  return rows.map((r, i) => ({
    rank: i + 1,
    state: r.state,
    value: r.value,
    share: total ? Math.round((r.value / total) * 1000) / 10 : 0,
    growth: r.growth,
    prev: r.prev,
  }));
}

export function linearForecast(
  series: Array<{ year: number; value: number }>,
  horizon: number,
): ForecastPoint[] {
  const pts = series.filter((p) => p.value > 0);
  if (pts.length < 3) return [];
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.year, 0) / n;
  const my = pts.reduce((a, p) => a + p.value, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.year - mx) * (p.value - my);
    den += (p.year - mx) ** 2;
  }
  if (den === 0) return [];
  const slope = num / den;
  const intercept = my - slope * mx;
  const last = series[series.length - 1];
  const out: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    const year = last.year + i;
    const v = Math.max(0, Math.round(slope * year + intercept));
    out.push({ year, value: v, forecast: true });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rule-based intelligence summaries                                   */
/* ------------------------------------------------------------------ */

export function generateInsights(
  rankings: RankEntry[],
  national: Array<{ year: number; total: number }>,
  states: string[],
  crime: CrimeKey | "all",
  crimeLabel: string,
): Insight[] {
  const out: Insight[] = [];
  if (national.length < 2) return out;

  const first = national[0].total;
  const last = national[national.length - 1].total;
  const g = growthPct(first, last);

  if (g !== null) {
    out.push({
      severity: g > 25 ? "alert" : g < -10 ? "positive" : "info",
      title: g > 25 ? "National surge detected" : "National trajectory",
      text:
        `${crimeLabel} cases ${g > 0 ? "rose" : "fell"} by ${Math.abs(g)}% nationally between ` +
        `${national[0].year} and ${national[national.length - 1].year} ` +
        `(${first.toLocaleString("en-IN")} → ${last.toLocaleString("en-IN")}).`,
      metric: `${g > 0 ? "+" : ""}${g}%`,
    });
  }

  if (rankings.length >= 2) {
    const top = rankings[0];
    const worst = rankings[rankings.length - 1];
    out.push({
      severity: "alert",
      title: "Hotspot: " + top.state,
      text:
        `${top.state} leads with ${top.value.toLocaleString("en-IN")} total cases ` +
        `(${top.share}% of national ${crimeLabel} load) and holds rank #1 of ${rankings.length}.`,
      metric: `${top.share}% share`,
    });
    if (worst.state !== top.state && worst.value > 0) {
      out.push({
        severity: "positive",
        title: "Lowest exposure: " + worst.state,
        text:
          `${worst.state} recorded the fewest ${crimeLabel} cases ` +
          `(${worst.value.toLocaleString("en-IN")} total) across ${states.length} reporting entities.`,
      });
    }
  }

  const withGrowth = rankings.filter((r) => r.growth !== null).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0));
  if (withGrowth.length >= 2) {
    const riser = withGrowth[0];
    if ((riser.growth ?? 0) > 20) {
      out.push({
        severity: "warning",
        title: "Fastest riser: " + riser.state,
        text:
          `${riser.state} recorded the sharpest increase in ${crimeLabel} at +${riser.growth}% ` +
          `across the selected window — well above the national ${g ?? 0}%.`,
        metric: `+${riser.growth}%`,
      });
    }
    const faller = withGrowth[withGrowth.length - 1];
    if ((faller.growth ?? 0) < -20) {
      out.push({
        severity: "positive",
        title: "Sharpest decline: " + faller.state,
        text:
          `${faller.state} shows the strongest reduction at ${faller.growth}%, ` +
          `suggesting effective intervention or reporting changes.`,
        metric: `${faller.growth}%`,
      });
    }
  }

  let maxDelta = 0;
  let spikeYear = national[0].year;
  for (let i = 1; i < national.length; i++) {
    const d = Math.abs(national[i].total - national[i - 1].total);
    if (d > maxDelta) {
      maxDelta = d;
      spikeYear = national[i].year;
    }
  }
  if (maxDelta > 0 && national.length >= 3) {
    const pct = national[0].total
      ? Math.round((maxDelta / (national[0].total / national.length)) * 100) / 10
      : 0;
    if (pct > 15) {
      out.push({
        severity: "warning",
        title: `Anomalous shift in ${spikeYear}`,
        text:
          `The largest single-year swing in ${crimeLabel} occurred in ${spikeYear} ` +
          `(±${maxDelta.toLocaleString("en-IN")} cases), ${pct}% off the window average — ` +
          `flagged for further investigation.`,
        metric: `${spikeYear}`,
      });
    }
  }

  if (national.length >= 4 && national.length <= 12) {
    const mid = Math.floor(national.length / 2);
    const half1 = national.slice(0, mid).reduce((a, p) => a + p.total, 0);
    const half2 = national.slice(mid).reduce((a, p) => a + p.total, 0);
    if (half1 > 0) {
      const shift = Math.round(((half2 - half1) / half1) * 1000) / 10;
      out.push({
        severity: shift > 25 ? "alert" : shift < -10 ? "positive" : "info",
        title: "Window trajectory",
        text:
          `Second half of the window carries ${shift > 0 ? "+" : ""}${shift}% of the ${crimeLabel} caseload ` +
          `relative to the first half (${half1.toLocaleString("en-IN")} vs ${half2.toLocaleString("en-IN")}).`,
        metric: `${shift > 0 ? "+" : ""}${shift}%`,
      });
    }
  }

  return out.slice(0, 6);
}

export const fmt = (n: number): string => n.toLocaleString("en-IN");

export const fmtCompact = (n: number): string => {
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(2) + "Cr";
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + "L";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};