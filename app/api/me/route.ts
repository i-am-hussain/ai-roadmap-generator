import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { countPlans } from "@/lib/plans";
import { FREE_GENERATIONS } from "@/lib/quota";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ user: null });

  let roadmapCount = 0;
  try {
    roadmapCount = await countPlans(session.id);
  } catch (error) {
    console.error("[me] count failed", error);
  }

  const unlimited = session.plan === "pro";
  return NextResponse.json({
    user: session,
    roadmapCount,
    quota: {
      used: session.usedGenerations,
      limit: FREE_GENERATIONS,
      remaining: unlimited ? 0 : Math.max(0, FREE_GENERATIONS - session.usedGenerations),
      unlimited,
    },
  });
}
