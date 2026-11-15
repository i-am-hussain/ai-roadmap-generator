import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

export type GeminiFailure = {
  message: string;
  code: "NO_API_KEY" | "RATE_LIMIT" | "MODEL_UNAVAILABLE" | "BAD_OUTPUT" | "UNKNOWN";
  status: number;
};

export class GeminiError extends Error {
  code: GeminiFailure["code"];
  status: number;

  constructor(failure: GeminiFailure) {
    super(failure.message);
    this.name = "GeminiError";
    this.code = failure.code;
    this.status = failure.status;
  }
}

/** Hard ceiling for one generation request, across model retries. */
const GENERATION_BUDGET_MS = 200_000;
/** Watchdog: even if the SDK stops honouring its timeout, the request must return. */
const WATCHDOG_MS = GENERATION_BUDGET_MS + 20_000;

const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ].filter((value): value is string => Boolean(value && value.trim())),
  ),
);

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new GeminiError({
      status: 500,
      code: "NO_API_KEY",
      message:
        "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server. Get a free key at https://aistudio.google.com/apikey",
    });
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      // v1beta is the Gemini API surface the SDK's structured-output features target.
      apiVersion: "v1beta",
      httpOptions: {
        timeout: GENERATION_BUDGET_MS,
        // Optional: route through a proxy or gateway.
        ...(process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : {}),
      },
    });
  }
  return cachedClient;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Response did not contain a JSON object.");
  }
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).toLowerCase();
}

function isModelUnavailable(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes("not found") ||
    message.includes("is not supported") ||
    message.includes("does not exist") ||
    message.includes("invalid model") ||
    message.includes("unsupported model") ||
    message.includes("404")
  );
}

function isRateLimited(error: unknown): boolean {
  const message = errorMessage(error);
  return message.includes("429") || message.includes("resource_exhausted") || message.includes("quota");
}

function isTransient(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("try again later") ||
    message.includes("502")
  );
}

function isTimeout(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes("deadline") ||
    message.includes("504") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

function isAuthError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes("api key not valid") ||
    message.includes("api_key_invalid") ||
    message.includes("invalid api key") ||
    message.includes("permission denied") ||
    message.includes("unauthenticated") ||
    message.includes("401") ||
    message.includes("403")
  );
}

type GenerateArgs<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  temperature?: number;
};

const BUSY_MESSAGE =
  "Gemini is busy or slow right now. Give it a few seconds and try again — if it keeps happening, set GEMINI_MODEL in .env.local to a lighter model.";

/**
 * Ask Gemini for a JSON object and guarantee the result matches the zod schema.
 * Tries known models in order, performs one self-repair pass on invalid output, and is
 * race-guarded by a watchdog so a stalled request can never hang the caller.
 */
export async function generateStructured<T>(args: GenerateArgs<T>): Promise<{ data: T; model: string }> {
  let watchdog: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    watchdog = setTimeout(() => {
      reject(new GeminiError({ status: 504, code: "MODEL_UNAVAILABLE", message: BUSY_MESSAGE }));
    }, WATCHDOG_MS);
  });

  try {
    return await Promise.race([runGeneration(args), deadline]);
  } finally {
    if (watchdog) clearTimeout(watchdog);
  }
}

async function runGeneration<T>({
  system,
  prompt,
  schema,
  jsonSchema,
  temperature = 0.75,
}: GenerateArgs<T>): Promise<{ data: T; model: string }> {
  const ai = getClient();
  const startedAt = Date.now();
  let lastError: unknown = null;
  let hardFailure: unknown = null;
  let anyTransient = false;
  let anyNotFound = false;
  let anyTimeout = false;

  outer: for (const model of MODEL_CANDIDATES) {
    // Never stack long attempts: stop once the overall budget is spent.
    if (Date.now() - startedAt > GENERATION_BUDGET_MS) {
      anyTimeout = true;
      break;
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const contents =
        attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous answer failed validation with: ${
              lastError instanceof Error ? lastError.message.slice(0, 900) : "unknown error"
            }\nReturn the corrected JSON object only.`;

      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema,
            temperature,
          },
        });

        const text = response.text;
        if (!text) throw new Error("Gemini returned an empty response.");

        const parsed = schema.safeParse(extractJson(text));
        if (!parsed.success) {
          const issues = parsed.error.issues
            .slice(0, 8)
            .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
            .join("; ");
          throw new Error(issues);
        }

        return { data: parsed.data, model };
      } catch (error) {
        lastError = error;

        if (isAuthError(error)) {
          throw new GeminiError({
            status: 500,
            code: "NO_API_KEY",
            message: "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local and restart the server.",
          });
        }

        if (isRateLimited(error)) {
          throw new GeminiError({
            status: 429,
            code: "RATE_LIMIT",
            message:
              "Gemini is rate limiting this key right now. Wait a minute and try again, or set GEMINI_MODEL to a model with available quota.",
          });
        }

        if (isModelUnavailable(error)) {
          anyNotFound = true;
          continue outer;
        }

        // A busy model may recover on another model; don't burn a repair attempt on it.
        if (isTransient(error)) {
          anyTransient = true;
          continue outer;
        }

        if (isTimeout(error)) {
          anyTimeout = true;
          continue outer;
        }

        // Schema or parse failure: one self-repair pass, then stop.
        hardFailure = error;
      }
    }

    // The model exists but could not produce valid output — another model is unlikely to help.
    break;
  }

  if (hardFailure) {
    throw new GeminiError({
      status: 502,
      code: "BAD_OUTPUT",
      message: `Gemini could not produce a valid response. ${
        hardFailure instanceof Error ? hardFailure.message.slice(0, 400) : "Unknown error"
      }`,
    });
  }

  if (anyTimeout || anyTransient) {
    throw new GeminiError({ status: 504, code: "MODEL_UNAVAILABLE", message: BUSY_MESSAGE });
  }

  if (anyNotFound) {
    throw new GeminiError({
      status: 502,
      code: "MODEL_UNAVAILABLE",
      message: `No configured Gemini model is available (tried ${MODEL_CANDIDATES.join(", ")}). Set GEMINI_MODEL in .env.local to a model your key can access.`,
    });
  }

  throw new GeminiError({
    status: 502,
    code: "BAD_OUTPUT",
    message: `Gemini could not produce a valid response. ${
      lastError instanceof Error ? lastError.message.slice(0, 400) : "Unknown error"
    }`,
  });
}
