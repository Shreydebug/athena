/**
 * CRIMESCAPE ETL — Stage 1: Normalize raw CSV into seed JSON.
 *
 * Raw CSV is NEVER served directly (spec §15). This script:
 *  - parses the raw CSV
 *  - normalizes state naming (aliases, casing)
 *  - validates numeric fields
 *  - derives canonical keys + totals
 *  - precomputes analytics caches (national series, state series, rankings)
 *
 * Output:
 *  lib/data/states.json   — entity registry
 *  lib/data/records.json  — clean records
 *  lib/data/cache.json    — precomputed aggregations
 *  lib/data/crimes.json   — crime type metadata
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "CrimesOnWomenData.csv");
const OUT = join(ROOT, "lib", "data");

/* ------------------------------------------------------------------ */
/* State normalization                                                 */
/* ------------------------------------------------------------------ */

const ALIASES = {
  "A & N ISLANDS": "Andaman & Nicobar Islands",
  "A AND N ISLANDS": "Andaman & Nicobar Islands",
  "ANDAMAN AND NICOBAR ISLANDS": "Andaman & Nicobar Islands",
  "ANDAMAN & NICOBAR ISLANDS": "Andaman & Nicobar Islands",
  "ANDHRA PRADESH": "Andhra Pradesh",
  "ARUNACHAL PRADESH": "Arunachal Pradesh",
  "ASSAM": "Assam",
  "BIHAR": "Bihar",
  "CHANDIGARH": "Chandigarh",
  "CHHATTISGARH": "Chhattisgarh",
  "D & N HAVELI": "Dadra & Nagar Haveli",
  "D&N HAVELI": "Dadra & Nagar Haveli",
  "DADRA AND NAGAR HAVELI": "Dadra & Nagar Haveli",
  "DADRA & NAGAR HAVELI": "Dadra & Nagar Haveli",
  "DAMAN & DIU": "Daman & Diu",
  "DAMAN AND DIU": "Daman & Diu",
  "DELHI UT": "Delhi",
  "DELHI": "Delhi",
  "NCT OF DELHI": "Delhi",
  "GOA": "Goa",
  "GUJARAT": "Gujarat",
  "HARYANA": "Haryana",
  "HIMACHAL PRADESH": "Himachal Pradesh",
  "JAMMU & KASHMIR": "Jammu & Kashmir",
  "JAMMU AND KASHMIR": "Jammu & Kashmir",
  "JHARKHAND": "Jharkhand",
  "KARNATAKA": "Karnataka",
  "KERALA": "Kerala",
  "LAKSHADWEEP": "Lakshadweep",
  "MADHYA PRADESH": "Madhya Pradesh",
  "MAHARASHTRA": "Maharashtra",
  "MANIPUR": "Manipur",
  "MEGHALAYA": "Meghalaya",
  "MIZORAM": "Mizoram",
  "NAGALAND": "Nagaland",
  "ODISHA": "Odisha",
  "ORISSA": "Odisha",
  "PUDUCHERRY": "Puducherry",
  "PONDICHERRY": "Puducherry",
  "PUNJAB": "Punjab",
  "RAJASTHAN": "Rajasthan",
  "SIKKIM": "Sikkim",
  "TAMIL NADU": "Tamil Nadu",
  "TELANGANA": "Telangana",
  "TRIPURA": "Tripura",
  "UTTAR PRADESH": "Uttar Pradesh",
  "UTTARAKHAND": "Uttarakhand",
  "WEST BENGAL": "West Bengal",
};

const CRIME_KEYS = [
  ["Rape", "rape"],
  ["K&A", "kidnapAssault"],
  ["DD", "dowryDeaths"],
  ["AoW", "assaultWomen"],
  ["AoM", "assaultModesty"],
  ["DV", "domesticViolence"],
  ["WT", "trafficking"],
];

/* ------------------------------------------------------------------ */
/* Minimal CSV parser (handles quoted fields)                          */
/* ------------------------------------------------------------------ */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const text = readFileSync(RAW, "utf8");
const rows = parseCsv(text);
const header = rows[0].map((h) => h.trim());
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const records = [];
const seen = new Set();
let dropped = 0;

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (row.length < 2 || !row[idx.Year]) continue;

  const rawState = String(row[idx.State] ?? "").trim();
  const canonical = ALIASES[rawState.toUpperCase()];
  if (!canonical) {
    console.warn(`[skip] unknown state: "${rawState}"`);
    dropped++;
    continue;
  }
  const year = Number(row[idx.Year]);
  if (!Number.isInteger(year) || year < 1950 || year > 2100) {
    console.warn(`[skip] bad year in row ${r}: "${row[idx.Year]}"`);
    dropped++;
    continue;
  }

  const rec = { state: canonical, year };
  let total = 0;
  let bad = false;
  for (const [col, key] of CRIME_KEYS) {
    const raw = String(row[idx[col]] ?? "").trim();
    const v = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(v) || v < 0) {
      console.warn(`[skip] bad ${col} in row ${r}: "${raw}"`);
      bad = true;
      break;
    }
    rec[key] = v;
    total += v;
  }
  if (bad) {
    dropped++;
    continue;
  }
  rec.total = total;
  const id = `${canonical}|${year}`;
  if (seen.has(id)) {
    console.warn(`[skip] duplicate ${id}`);
    dropped++;
    continue;
  }
  seen.add(id);
  records.push(rec);
}

