import { NextResponse, type NextRequest } from "next/server";
import {
  NEXT_COOKIE,
  STATE_COOKIE,
  googleAuthUrl,
  googleConfigured,
  newState,
  redirectUri,
} from "@/lib/auth";

export const runtime = "nodejs";

/** Keep post-login redirects on this site only. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=not_configured", request.url));
  }

  const state = newState();
  const callback = redirectUri(request.url);
  const response = NextResponse.redirect(googleAuthUrl(state, callback));

  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  };
  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(NEXT_COOKIE, safeNext(request.nextUrl.searchParams.get("next")), options);

  return response;
}
