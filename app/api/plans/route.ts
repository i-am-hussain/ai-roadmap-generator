import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listPlans } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to see your library.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    return NextResponse.json({ items: await listPlans(user.id) });
  } catch (error) {
    console.error("[plans] list failed", error);
    return NextResponse.json({ error: "Could not load your library.", code: "DATABASE_ERROR" }, { status: 500 });
  }
}
