import "server-only";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "./db";
import { sessionUser } from "./auth";

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  params: string;
  path: string;
  createdAt: number;
}

const VAR_DIR = join(process.cwd(), "var");
const viewCache = new Map<string, SavedView[]>();

function loadViews(userId: string): SavedView[] {
  if (viewCache.has(userId)) return viewCache.get(userId)!;
  try {
    const file = join(VAR_DIR, `views-${userId}.json`);
    if (!existsSync(file)) return [];
    const rows = JSON.parse(readFileSync(file, "utf8")) as SavedView[];
    viewCache.set(userId, rows);
    return rows;
  } catch {
    return [];
  }
}

function saveViews(userId: string, rows: SavedView[]) {
  viewCache.set(userId, rows);
  try {
    mkdirSync(VAR_DIR, { recursive: true });
    writeFileSync(join(VAR_DIR, `views-${userId}.json`), JSON.stringify(rows, null, 2));
  } catch (e) {
    console.warn("[crimescape] could not persist views:", (e as Error).message);
  }
}

export async function listViews(userId: string): Promise<SavedView[]> {
  const db = await getDb();
  if (db) {
    const rows = (await db
      .collection<SavedView>("saved_views")
      .find({ userId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()) as unknown as SavedView[];
    return rows;
  }
  return loadViews(userId);
}

export async function createView(
  userId: string,
  name: string,
  path: string,
  params: string,
): Promise<SavedView | null> {
  const view: SavedView = {
    id: randomBytes(12).toString("hex"),
    userId,
    name: name.trim().slice(0, 60) || "Untitled view",
    params,
    path,
    createdAt: Date.now(),
  };
  const db = await getDb();
  if (db) {
    await db.collection("saved_views").insertOne(view);
    return view;
  }
  const rows = loadViews(userId);
  rows.unshift(view);
  saveViews(userId, rows.slice(0, 50));
  return view;
}

export async function deleteView(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    const res = await db.collection("saved_views").deleteOne({ userId, id });
    return (res.deletedCount ?? 0) > 0;
  }
  const rows = loadViews(userId).filter((v) => v.id !== id);
  saveViews(userId, rows);
  return true;
}

export async function requireUser() {
  const user = await sessionUser();
  if (!user) throw new ApiError(401, "authentication required");
  return user;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}