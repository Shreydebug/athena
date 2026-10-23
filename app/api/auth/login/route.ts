import { NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTS, SESSION_COOKIE, authenticate, startSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  const token = await startSession(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, COOKIE_OPTS);
  return res;
}