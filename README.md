# ATHENA — Crime Against Women in India, 2001–2021

An analytics console for exploring, comparing and forecasting crime statistics
against women in India (NCRB crimes against women dataset, 2001–2021).

Dark futuristic UI · synchronized visualizations · India heat map · timeline playback ·
compare mode · auto-generated intelligence briefs · search · export.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- **ECharts 6** — line/area/bar/radar/pie/donut/heatmap/treemap/scatter (draw-in animations)
- **d3-geo** — custom-projected India SVG choropleth (77 KB simplified GeoJSON, 36 entities)
- **MongoDB** (optional) — API layer switches to Atlas automatically; bundled seed JSON otherwise
- Fonts: Pixelify Sans, Silkscreen, JetBrains Mono, IBM Plex Mono

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Landing shows a cinematic boot sequence (skippable with any key) → `/overview`.

## Data pipeline

```
CrimesOnWomenData.csv → scripts/normalize-csv.mjs → lib/data/*.json (states, records, crimes, cache)
                                                    → scripts/import-mongo.mjs → MongoDB Atlas
```

- Raw CSV is never served directly (spec §15). The ETL normalizes state naming
  (37 raw strings → 36 entities), validates numerics, and precomputes analytics caches.
- `npm run normalize` rebuilds the seed JSON after CSV changes.
- `npm run import:mongo` seeds Atlas (requires `MONGODB_URI`).

### Dataset facts

- Source: NCRB — Crimes Against Women (state level, 28 states + 8 UTs)
- 736 records · 2001–2021 · 7 categories (Rape, Kidnap & Assault, Dowry Deaths,
  Assault Against Women, Assault on Modesty, Domestic Violence, Women Trafficking)
- ⚠ Post-2014 NCRB reclassification causes definitional breaks in several series —
  treat large swings around 2014 as reporting changes.

## Architecture

```
Frontend (App Router) → API layer (/api/*) → Business logic (lib/analytics.ts)
                     → MongoDB (optional) / seed JSON → ETL → raw CSV
```

### API endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/meta` | states, years, crime types, data source |
| `GET /api/dashboard?crime&from&to&states` | hero stats, national series, map data, rankings, insights |
| `GET /api/compare?states&years&crime` | multi-entity comparison payload |
| `GET /api/compare?mode=crime&crimeA&crimeB` | crime category vs category comparison |
| `GET /api/forecast?crime&state&horizon` | OLS trend projection |
| `GET /api/search?q` | universal search index |
| `GET /api/export/csv?crime&from&to` | record-level CSV download |
| `POST /api/auth/register` · `login` · `logout` · `GET me` | session auth (scrypt + httpOnly cookies) |
| `GET/POST/DELETE /api/views` | saved dashboards (cloud when signed in) |
| `GET /api/health` | service health + data source status |

Set `MONGODB_URI` (+ optional `MONGODB_DB`) in `.env.local` to serve from Atlas;
otherwise the app falls back to bundled seed data (see `.env.example`).

## Auth & saved dashboards

- Sign in / register from the topbar (`SIGN IN`). Passwords are hashed with scrypt
  (zero-dependency), sessions are httpOnly cookies.
- User store: MongoDB `users`/`sessions` collections when Atlas is configured;
  otherwise a local `var/` JSON store (persists across restarts in dev/self-host,
  ephemeral on serverless — use Atlas for production).
- `▤ VIEWS` saves the current filter state (path + crime/year params) as a named
  dashboard. Cloud-synced when signed in; stored in localStorage when not.

## Routes

| Route | Section |
| --- | --- |
| `/` | Boot sequence → `/overview` |
| `/overview` | Command view: filters, hero stats, heat map, rankings, trends, brief |
| `/national` | Deep analytics: multi-category trajectories, intensity matrix, treemap, scatter |
| `/state` · `/state/[state]` | State dossier: overlay vs national, crime mix, annual ledger |
| `/heatmap` | Full-screen map + timeline playback |
| `/timeline` | Synchronized playback engine (map + charts + rankings + insights) |
| `/compare` | State vs state / year vs year / crime vs crime, radar + lines + matrix |
| `/insights` | Rule-engine briefs (national surge, hotspots, risers, anomalies) |
| `/forecast` | OLS projections, 1–6 year horizons |
| `/reports` | CSV / PNG / print-PDF export + saved reports (localStorage) |
| `/settings` | Accent theme, reduced motion, data source status |

## Accessibility

- Skip-to-content link, visible focus rings, keyboard-navigable India map (Tab +
  Enter/Space to select a state), labelled controls, ARIA landmarks
- `prefers-reduced-motion` disables ambient/entrance animations automatically
- High-contrast palette verified against WCAG AA on primary text and data colors

## Deployment

1. **Database (optional):** create a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   cluster → Database Access (DB user) → Network Access (0.0.0.0/0).
2. **Seed it:** `npm run import:mongo` with `MONGODB_URI` set (adds indexes
   `{state:1, year:1}`, `{year:1}`, `{state:1}`).
3. **Vercel:** push the repo → import → add `MONGODB_URI`/`MONGODB_DB` env vars →
   deploy. No config files needed (App Router builds automatically).
4. **Health check:** `GET /api/health` returns status, data source, record counts.
5. Auth persists to the `users`/`sessions`/`saved_views` collections on Atlas;
   without Atlas it uses local `var/` JSON files (dev only).

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint`
- `npm run normalize` — rebuild seed JSON from CSV
- `npm run import:mongo` — seed MongoDB Atlas

## Roadmap (from spec)

Auth + saved views, district-level drill-down, LLM-generated briefs, natural-language
queries, anomaly detection, calendar & Sankey additions, population-rate normalization
(needs external census data).