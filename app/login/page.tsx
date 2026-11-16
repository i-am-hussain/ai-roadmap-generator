import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, googleConfigured } from "@/lib/auth";
import { mongoConfigured } from "@/lib/db";

export const metadata: Metadata = {
  title: "Sign in — Pathforge",
  description: "Sign in with Google to build and keep your roadmaps.",
};

const ERRORS: Record<string, string> = {
  not_configured: "Google sign-in is not configured on this deployment yet.",
  db_not_configured: "The database is not configured on this deployment yet.",
  state_mismatch: "That sign-in link expired. Please try again.",
  oauth_failed: "Google could not complete the sign-in. Please try again.",
  cancelled: "Sign-in was cancelled.",
  database_error: "We could not save your account. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const user = await getSessionUser();
  if (user) redirect(next);

  const error = params.error ? ERRORS[params.error] ?? "Sign-in failed. Please try again." : null;
  const ready = googleConfigured() && mongoConfigured();

  return (
    <div className="mx-auto flex max-w-lg flex-col justify-center px-5 py-20">
      <div className="panel overflow-hidden">
        <div className="relative border-b border-line/70 p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/[0.08] blur-3xl" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mist">Pathforge account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-chalk">Sign in to start building</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-mist">
            Your plans, task progress and PDF downloads are tied to your account — no separate password to remember.
          </p>
        </div>

        <div className="p-7">
          {error ? (
            <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-rose-100">
              {error}
            </div>
          ) : null}

          {ready ? (
            <a
              href={`/api/auth/google?next=${encodeURIComponent(next)}`}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-white px-4 py-3 text-[13.5px] font-semibold text-[#1f1f1f] transition-transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              <GoogleMark />
              Continue with Google
            </a>
          ) : (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3.5 text-[12.5px] leading-relaxed text-amber-100/90">
              <p className="font-semibold">Accounts are not configured yet</p>
              <p className="mt-1 text-amber-100/70">
                Add <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">MONGODB_URI</code>,{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">GOOGLE_CLIENT_ID</code>,{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">GOOGLE_CLIENT_SECRET</code> and{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">AUTH_SECRET</code> to{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">.env.local</code>, then restart the
                server. Setup steps are in the README.
              </p>
            </div>
          )}

          <ul className="mt-6 space-y-2.5 text-[12.5px] text-mist">
            {[
              "3 free roadmaps, then a paid plan (checkout not live yet)",
              "Every plan saved to your account with task progress",
              "Clean, detailed PDF export of any plan",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-[11.5px] text-mist/70">
            Just looking?{" "}
            <Link href="/" className="text-accent hover:underline">
              Back to the generator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.5h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.6-10.3 6.6-17.6Z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.6 14.6 0 0 1 9.6 24c0-1.6.3-3.2.7-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.6-5.8l-7.6-5.9c-2 1.4-4.7 2.4-8 2.4-6.4 0-11.7-3.7-13.6-8.8l-7.8 6.1C6.5 42.6 14.6 48 24 48Z"
      />
    </svg>
  );
}
