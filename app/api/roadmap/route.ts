import { NextResponse, type NextRequest } from "next/server";
import { RoadmapSchema, toGeminiJsonSchema } from "@/lib/schemas";
import { RoadmapInputSchema } from "@/lib/types";
import { buildRoadmapPrompt } from "@/lib/prompts";
import { GeminiError, generateStructured } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 240;

const JSON_SCHEMA = toGeminiJsonSchema(RoadmapSchema);

export async function POST(request: NextRequest) {
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

    return NextResponse.json({ roadmap: data, model });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[roadmap] unexpected error", error);
    return NextResponse.json(
      { error: "Something went wrong while building the roadmap. Please try again.", code: "UNKNOWN" },
      { status: 500 },
    );
  }
}
