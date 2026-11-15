import { NextResponse } from "next/server";
import { providerInfo } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(providerInfo());
}
