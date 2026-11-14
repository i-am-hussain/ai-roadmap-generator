import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return NextResponse.json({
    configured,
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  });
}
