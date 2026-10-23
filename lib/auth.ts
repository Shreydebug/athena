import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";
import { getDb } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

interface UserRow extends User {
  passHash: string;
  salt: string;
}

interface SessionRow {
  token: string;
  userId: string;
  expires: number;
}

export const SESSION_COOKIE = "cs_session";
const SESSION_DAYS = 30;
const VAR_DIR = join(process.cwd(), "var");

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt, zero dependencies)                        */
/* ------------------------------------------------------------------ */

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function toPublic(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.createdAt };
}

/* ------------------------------------------------------------------ */
/* Fallback store (JSON on disk) — used when MongoDB is not configured */
/* ------------------------------------------------------------------ */

function fallbackLoad<T>(file: string): T[] {
  try {
    if (!existsSync(file)) return [];
    return JSON.parse(readFileSync(file, "utf8")) as T[];
  } catch {
    return [];
  }
}

function fallbackSave<T>(file: string, rows: T[]): void {
  try {
    mkdirSync(VAR_DIR, { recursive: true });
    writeFileSync(file, JSON.stringify(rows, null, 2));
  } catch (e) {
    console.warn("[crimescape] could not persist to disk:", (e as Error).message);
  }
}

const fallbackUsers = new Map<string, UserRow>();
const fallbackSessions = new Map<string, SessionRow>();
let fallbackLoaded = false;

function loadFallback() {
  if (fallbackLoaded) return;
  fallbackLoaded = true;
  for (const u of fallbackLoad<UserRow>(join(VAR_DIR, "users.json"))) fallbackUsers.set(u.id, u);
  for (const s of fallbackLoad<SessionRow>(join(VAR_DIR, "sessions.json"))) fallbackSessions.set(s.token, s);
}

function persistFallback() {
  fallbackSave(join(VAR_DIR, "users.json"), [...fallbackUsers.values()]);
  fallbackSave(join(VAR_DIR, "sessions.json"), [...fallbackSessions.values()]);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function createUser(
  email: string,
  name: string,
  password: string,
): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return null;
  if (password.length < 6) return null;

  const db = await getDb();
  if (db) {
    const exists = await db.collection("users").findOne({ email: cleanEmail });
    if (exists) return null;
    const salt = randomBytes(16).toString("hex");
    const user: UserRow = {
      id: randomBytes(12).toString("hex"),
      email: cleanEmail,
      name: name.trim().slice(0, 40) || cleanEmail.split("@")[0],
      passHash: hashPassword(password, salt),
      salt,
      createdAt: Date.now(),
    };
    await db.collection("users").insertOne(user);
    return toPublic(user);
  }

  loadFallback();
  const exists = [...fallbackUsers.values()].find((u) => u.email === cleanEmail);
  if (exists) return null;
  const salt = randomBytes(16).toString("hex");
  const user: UserRow = {
    id: randomBytes(12).toString("hex"),
    email: cleanEmail,
    name: name.trim().slice(0, 40) || cleanEmail.split("@")[0],
    passHash: hashPassword(password, salt),
    salt,
    createdAt: Date.now(),
  };
  fallbackUsers.set(user.id, user);
  persistFallback();
  return toPublic(user);
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase();
  const db = await getDb();
  if (db) {
    const row = (await db.collection("users").findOne({ email: cleanEmail })) as unknown as UserRow | null;
    if (!row || !verifyPassword(password, row.salt, row.passHash)) return null;
    return toPublic(row);
  }
  loadFallback();
  const row = [...fallbackUsers.values()].find((u) => u.email === cleanEmail);
  if (!row || !verifyPassword(password, row.salt, row.passHash)) return null;
  return toPublic(row);
}

export async function startSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const row: SessionRow = { token, userId, expires };

  const db = await getDb();
  if (db) {
    await db.collection("sessions").insertOne(row);
    await db.collection("sessions").deleteMany({ expires: { $lt: Date.now() } });
    return token;
  }
  loadFallback();
  fallbackSessions.set(token, row);
  persistFallback();
  return token;
}

export async function getUserByToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const db = await getDb();
  if (db) {
    const session = (await db.collection("sessions").findOne({ token })) as unknown as SessionRow | null;
    if (!session || session.expires < Date.now()) return null;
    const row = (await db.collection("users").findOne({ id: session.userId })) as unknown as UserRow | null;
    if (!row) return null;
    return toPublic(row);
  }
  loadFallback();
  const session = fallbackSessions.get(token);
  if (!session || session.expires < Date.now()) return null;
  const row = fallbackUsers.get(session.userId);
  if (!row) return null;
  return toPublic(row);
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  const db = await getDb();
  if (db) {
    await db.collection("sessions").deleteOne({ token });
    return;
  }
  loadFallback();
  fallbackSessions.delete(token);
  persistFallback();
}

export async function sessionUser(): Promise<User | null> {
  const store = await cookies();
  return getUserByToken(store.get(SESSION_COOKIE)?.value);
}

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};