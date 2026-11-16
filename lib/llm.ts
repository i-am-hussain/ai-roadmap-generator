import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

/**
 * Provider-agnostic structured generation.
 *
 * Two transports are supported, across three provider presets:
 *   - "zai": Z.ai's OpenAI-compatible API. Its GLM Flash models are priced at $0 with no
 *     published daily cap (the free tier is throttled to roughly one concurrent request),
 *     which makes it the cheapest hosted default.
 *   - "openai": any OpenAI-compatible /chat/completions endpoint — Ollama or LM Studio on
 *     localhost (free, no request quota), or a hosted service such as Groq, OpenRouter or
 *     Cerebras.
 *   - "gemini": Google's API via @google/genai, with native responseJsonSchema support.
 *
 * All paths share the same retry, validation, repair and watchdog behaviour, so switching
 * providers never changes what the rest of the app has to handle.
 */

export type AIFailureCode =
  | "NO_API_KEY"
  | "RATE_LIMIT"
  | "MODEL_UNAVAILABLE"
  | "BAD_OUTPUT"
  | "UNKNOWN";

export type AIFailure = {
  message: string;
  code: AIFailureCode;
  status: number;
};

export class AIError extends Error {
  code: AIFailureCode;
  status: number;

  constructor(failure: AIFailure) {
    super(failure.message);
    this.name = "AIError";
    this.code = failure.code;
    this.status = failure.status;
  }
}

/** Hard ceiling for one generation request, across model retries. A career-transition plan takes ~200s on the free GLM Flash tier, so this leaves headroom. */
const GENERATION_BUDGET_MS = 280_000;
/** Watchdog: even if the transport stops honouring its timeout, the request must return. */
const WATCHDOG_MS = GENERATION_BUDGET_MS + 20_000;

const GEMINI_MODELS = Array.from(
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

const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434/v1";
const ZAI_DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4";

/** Free GLM Flash models; the first is the default. */
const ZAI_MODELS = Array.from(
  new Set(
    [process.env.AI_MODEL, "glm-4.5-flash", "glm-4.7-flash"].filter(
      (value): value is string => Boolean(value && value.trim()),
    ),
  ),
);

type Provider = "gemini" | "openai" | "zai";

type ProviderConfig = {
  provider: Provider;
  /** Models to try in order. Gemini falls back through a list; OpenAI-style endpoints use one. */
  models: string[];
  baseUrl: string;
  apiKey: string;
  /** Human-readable provider name for error messages. */
  label: string;
};

function explicitProvider(): string {
  return (process.env.AI_PROVIDER || "").trim().toLowerCase();
}

function zaiApiKey(): string {
  return process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY || "";
}

function pickProvider(): Provider {
  const value = explicitProvider();
  if (
    value === "openai" ||
    value === "compatible" ||
    value === "openai-compatible" ||
    value === "ollama"
  ) {
    return "openai";
  }
  if (
    value === "zai" ||
    value === "z.ai" ||
    value === "glm" ||
    value === "zhipu"
  )
    return "zai";
  if (value === "gemini") return "gemini";
  // Unset: prefer Z.ai (free GLM Flash) over Gemini, then any OpenAI-compatible endpoint.
  if (zaiApiKey()) return "zai";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.AI_BASE_URL) return "openai";
  return "zai";
}

/** What /api/status reports, without throwing when configuration is missing. */
export function providerInfo(): {
  configured: boolean;
  provider: Provider;
  model: string;
  label: string;
} {
  const provider = pickProvider();
  if (provider === "zai") {
    return {
      provider,
      configured: Boolean(zaiApiKey()),
      model: process.env.AI_MODEL || "glm-4.5-flash",
      label: "Z.ai GLM",
    };
  }
  if (provider === "openai") {
    const isOllama = explicitProvider() === "ollama";
    return {
      provider,
      configured: Boolean(
        process.env.AI_MODEL && (process.env.AI_BASE_URL || isOllama),
      ),
      model: process.env.AI_MODEL || "unset",
      label: isOllama ? "The local model" : "The model endpoint",
    };
  }
  return {
    provider,
    configured: Boolean(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    ),
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    label: "Gemini",
  };
}

