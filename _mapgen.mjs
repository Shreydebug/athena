import fs from "node:fs";
import nodePath from "node:path";
import { geoConicEqualArea, geoPath } from "d3-geo";

const root = "C:/Users/Shubhankar/Desktop/projects/crime analytics/crimescape";
const geo = JSON.parse(fs.readFileSync(nodePath.join(root, "public/india-states.geojson"), "utf8"));
const recs = JSON.parse(fs.readFileSync(nodePath.join(root, "lib/data/records.json"), "utf8"));
const byState = {};
for (const r of recs) byState[r.state] = (byState[r.state] || 0) + r.total;
const alias = {
  "Andaman & Nicobar": "Andaman & Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu": null,
  "Ladakh": null,
};
for (const f of geo.features) {
  const n = f.properties.ST_NM;
  f.__v = alias[n] === null ? null : byState[alias[n] || n] ?? null;
}
const vals = geo.features.map((f) => f.__v).filter((v) => v != null);
const max = Math.max(...vals);
const min = Math.min(...vals);
const W = 620;
const H = 700;
const pad = 16;
const proj = geoConicEqualArea().rotate([-83, 0]).center([0, 22]).parallels([8, 34]);
const path = geoPath(proj);
const bounds = path.bounds({ type: "FeatureCollection", features: geo.features });
const k = Math.min((W - 2 * pad) / (bounds[1][0] - bounds[0][0]), (H - 2 * pad) / (bounds[1][1] - bounds[0][1]));
proj.scale(proj.scale() * k);
const t = proj.translate();
proj.translate([
  W / 2 - ((bounds[0][0] + bounds[1][0]) / 2 - t[0]) * k,
  H / 2 - ((bounds[0][1] + bounds[1][1]) / 2 - t[1]) * k,
]);
function color(v) {
  if (v == null) return "#101820";
  const t0 = Math.pow((v - min) / (max - min), 0.42);
  const c1 = [12, 24, 31];
  const c2 = [0, 245, 212];
  return "rgb(" + c1.map((c, i) => Math.round(c + (c2[i] - c) * t0)).join(",") + ")";
}
let out = "";
for (const f of geo.features) {
  const n = f.properties.ST_NM;
  const d = path(f);
  const v = f.__v;
  out += `<path d="${d}" data-state="${n.replace(/"/g, "&quot;")}" fill="${color(v)}"${v != null ? ` data-value="${v}"` : ""}><title>${n}${v != null ? " · " + v.toLocaleString("en-IN") + " cases" : " · no data"}</title></path>\n`;
}
const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">\n${out}</svg>`;
const outPath = nodePath.join(root, "presentation", "map-snippet.svg");
fs.mkdirSync(nodePath.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, svg);
console.log("wrote", outPath, "max", max, "min", min, "bytes", svg.length);

