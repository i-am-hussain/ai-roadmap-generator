import { NextResponse, type NextRequest } from "next/server";
import { RoadmapSchema, toModelJsonSchema } from "@/lib/schemas";
import { RoadmapInputSchema } from "@/lib/types";
import { buildRoadmapPrompt } from "@/lib/prompts";
import { AIError, generateStructured } from "@/lib/llm";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/auth";
import { mongoConfigured } from "@/lib/db";
import { FREE_GENERATIONS, releaseGeneration, reserveGeneration } from "@/lib/quota";
import { createPlan } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 300;

const JSON_SCHEMA = toModelJsonSchema(RoadmapSchema);

export async function POST(request: NextRequest) {
  if (!mongoConfigured()) {
    return NextResponse.json(
      { error: "Accounts are not configured yet. Add MONGODB_URI to .env.local.", code: "DATABASE_ERROR" },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with Google to generate a roadmap.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = checkRateLimit(`roadmap:${ip}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfterSeconds}s.`, code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = RoadmapInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid input.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const reservation = await reserveGeneration(user.id);
  if (!reservation.allowed) {
    return NextResponse.json(
      {
        error: `You have used all ${FREE_GENERATIONS} free roadmaps. Upgrade to keep generating.`,
        code: "PAYMENT_REQUIRED",
      },
      { status: 402 },
    );
  }

  const { system, prompt } = buildRoadmapPrompt(input);

  try {
    const { data, model } = await generateStructured({
      system,
      prompt,
      schema: RoadmapSchema,
      jsonSchema: JSON_SCHEMA,
    });

    // The learner's real budget wins over whatever the model planned.
    data.weeklyHours = input.hoursPerWeek;
    data.totalWeeks = input.durationWeeks;

    const item = await createPlan(user.id, {
      kind: "roadmap",
      title: data.title,
      subtitle: data.tagline,
      input,
      roadmap: data,
    });

    return NextResponse.json({
      item,
      model,
      quota: {
        used: reservation.user?.usedGenerations ?? user.usedGenerations + 1,
        limit: FREE_GENERATIONS,
        remaining: reservation.user?.plan === "pro" ? 0 : Math.max(0, FREE_GENERATIONS - (reservation.user?.usedGenerations ?? 0)),
        unlimited: reservation.user?.plan === "pro",
      },
    });
  } catch (error) {
    if (reservation.reserved) await releaseGeneration(user.id);
    if (error instanceof AIError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[roadmap] unexpected error", error);
    return NextResponse.json(
      { error: "Could not generate the roadmap. Please try again.", code: "UNKNOWN" },
      { status: 500 },
    );
  }
}
