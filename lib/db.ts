import { MongoClient, type Db } from "mongodb";
import type { CrimeRecord } from "./types";
import { CRIME_META } from "./analytics";

import statesJson from "./data/states.json";
import recordsJson from "./data/records.json";
import cacheJson from "./data/cache.json";

export interface Store {
  records: CrimeRecord[];
  years: number[];
  states: string[];
  crimeList: typeof CRIME_META;
  source: "mongodb" | "seed";
}

const MONGODB_URI = process.env.MONGODB_URI;

let client: MongoClient | null = null;
let db: Db | null = null;
let mongoStore: Store | null = null;

async function connectMongo(): Promise<Db | null> {
  if (!MONGODB_URI) return null;
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
      });
      await client.connect();
    }
    db = client.db(process.env.MONGODB_DB ?? "athena");
    return db;
  } catch {
    console.warn("[athena] MongoDB unreachable — falling back to seed data");
    client = null;
    return null;
  }
}

export async function getDb(): Promise<Db | null> {
  if (!MONGODB_URI) return null;
  if (db) return db;
  return connectMongo();
}

export async function getStore(): Promise<Store> {
  if (MONGODB_URI && !mongoStore) {
    const d = await connectMongo();
    if (d) {
      try {
        const records = (await d
          .collection<CrimeRecord & { _id?: unknown }>("crime_records")
          .find({}, { projection: { _id: 0 } })
          .toArray()) as unknown as CrimeRecord[];
        const years = (await d.collection("metadata").findOne({ key: "years" }))?.value as number[];
        const states = (await d.collection("metadata").findOne({ key: "states" }))?.value as string[];
        if (records?.length) {
          mongoStore = {
            records: records,
            years: years ?? [...new Set(records.map((r) => r.year))].sort((a, b) => a - b),
            states: states ?? [...new Set(records.map((r) => r.state))].sort(),
            crimeList: CRIME_META,
            source: "mongodb",
          };
        }
      } catch {
        mongoStore = null;
      }
    }
  }
  if (mongoStore) return mongoStore;
  return {
    records: recordsJson as CrimeRecord[],
    years: cacheJson.years,
    states: statesJson.map((s) => s.name),
    crimeList: CRIME_META,
    source: "seed",
  };
}

export const seedCache = cacheJson;