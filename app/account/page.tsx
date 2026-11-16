import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { countPlans } from "@/lib/plans";
import { FREE_GENERATIONS } from "@/lib/quota";
import UpgradePanel from "@/components/UpgradePanel";

export const metadata: Metadata = {
  title: "Account — Pathforge",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  let roadmapCount = 0;
  try {
    roadmapCount = await countPlans(user.id);
  } catch (error) {
    console.error("[account] count failed", error);
  }

  const unlimited = user.plan === "pro";
  const remaining = unlimited ? 0 : Math.max(0, FREE_GENERATIONS - user.usedGenerations);
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mist">Your account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{user.name}</h1>
      <p className="mt-1.5 text-[13px] text-mist">
        {user.email} · joined {joined}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Roadmaps created</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-chalk">{roadmapCount}</p>
          <Link href="/library" className="mt-2 inline-block text-[11.5px] text-accent hover:underline">
            Open library
          </Link>
        </div>

        <div className="panel p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Free plans left</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-chalk">
            {unlimited ? "∞" : remaining}
            {unlimited ? null : <span className="text-base font-normal text-mist"> / {FREE_GENERATIONS}</span>}
          </p>
          <p className="mt-2 text-[11.5px] text-mist">
            {user.usedGenerations} used on this account
          </p>
        </div>

        <div className="panel p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Current plan</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-chalk">
            {unlimited ? "Pro" : "Free"}
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                unlimited ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-white/[0.04] text-mist"
              }`}
            >
              {unlimited ? "active" : "trial"}
            </span>
          </p>
          <p className="mt-2 text-[11.5px] text-mist">
            {unlimited ? "Unlimited generations." : `${FREE_GENERATIONS} free plans, then upgrade.`}
          </p>
        </div>
      </div>

      <UpgradePanel currentPlan={unlimited ? "pro" : "free"} remaining={remaining} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-5 py-4">
        <div>
          <p className="text-[13px] font-semibold text-chalk">Signed in with Google</p>
          <p className="mt-0.5 text-[11.5px] text-mist">Signing out only affects this browser.</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="btn btn-ghost text-xs">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
