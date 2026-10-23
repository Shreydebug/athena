import fs from "node:fs";

const records = JSON.parse(fs.readFileSync("./lib/data/records.json", "utf8"));
const keys = ["all", "rape", "kidnapAssault", "dowryDeaths", "assaultWomen", "assaultModesty", "domesticViolence", "trafficking"];
const labels = {
  all: "All crimes",
  rape: "Rape",
  kidnapAssault: "Kidnap & Assault",
  dowryDeaths: "Dowry Deaths",
  assaultWomen: "Assault Against Women",
  assaultModesty: "Assault on Modesty",
  domesticViolence: "Domestic Violence",
  trafficking: "Women Trafficking",
};
const years = [...new Set(records.map((r) => r.year))].sort((a, b) => a - b);
const out = {};
for (const key of keys) {
  const series = years.map((year) => ({
    year,
    value: records.filter((r) => r.year === year).reduce((a, r) => a + (key === "all" ? r.total : r[key]), 0),
  }));
  const total = series.reduce((a, p) => a + p.value, 0);
  const byState = {};
  for (const r of records) byState[r.state] = (byState[r.state] || 0) + (key === "all" ? r.total : r[key]);
  const top = Object.entries(byState).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const growth = first ? Math.round(((last - first) / first) * 1000) / 10 : null;
  const peak = series.reduce((a, b) => (b.value > a.value ? b : a), series[0]);
  const share = total ? Math.round((top[0][1] / total) * 1000) / 10 : 0;
  out[key] = { label: labels[key], total, series, top, growth, peak, share };
}
fs.writeFileSync("presentation/interactive-data.json", JSON.stringify(out));
console.log(JSON.stringify(out, null, 2).slice(0, 1200));
console.log("years", years[0], years.at(-1));