function resolveProvider(): ProviderConfig {
  const provider = pickProvider();

  if (provider === "zai") {
    const apiKey = zaiApiKey();
    if (!apiKey) {
      throw new AIError({
        status: 500,
        code: "NO_API_KEY",
        message:
          "No AI provider is configured. Add ZAI_API_KEY to .env.local — the GLM Flash models are free, no card " +
          "required (key: https://z.ai/manage-apikey/apikey-list) — or set AI_PROVIDER=ollama to run a local model.",
      });
    }

    return {
      provider,
      models: ZAI_MODELS,
      baseUrl: process.env.AI_BASE_URL || ZAI_DEFAULT_BASE_URL,
      apiKey,
      label: "Z.ai GLM",
    };
  }

  if (provider === "openai") {
    const isOllama = explicitProvider() === "ollama";
    const baseUrl =
      process.env.AI_BASE_URL || (isOllama ? OLLAMA_DEFAULT_BASE_URL : "");
    const model = process.env.AI_MODEL || "";

    if (!baseUrl || !model) {
      throw new AIError({
        status: 500,
        code: "NO_API_KEY",
        message:
          "AI_PROVIDER is set to an OpenAI-compatible endpoint, but AI_BASE_URL or AI_MODEL is missing. " +
          "For a local model set AI_PROVIDER=ollama, AI_MODEL=<model from `ollama list`> (AI_BASE_URL defaults to " +
          `${OLLAMA_DEFAULT_BASE_URL}). For a hosted service set AI_BASE_URL and AI_API_KEY too.`,
      });
    }

    return {
      provider,
      models: [model],
      baseUrl,
      apiKey: process.env.AI_API_KEY || (isOllama ? "ollama" : ""),
      label: isOllama ? "The local model" : "The model endpoint",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new AIError({
      status: 500,
      code: "NO_API_KEY",
      message:
        "No AI provider is configured. Set ZAI_API_KEY in .env.local (free GLM Flash key: https://z.ai/manage-apikey/apikey-list), " +
        "set GEMINI_API_KEY instead, or run a local model with Ollama and set AI_PROVIDER=ollama plus AI_MODEL.",
    });
  }

  return {
    provider,
    models: GEMINI_MODELS,
    baseUrl: process.env.GEMINI_BASE_URL || "",
    apiKey,
    label: "Gemini",
  };
}

const geminiClients = new Map<string, GoogleGenAI>();

function getGeminiClient(config: ProviderConfig): GoogleGenAI {
  const cacheKey = `${config.apiKey}:${config.baseUrl}`;
  const cached = geminiClients.get(cacheKey);
  if (cached) return cached;

  const client = new GoogleGenAI({
    apiKey: config.apiKey,
    // v1beta is the Gemini API surface the SDK's structured-output features target.
    apiVersion: "v1beta",
    httpOptions: {
      timeout: GENERATION_BUDGET_MS,
      ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
    },
  });

  geminiClients.set(cacheKey, client);
  return client;
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

/* ------------------------------ validation ------------------------------ */

type ValidationIssue = {
  code?: string;
  path?: readonly PropertyKey[];
  /** zod reports numeric ceilings as number or bigint. */
  maximum?: number | bigint;
};

type PathKey = string | number;

/**
 * The Gemini API rejects `minItems`/`maxItems` in a response schema, so the model never sees
 * array ceilings and occasionally overshoots (e.g. 12 ATS keywords against a max of 10).
 * A response that only breaks those ceilings is trimmed here instead of failing the request.
 * Short arrays are left alone — those need the model to produce more, which the self-repair
 * pass handles.
 */
function trimOversizedArrays(
  root: unknown,
  issues: readonly ValidationIssue[],
) {
  let value = root;
  let cloned = false;
  const notes: string[] = [];

  for (const issue of issues) {
    if (issue.code !== "too_big" || issue.maximum === undefined) continue;
    const maximum =
      typeof issue.maximum === "bigint" ? Number(issue.maximum) : issue.maximum;
    if (!Number.isFinite(maximum)) continue;

    const path = (issue.path ?? []).filter(
      (key): key is PathKey =>
        typeof key === "string" || typeof key === "number",
    );
    if (path.length === 0) continue;

    if (!cloned) {
      value = structuredClone(root);
      cloned = true;
    }

    let container = value as Record<PathKey, unknown> | undefined;
    for (const key of path.slice(0, -1)) {
      container = (container?.[key] ?? undefined) as
        | Record<PathKey, unknown>
        | undefined;
    }

    const lastKey = path[path.length - 1];
    const target = container?.[lastKey];
    if (!Array.isArray(target) || target.length <= maximum) continue;

    (container as Record<PathKey, unknown>)[lastKey] = target.slice(0, maximum);
    notes.push(`${path.join(".")} trimmed to ${maximum}`);
  }

  return { value, notes };
}

export type ParseResult<T> =
  | { success: true; data: T; trimmed: string[] }
  | { success: false; message: string };

/** Validate model output against the zod schema, trimming only over-limit arrays. */
export function parseWithRepair<T>(
  schema: z.ZodType<T>,
  raw: unknown,
): ParseResult<T> {
  const first = schema.safeParse(raw);
  if (first.success) return { success: true, data: first.data, trimmed: [] };

  const trimmed = trimOversizedArrays(raw, first.error.issues);
  if (trimmed.notes.length > 0) {
    const second = schema.safeParse(trimmed.value);
    if (second.success)
      return { success: true, data: second.data, trimmed: trimmed.notes };
  }

  const message = first.error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");

  return { success: false, message };
}

/* ------------------------------ transports ------------------------------ */

type CallArgs = {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  temperature: number;
};

async function callGemini(
  config: ProviderConfig,
  model: string,
  args: CallArgs,
): Promise<string> {
  const ai = getGeminiClient(config);
  const response = await ai.models.generateContent({
    model,
    contents: args.prompt,
    config: {
      systemInstruction: args.system,
      responseMimeType: "application/json",
      responseJsonSchema: args.jsonSchema,
      temperature: args.temperature,
    },
  });

  const text = response.text;
  if (!text) throw new Error("The model returned an empty response.");
  return text;
}

type ChatMessage = { role: "system" | "user"; content: string };

type ChatRequestBody = {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  response_format?: { type: "json_object" };
  /** Z.ai only: GLM reasons before answering by default, which triples latency for these long plans. */
  thinking?: { type: "enabled" | "disabled" };
};

async function postChatCompletion(
  config: ProviderConfig,
  body: ChatRequestBody,
): Promise<
  { ok: true; text: string } | { ok: false; status: number; detail: string }
> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GENERATION_BUDGET_MS),
    });
  } catch (error) {
    throw new Error(
      `Could not reach ${url}: ${error instanceof Error ? error.message : String(error)}. ` +
        "Check AI_BASE_URL and that the server is running.",
    );
  }

  const raw = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, detail: raw.slice(0, 600) };
  }

  try {
    const json = JSON.parse(raw) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    return { ok: true, text: typeof content === "string" ? content : "" };
  } catch {
    return {
      ok: false,
      status: 502,
      detail: `Endpoint returned non-JSON: ${raw.slice(0, 200)}`,
    };
  }
}

