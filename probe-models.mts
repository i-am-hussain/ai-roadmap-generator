import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: "v1beta" });

for (const model of ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-lite-latest"]) {
  const started = Date.now();
  try {
    const res = await ai.models.generateContent({
      model,
      contents: 'Reply with {"ok":true}',
      config: { responseMimeType: "application/json" },
    });
    console.log(`${model}: OK in ${Date.now() - started}ms`, JSON.stringify(res.text?.slice(0, 30)));
  } catch (error) {
    const message = (error as Error).message.replace(/\s+/g, " ");
    console.log(`${model}: ${message.includes("404") ? "UNAVAILABLE (404)" : message.includes("503") ? "503 high demand" : message.slice(0, 90)} in ${Date.now() - started}ms`);
  }
}
