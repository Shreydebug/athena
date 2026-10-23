import fs from "node:fs";

const deckPath = "presentation/index.html";
const mapPath = "presentation/map-snippet.svg";
const dataPath = "presentation/interactive-data.json";

let html = fs.readFileSync(deckPath, "utf8");
let map = fs.readFileSync(mapPath, "utf8").trim();
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

map = map.replace(
  "<svg ",
  '<svg class="india-map" role="img" aria-label="India choropleth of total recorded cases, 2001 to 2021" ',
);

if (!html.includes("<!--__INDIA_MAP__-->")) throw new Error("map placeholder missing");
if (!html.includes("/*__ATHENA_DATA__*/")) throw new Error("data placeholder missing");

html = html.replace("<!--__INDIA_MAP__-->", map);
html = html.replace("/*__ATHENA_DATA__*/", `const DATA = ${JSON.stringify(data)};`);

fs.writeFileSync(deckPath, html);
console.log("injected map bytes", map.length, "data bytes", JSON.stringify(data).length, "deck bytes", html.length);
