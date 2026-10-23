export type CrimeKey =
  | "rape"
  | "kidnapAssault"
  | "dowryDeaths"
  | "assaultWomen"
  | "assaultModesty"
  | "domesticViolence"
  | "trafficking";

export interface CrimeRecord {
  state: string;
  year: number;
  rape: number;
  kidnapAssault: number;
  dowryDeaths: number;
  assaultWomen: number;
  assaultModesty: number;
  domesticViolence: number;
  trafficking: number;
  total: number;
}

export interface CrimeMeta {
  key: CrimeKey;
  label: string;
  color: string;
}

export interface Filters {
  crime: CrimeKey | "all";
  from: number;
  to: number;
  states?: string[]; // empty = all
}

export interface RankEntry {
  rank: number;
  state: string;
  value: number;
  share: number; // % of filtered national total
  growth: number | null; // % change over filter window
  prev: number;
}

export interface Insight {
  severity: "alert" | "warning" | "info" | "positive";
  title: string;
  text: string;
  metric?: string;
}

export interface ForecastPoint {
  year: number;
  value: number;
  forecast: boolean;
}

export interface DashboardPayload {
  meta: {
    years: number[];
    states: string[];
    crimeList: CrimeMeta[];
    source: string;
  };
  filters: Filters;
  hero: {
    total: number;
    avgPerYear: number;
    yoy: number | null;
    statesIncluded: number;
    dominantCrime: { key: CrimeKey; label: string; value: number; share: number } | null;
    peakYear: { year: number; value: number } | null;
  };
  national: Array<{ year: number; total: number; byCrime: Partial<Record<CrimeKey, number>> }>;
  map: Array<{ state: string; value: number; rank: number; share: number; growth: number | null }>;
  rankings: RankEntry[];
  insights: Insight[];
  crimeComposition: Array<{ key: CrimeKey; label: string; value: number; share: number; color: string }>;
  stateSeries: Record<string, Array<{ year: number; value: number }>>;
  stateComposition: Array<{ state: string; byCrime: Partial<Record<CrimeKey, number>> }>;
}

export interface ComparePayload {
  states: string[];
  years: number[];
  crime: CrimeKey | "all";
  rows: Array<{
    state: string;
    color: string;
    total: number;
    avg: number;
    first: number | null;
    last: number | null;
    growth: number | null;
    peakYear: number | null;
    peakValue: number | null;
    series: Array<{ year: number; value: number }>;
    composition: Array<{ key: CrimeKey; label: string; value: number; share: number; color: string }>;
  }>;
  insights: Insight[];
}