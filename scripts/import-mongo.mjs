/**
 * ATHENA ETL — Stage 2: Import seed JSON into MongoDB.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://user:pass@cluster/..." npm run import:mongo
 *
 * Creates:
 *   crime_records — { state, year, rape, kidnapAssault, dowryDeaths,
 *                     assaultWomen, assaultModesty, domesticViolence,
 *                     trafficking, total }  (index: state+year, year)
 *   states        — { code, name }
 *   crime_types   — { key, label, color }
 *   metadata      — { key: "years"|"states", value: [...] }
 */
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URI = process.env.MONGODB_URI;
const DB = process.env.MONGODB_DB ?? "athena";

if (!URI) {
  console.error("✖ MONGODB_URI is required. Example:");
  console.error('  MONGODB_URI="mongodb+srv://user:pass@host/db" npm run import:mongo');
  process.exit(1);
}

const records = JSON.parse(readFileSync(join(ROOT, "lib", "data", "records.json"), "utf8"));
const states = JSON.parse(readFileSync(join(ROOT, "lib", "data", "states.json"), "utf8"));
const crimes = JSON.parse(readFileSync(join(ROOT, "lib", "data", "crimes.json"), "utf8"));

const client = new MongoClient(URI);
try {
  await client.connect();
  const db = client.db(DB);

  const res = await db.collection("crime_records").bulkWrite(
    records.map((r) => ({
      replaceOne: {
        filter: { state: r.state, year: r.year },
        replacement: r,
        upsert: true,
      },
    })),
  );

  await db.collection("states").bulkWrite(
    states.map((s) => ({
      replaceOne: { filter: { name: s.name }, replacement: s, upsert: true },
    })),
  );
  await db.collection("crime_types").bulkWrite(
    crimes.map((c) => ({
      replaceOne: { filter: { key: c.key }, replacement: c, upsert: true },
    })),
  );
  await db.collection("metadata").bulkWrite([
    {
      replaceOne: {
        filter: { key: "years" },
        replacement: {
          key: "years",
          value: [...new Set(records.map((r) => r.year))].sort((a, b) => a - b),
        },
        upsert: true,
      },
    },
    {
      replaceOne: {
        filter: { key: "states" },
        replacement: { key: "states", value: states.map((s) => s.name) },
        upsert: true,
      },
    },
  ]);

  await db.collection("crime_records").createIndex({ state: 1, year: 1 }, { unique: true });
  await db.collection("crime_records").createIndex({ year: 1 });
  await db.collection("crime_records").createIndex({ state: 1 });

  console.log(`✔ crime_records: ${res.upsertedCount} inserted, ${res.upsertedDocs} upserted`);
  console.log(`✔ states: ${states.length}, crime_types: ${crimes.length}, metadata: 2`);
  console.log(`✔ indexes created on crime_records (state+year unique, year, state)`);
  console.log(`✔ database "${DB}" seeded — delete the collections or re-run to reset`);
} finally {
  await client.close();
}