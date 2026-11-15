import { z } from "zod";

/**
 * Single source of truth for everything Gemini returns.
 * The same schemas are used to (a) constrain Gemini's JSON output and
 * (b) validate the response before it ever reaches the UI.
 */

const ResourceSchema = z.object({
  title: z
    .string()
    .describe("Name of the specific course, book, docs page or community"),
  type: z.enum(["course", "docs", "book", "video", "practice", "community"]),
  provider: z
    .string()
    .describe(
      "Publisher, platform or author, e.g. freeCodeCamp, MDN, O'Reilly",
    ),
  url: z
    .string()
    .describe(
      "Official https URL. Use an empty string if you are not certain it exists.",
    ),
  why: z
    .string()
    .describe("One sentence on why this resource fits this learner"),
});

const TaskSchema = z.object({
  title: z.string().describe("Concrete action, starting with a verb"),
  detail: z.string().describe("What to actually do and what 'done' looks like"),
  hours: z.number().describe("Realistic focused hours for this task"),
});

const ProjectSchema = z.object({
  title: z.string(),
  brief: z
    .string()
    .describe(
      "What to build and the constraints that make it portfolio-worthy",
    ),
  deliverable: z
    .string()
    .describe("The tangible artifact that proves the skill"),
});

const PhaseSchema = z.object({
  id: z.string().describe("Short stable id: p1, p2, p3..."),
  title: z.string(),
  duration: z.string().describe("e.g. Weeks 1-3"),
  focus: z.string().describe("The single idea this phase is about"),
  objectives: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Exactly 2 to 5 objectives — never more than 5"),
  skills: z
    .array(z.string())
    .min(2)
    .max(8)
    .describe("2 to 8 concrete skills — never more than 8"),
  tasks: z
    .array(TaskSchema)
    .min(3)
    .max(6)
    .describe("3 to 6 concrete tasks — never more than 6"),
  resources: z
    .array(ResourceSchema)
    .min(1)
    .max(4)
    .describe("1 to 4 high-signal resources — never more than 4"),
  project: ProjectSchema,
  checkpoint: z
    .string()
    .describe("How the learner can tell they are ready to move on"),
});

export const RoadmapSchema = z.object({
  title: z.string().describe("Specific and motivating, not generic"),
  tagline: z.string().describe("One sentence summary of the journey"),
  targetRole: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  totalWeeks: z.number().int(),
  weeklyHours: z.number().int(),
  outcomes: z
    .array(z.string())
    .min(3)
    .max(7)
    .describe(
      "3 to 7 outcomes: what the learner can do at the end — never more than 7",
    ),
  phases: z
    .array(PhaseSchema)
    .min(3)
    .max(6)
    .describe("3 to 6 phases, in the exact number requested"),
  milestones: z
    .array(
      z.object({
        week: z.number().int(),
        title: z.string(),
        proof: z
          .string()
          .describe("The evidence that this milestone is actually reached"),
      }),
    )
    .min(3)
    .max(8)
    .describe("3 to 8 milestones — never more than 8"),
  finalProject: z.object({
    title: z.string(),
    brief: z.string(),
    deliverable: z.string(),
    skillsShown: z
      .array(z.string())
      .min(3)
      .max(6)
      .describe("3 to 6 skills — never more than 6"),
  }),
  successMetrics: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe("3 to 6 metrics — never more than 6"),
  pitfalls: z
    .array(
      z.object({
        pitfall: z.string(),
        fix: z.string(),
      }),
    )
    .min(2)
    .max(5)
    .describe("2 to 5 pitfalls — never more than 5"),
  nextSteps: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("2 to 5 next steps — never more than 5"),
});

export const TransitionSchema = z.object({
  headline: z
    .string()
    .describe("Sharp one-line verdict about this specific switch"),
  summary: z
    .string()
    .describe(
      "3-4 sentences explaining the realistic path and what decides the outcome",
    ),
  feasibility: z.object({
    score: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe("How attainable this transition is for this person"),
    label: z.enum([
      "Strong fit",
      "Realistic with effort",
      "Stretch goal",
      "Long shot",
    ]),
    estimatedMonths: z
      .number()
      .int()
      .describe("Months to employable, at the stated weekly hours"),
    reasoning: z.string(),
  }),
  currentAssets: z
    .array(z.string())
    .min(3)
    .max(7)
    .describe(
      "The 3 to 7 strongest things they already bring — never more than 7",
    ),
  transferable: z
    .array(
      z.object({
        skill: z.string().describe("A skill from their existing background"),
        strength: z.enum(["direct", "strong", "partial"]),
        whereItHelps: z
          .string()
          .describe("The exact target-field activity this accelerates"),
        proof: z
          .string()
          .describe("How to reframe it on a CV, portfolio or in an interview"),
      }),
    )
    .min(3)
    .max(8)
    .describe(
      "3 to 8 transferable skills taken from the person's list — never more than 8",
    ),
  gaps: z
    .array(
      z.object({
        skill: z.string(),
        priority: z.enum(["critical", "important", "nice-to-have"]),
        why: z.string(),
        weeks: z.number().int(),
        howToClose: z.string(),
      }),
    )
    .min(3)
    .max(8)
    .describe("3 to 8 ranked gaps — never more than 8"),
  bridgeRoles: z
    .array(
      z.object({
        role: z.string(),
        why: z
          .string()
          .describe(
            "Why this role is a shorter hop from their current position",
          ),
        fit: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(4)
    .describe("1 to 4 bridge roles — never more than 4"),
  risks: z
    .array(
      z.object({
        risk: z.string(),
        mitigation: z.string(),
      }),
    )
    .min(2)
    .max(5)
    .describe("2 to 5 risks — never more than 5"),
  positioning: z.object({
    narrative: z
      .string()
      .describe(
        "A 3-4 sentence story connecting past experience to the new field",
      ),
    headline: z.string().describe("LinkedIn headline for the new positioning"),
    resumeBullets: z
      .array(z.string())
      .min(2)
      .max(5)
      .describe("2 to 5 bullets — never more than 5"),
    keywords: z
      .array(z.string())
      .min(4)
      .max(10)
      .describe("4 to 10 ATS keywords — never more than 10"),
  }),
  quickWins: z
    .array(
      z.object({
        action: z.string(),
        why: z.string(),
        effort: z.enum(["under an hour", "a few hours", "a weekend"]),
      }),
    )
    .min(2)
    .max(5)
    .describe("2 to 5 quick wins — never more than 5"),
  roadmap: RoadmapSchema,
});

export type Roadmap = z.infer<typeof RoadmapSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type TransitionResult = z.infer<typeof TransitionSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Task = z.infer<typeof TaskSchema>;

/**
 * Convert a zod schema into a JSON Schema that model APIs accept.
 *
 * The Gemini API rejects `minItems`/`maxItems` with INVALID_ARGUMENT (verified against v1beta), so
 * those keywords are stripped before the schema is sent. Cardinality therefore has to be carried by
 * each field's `description` (it travels with the schema) and enforced afterwards:
 *   - arrays above their max are trimmed by `parseWithRepair` in lib/llm.ts,
 *   - arrays below their min trigger the normal self-repair pass.
 */
export function toModelJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "output" }) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  return stripUnsupportedKeywords(json) as Record<string, unknown>;
}

const UNSUPPORTED_KEYWORDS = new Set(["minItems", "maxItems"]);

export function stripUnsupportedKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupportedKeywords);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_KEYWORDS.has(key)) continue;
      out[key] = stripUnsupportedKeywords(value);
    }
    return out;
  }
  return node;
}
