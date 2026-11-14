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

const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      "gemini-3.8-flash",
      "gemini-3-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
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
      httpOptions: {
        timeout: 180_000,
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

function isModelUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
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
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("429") || message.includes("resource_exhausted") || message.includes("quota");
}

function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
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

/**
 * Ask Gemini for a JSON object and guarantee the result matches the zod schema.
 * Tries each known model in order and performs one self-repair pass on invalid JSON.
 */
export async function generateStructured<T>({
  system,
  prompt,
  schema,
  jsonSchema,
  temperature = 0.75,
}: GenerateArgs<T>): Promise<{ data: T; model: string }> {
  const ai = getClient();
  let lastError: unknown = null;

  for (const model of MODEL_CANDIDATES) {
    let modelUnavailable = false;

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
            .slice(0, 6)
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
            message:
              "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local and restart the server.",
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
          modelUnavailable = true;
          break;
        }
      }
    }

    // The model exists but cannot produce valid output — another model is unlikely to help.
    if (!modelUnavailable) break;
  }

  throw new GeminiError({
    status: 502,
    code: "BAD_OUTPUT",
    message: `Gemini could not produce a valid roadmap. ${
      lastError instanceof Error ? lastError.message.slice(0, 400) : "Unknown error"
    }`,
  });
}
