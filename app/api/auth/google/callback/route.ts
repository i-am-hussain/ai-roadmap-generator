import { NextResponse, type NextRequest } from "next/server";
import {
  NEXT_COOKIE,
  SESSION_COOKIE,
  STATE_COOKIE,
  createSessionToken,
  exchangeCode,
  redirectUri,
  sessionCookieOptions,
  upsertUser,
} from "@/lib/auth";
import { mongoConfigured } from "@/lib/db";

export const runtime = "nodejs";

function failure(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(NEXT_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  if (!mongoConfigured()) return failure(request, "db_not_configured");

  const params = request.nextUrl.searchParams;
  const oauthError = params.get("error");
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (oauthError) return failure(request, "cancelled");
  if (!code || !state || !expectedState || state !== expectedState) return failure(request, "state_mismatch");

  let profile;
  try {
    profile = await exchangeCode(code, redirectUri(request.url));
  } catch (error) {
    console.error("[auth] exchange threw", error);
    return failure(request, "oauth_failed");
  }
  if (!profile) return failure(request, "oauth_failed");

  try {
    const user = await upsertUser(profile);
    const userId = user._id!.toString();
    const next = request.cookies.get(NEXT_COOKIE)?.value;
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions());
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(NEXT_COOKIE);
    return response;
  } catch (error) {
    console.error("[auth] could not persist user", error);
    return failure(request, "database_error");
  }
}
