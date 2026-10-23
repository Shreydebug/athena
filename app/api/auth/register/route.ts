import { NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTS, SESSION_COOKIE, createUser, startSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, name, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  const user = await createUser(email, name ?? "", password);
  if (!user) {
    return NextResponse.json(
      { error: "registration failed — email may already be registered (or password < 6 chars)" },
      { status: 409 },
    );
  }
  const token = await startSession(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, COOKIE_OPTS);
  return res;
}