async function callOpenAICompatible(
  config: ProviderConfig,
  model: string,
  args: CallArgs,
): Promise<string> {
  const body: ChatRequestBody = {
    model,
    messages: [
      { role: "system", content: args.system },
      {
        role: "user",
        content:
          `${args.prompt}\n\n` +
          "Return a single JSON object that validates against this JSON Schema. Follow every array length and enum " +
          `described in it exactly.\n\nJSON SCHEMA:\n${JSON.stringify(args.jsonSchema)}`,
      },
    ],
    temperature: args.temperature,
    // The free GLM Flash tier is slow enough that hidden reasoning blows the generation budget.
    ...(config.provider === "zai" ? { thinking: { type: "disabled" as const } } : {}),
  };

  // JSON mode is widely but not universally supported; fall back once if the endpoint rejects it.
  const jsonMode = process.env.AI_JSON_MODE !== "false";
  let result = await postChatCompletion(
    config,
    jsonMode ? { ...body, response_format: { type: "json_object" } } : body,
  );

  if (
    !result.ok &&
    jsonMode &&
    result.status === 400 &&
    /response_format|json_object|json mode/i.test(result.detail)
  ) {
    result = await postChatCompletion(config, body);
  }

  if (!result.ok) {
    throw new Error(
      `HTTP ${result.status} from ${config.baseUrl}: ${result.detail}`,
    );
  }
  if (!result.text.trim()) {
    throw new Error("The model returned an empty response.");
  }

  return result.text;
}

/* ------------------------------ error mapping ------------------------------ */

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
  return (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit")
  );
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
    message.includes("timeout") ||
    message.includes("aborted")
  );
}

function isAuthError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes("api key not valid") ||
    message.includes("api_key_invalid") ||
    message.includes("invalid api key") ||
    message.includes("unauthorized") ||
    message.includes("permission denied") ||
    message.includes("unauthenticated") ||
    message.includes("401") ||
    message.includes("403")
  );
}

/* ------------------------------ generation ------------------------------ */

type GenerateArgs<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  temperature?: number;
};

