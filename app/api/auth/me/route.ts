import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await sessionUser();
  return NextResponse.json({ user });
}