import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { deletePlan, getPlan, saveProgress } from "@/lib/plans";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const ProgressSchema = z.object({
  progress: z.record(z.string(), z.boolean()),
});

export async function GET(_request: NextRequest, { params }: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to open this plan.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getPlan(user.id, id);
  if (!item) return NextResponse.json({ error: "Plan not found.", code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to update progress.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = ProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress payload.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const updated = await saveProgress(user.id, id, parsed.data.progress);
  if (!updated) return NextResponse.json({ error: "Plan not found.", code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to delete this plan.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deletePlan(user.id, id);
  if (!deleted) return NextResponse.json({ error: "Plan not found.", code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
