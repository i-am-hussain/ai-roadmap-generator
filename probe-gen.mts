import { GoogleGenAI } from "@google/genai";
import { RoadmapSchema, toModelJsonSchema } from "./lib/schemas.ts";
import { buildRoadmapPrompt } from "./lib/prompts.ts";
import { parseWithRepair } from "./lib/llm.ts";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  apiVersion: "v1beta",
  httpOptions: { timeout: 300_000 },
});

const { system, prompt } = buildRoadmapPrompt({
  goal: "Learn PostgreSQL for backend work",
  level: "some basics",
  hoursPerWeek: 6,
  durationWeeks: 6,
  background: "I know basic JavaScript and a little SQL",
  preferences: ["projects", "official docs"],
});

const started = Date.now();
try {
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: toModelJsonSchema(RoadmapSchema),
      temperature: 0.75,
    },
  });

  const elapsed = Date.now() - started;
  const text = res.text ?? "";
  console.log(`completed in ${elapsed}ms, ${text.length} chars`);
  const parsed = parseWithRepair(RoadmapSchema, JSON.parse(text));
  console.log(
    parsed.success
      ? `VALID: phases=${parsed.data.phases.length} outcomes=${parsed.data.outcomes.length} trimmed=[${parsed.trimmed.join("; ")}]`
      : `INVALID: ${parsed.message}`,
  );
} catch (error) {
  console.log(`FAILED after ${Date.now() - started}ms: ${(error as Error).message.slice(0, 300)}`);
}
