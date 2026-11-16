import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { mongoConfigured, users, type UserDoc } from "./db";

/**
 * Minimal Google-only auth: authorization-code flow, a users collection, and a signed
 * httpOnly session cookie. No auth framework, so there is nothing to keep in sync with
 * Next.js releases.
 */

export const SESSION_COOKIE = "pf_session";
export const STATE_COOKIE = "pf_oauth_state";
export const NEXT_COOKIE = "pf_oauth_next";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
  plan: "free" | "pro";
  usedGenerations: number;
  createdAt: string;
};

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function authConfigured(): boolean {
  return googleConfigured() && mongoConfigured();
}

function secret(): string {
  const value = process.env.AUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!value) throw new Error("AUTH_SECRET is missing. Add it to .env.local.");
  return value;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = base64url(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_MAX_AGE * 1000 }),
  );
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof data.uid !== "string" || typeof data.exp !== "number")
      return null;
    if (data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

function toSessionUser(user: UserDoc): SessionUser {
  return {
    id: user._id!.toString(),
    email: user.email,
    name: user.name,
    picture: user.picture,
    plan: user.plan,
    usedGenerations: user.usedGenerations,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!mongoConfigured()) return null;
  try {
    const jar = await cookies();
    const userId = readSessionToken(jar.get(SESSION_COOKIE)?.value);
    if (!userId || !ObjectId.isValid(userId)) return null;
    const found = await (await users()).findOne({ _id: new ObjectId(userId) });
    return found ? toSessionUser(found) : null;
  } catch (error) {
    console.error("[auth] session lookup failed", error);
    return null;
  }
}

/* ------------------------------ Google OAuth ------------------------------ */

export function redirectUri(requestUrl: string): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(requestUrl).origin;
  return `${base.replace(/\/+$/, "")}/api/auth/google/callback`;
}

export function newState(): string {
  return randomBytes(24).toString("hex");
}

export function googleAuthUrl(state: string, callback: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callback,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  picture: string;
};

export async function exchangeCode(
  code: string,
  callback: string,
): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callback,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    console.error(
      "[auth] token exchange failed",
      tokenResponse.status,
      (await tokenResponse.text()).slice(0, 300),
    );
    return null;
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) return null;

  const profileResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    },
  );
  if (!profileResponse.ok) {
    console.error("[auth] userinfo failed", profileResponse.status);
    return null;
  }

  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!profile.sub || !profile.email) return null;

  return {
    googleId: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name || profile.email.split("@")[0],
    picture: profile.picture || "",
  };
}

export async function upsertUser(profile: GoogleProfile): Promise<UserDoc> {
  const collection = await users();
  const now = new Date();

  const user = await collection.findOneAndUpdate(
    { googleId: profile.googleId },
    {
      $set: {
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      $setOnInsert: {
        googleId: profile.googleId,
        plan: "free",
        usedGenerations: 0,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!user) throw new Error("Could not create or load the user record.");
  return user;
}

export { toSessionUser };