function busyMessage(label: string): string {
  return (
    `${label} is busy or slow right now. Give it a few seconds and try again — if this keeps happening, ` +
    "point the app at a lighter model (GEMINI_MODEL, or AI_MODEL for OpenAI-compatible endpoints)."
  );
}

/**
 * Ask the configured provider for a JSON object and guarantee the result matches the zod schema.
 * Tries models in order, performs one self-repair pass on invalid output, and is race-guarded by
 * a watchdog so a stalled request can never hang the caller.
 */
export async function generateStructured<T>(
  args: GenerateArgs<T>,
): Promise<{ data: T; model: string }> {
  let watchdog: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    watchdog = setTimeout(() => {
      const config = safeConfig();
      reject(
        new AIError({
          status: 504,
          code: "MODEL_UNAVAILABLE",
          message: busyMessage(config.label),
        }),
      );
    }, WATCHDOG_MS);
  });

  try {
    return await Promise.race([runGeneration(args), deadline]);
  } finally {
    if (watchdog) clearTimeout(watchdog);
  }
}

function safeConfig(): ProviderConfig {
  try {
    return resolveProvider();
  } catch {
    return {
      provider: "gemini",
      models: GEMINI_MODELS,
      baseUrl: "",
      apiKey: "",
      label: "The model provider",
    };
  }
}

async function runGeneration<T>({
  system,
  prompt,
  schema,
  jsonSchema,
  temperature = 0.75,
}: GenerateArgs<T>): Promise<{ data: T; model: string }> {
  const config = resolveProvider();
  const startedAt = Date.now();
  let lastError: unknown = null;
  let hardFailure: unknown = null;
  let anyTransient = false;
  let anyNotFound = false;
  let anyTimeout = false;

  outer: for (const model of config.models) {
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
              lastError instanceof Error
                ? lastError.message.slice(0, 900)
                : "unknown error"
            }\nReturn the corrected JSON object only.`;

      try {
        const text =
          config.provider === "gemini"
            ? await callGemini(config, model, {
                system,
                prompt: contents,
                jsonSchema,
                temperature,
              })
            : await callOpenAICompatible(config, model, {
                system,
                prompt: contents,
                jsonSchema,
                temperature,
              });

        const parsed = parseWithRepair(schema, extractJson(text));
        if (!parsed.success) throw new Error(parsed.message);
        if (parsed.trimmed.length > 0) {
          console.warn(`[llm] ${model}: ${parsed.trimmed.join("; ")}`);
        }

        return { data: parsed.data, model };
      } catch (error) {
        lastError = error;

        if (isAuthError(error)) {
          throw new AIError({
            status: 500,
            code: "NO_API_KEY",
            message: `${config.label} rejected the API key. Check the key in .env.local and restart the server.`,
          });
        }

        if (isRateLimited(error)) {
          throw new AIError({
            status: 429,
            code: "RATE_LIMIT",
            message:
              `${config.label} is rate limiting this key right now. Wait a minute and try again` +
              (config.provider === "gemini"
                ? ", or set GEMINI_MODEL to a model with available quota."
                : config.provider === "zai"
                  ? ". The free GLM Flash tier handles roughly one request at a time, so retry once the current one finishes."
                  : ", raise the provider's quota, or run a local model with Ollama (AI_PROVIDER=ollama) for no request limit."),
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
    throw new AIError({
      status: 502,
      code: "BAD_OUTPUT",
      message: `${config.label} could not produce a valid response. ${
        hardFailure instanceof Error
          ? hardFailure.message.slice(0, 400)
          : "Unknown error"
      }`,
    });
  }

  if (anyTimeout || anyTransient) {
    throw new AIError({
      status: 504,
      code: "MODEL_UNAVAILABLE",
      message: busyMessage(config.label),
    });
  }

  if (anyNotFound) {
    throw new AIError({
      status: 502,
      code: "MODEL_UNAVAILABLE",
      message:
        config.provider === "gemini"
          ? `No configured Gemini model is available (tried ${config.models.join(", ")}). Set GEMINI_MODEL in .env.local to a model your key can access.`
          : `${config.label} does not serve "${config.models[0]}". Set AI_MODEL to a model the endpoint has loaded.`,
    });
  }

  throw new AIError({
    status: 502,
    code: "BAD_OUTPUT",
    message: `${config.label} could not produce a valid response. ${
      lastError instanceof Error
        ? lastError.message.slice(0, 400)
        : "Unknown error"
    }`,
  });
}