records.sort((a, b) =>
  a.state === b.state ? a.year - b.year : a.state.localeCompare(b.state),
);

/* ------------------------------------------------------------------ */
/* Analytics caches                                                    */
/* ------------------------------------------------------------------ */

const stateNames = [...new Set(records.map((r) => r.state))].sort();
const yearList = [...new Set(records.map((r) => r.year))].sort((a, b) => a - b);
const CRIME_META = [
  ["rape", "Rape", "#00F5D4"],
  ["kidnapAssault", "Kidnap & Assault", "#64FFDA"],
  ["dowryDeaths", "Dowry Deaths", "#8B5CF6"],
  ["assaultWomen", "Assault Against Women", "#FFD166"],
  ["assaultModesty", "Assault on Modesty", "#FF4D6D"],
  ["domesticViolence", "Domestic Violence", "#38BDF8"],
  ["trafficking", "Women Trafficking", "#F472B6"],
].map(([key, label, color]) => ({ key, label, color }));

const yearIndex = Object.fromEntries(yearList.map((y, i) => [y, i]));
const stateIndex = Object.fromEntries(stateNames.map((s, i) => [s, i]));

const nationalByYear = yearList.map((year) => {
  const yr = records.filter((r) => r.year === year);
  const byCrime = {};
  let total = 0;
  for (const c of CRIME_META) {
    byCrime[c.key] = yr.reduce((a, r) => a + r[c.key], 0);
    total += byCrime[c.key];
  }
  return { year, total, byCrime };
});

const stateSeries = {};
for (const s of stateNames) {
  const rowsByYear = yearList.map((y) =>
    records.find((r) => r.state === s && r.year === y),
  );
  const present = rowsByYear.filter(Boolean);
  const first = present[0];
  const last = present[present.length - 1];
  stateSeries[s] = {
    state: s,
    years: rowsByYear.map((r) => r?.total ?? 0),
    firstYear: first?.year,
    lastYear: last?.year,
    total: present.reduce((a, r) => a + r.total, 0),
    latest: last?.total ?? 0,
    growth: first && last && first.total !== 0
      ? Math.round(((last.total - first.total) / first.total) * 1000) / 10
      : null,
  };
}

const ranking = Object.values(stateSeries)
  .sort((a, b) => b.latest - a.latest)
  .map((s, i) => ({ rank: i + 1, ...s }));
const rankByState = Object.fromEntries(ranking.map((r) => [r.state, r.rank]));

/* ------------------------------------------------------------------ */
/* Write outputs                                                       */
/* ------------------------------------------------------------------ */

mkdirSync(OUT, { recursive: true });

writeFileSync(
  join(OUT, "states.json"),
  JSON.stringify(stateNames.map((name, i) => ({ code: `ST${String(i + 1).padStart(2, "0")}`, name })), null, 2),
);

writeFileSync(join(OUT, "records.json"), JSON.stringify(records, null, 2));

writeFileSync(
  join(OUT, "crimes.json"),
  JSON.stringify(CRIME_META, null, 2),
);

writeFileSync(
  join(OUT, "cache.json"),
  JSON.stringify({
    years: yearList,
    yearIndex,
    stateIndex,
    nationalByYear,
    stateSeries,
    ranking,
    rankByState,
    stats: {
      states: stateNames.length,
      years: yearList.length,
      records: records.length,
      totalCases: nationalByYear.reduce((a, y) => a + y.total, 0),
      latestYear: yearList[yearList.length - 1],
      latestNationalTotal: nationalByYear[nationalByYear.length - 1].total,
    },
  }, null, 2),
);

console.log(`✔ normalized ${records.length} records (${dropped} dropped)`);
console.log(`✔ ${stateNames.length} entities, years ${yearList[0]}–${yearList[yearList.length - 1]}`);
console.log(`✔ output → ${OUT}`);
