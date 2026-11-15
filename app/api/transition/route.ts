import { NextResponse, type NextRequest } from "next/server";
import { TransitionSchema, toGeminiJsonSchema } from "@/lib/schemas";
import { TransitionInputSchema } from "@/lib/types";
import { buildTransitionPrompt } from "@/lib/prompts";
import { GeminiError, generateStructured } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 240;

const JSON_SCHEMA = toGeminiJsonSchema(TransitionSchema);

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = checkRateLimit(`transition:${ip}`);
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

  const parsed = TransitionInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid input.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { system, prompt } = buildTransitionPrompt(input);

  try {
    const { data, model } = await generateStructured({
      system,
      prompt,
      schema: TransitionSchema,
      jsonSchema: JSON_SCHEMA,
      temperature: 0.7,
    });

    // Keep the plan honest about the time the person actually has.
    data.roadmap.weeklyHours = input.hoursPerWeek;
    data.roadmap.totalWeeks = Math.max(8, Math.round(input.timelineMonths * 4.33));
    data.roadmap.targetRole = input.targetRole;

    return NextResponse.json({ transition: data, model });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[transition] unexpected error", error);
    return NextResponse.json(
      { error: "Something went wrong while analysing the transition. Please try again.", code: "UNKNOWN" },
      { status: 500 },
    );
  }
}
