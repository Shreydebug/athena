import { NextRequest, NextResponse } from "next/server";
import { ApiError, createView, deleteView, listViews, requireUser } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const views = await listViews(user.id);
    return NextResponse.json({ views });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { name, path, params } = (await req.json().catch(() => ({}))) as {
      name?: string;
      path?: string;
      params?: string;
    };
    const view = await createView(user.id, name ?? "", path ?? "/", params ?? "");
    if (!view) return NextResponse.json({ error: "could not create view" }, { status: 400 });
    return NextResponse.json({ view }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const ok = await deleteView(user.id, id);
    return NextResponse.json({ ok });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}