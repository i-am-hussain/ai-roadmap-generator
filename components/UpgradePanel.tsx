"use client";

import { useState } from "react";

/**
 * Pricing surface for the (not yet connected) paid plan. Checkout is intentionally a
 * placeholder until a payment provider is wired up.
 */
export default function UpgradePanel({
  currentPlan,
  remaining,
}: {
  currentPlan: "free" | "pro";
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const isPro = currentPlan === "pro";

  return (
    <>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="panel flex flex-col justify-between p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Free</p>
            <p className="mt-2 text-2xl font-semibold text-chalk">
              $0<span className="text-sm font-normal text-mist"> forever</span>
            </p>
            <ul className="mt-4 space-y-2 text-[12.5px] text-mist">
              <li>3 roadmap generations</li>
              <li>Full transition analysis</li>
              <li>Library, progress tracking and PDF export</li>
            </ul>
          </div>
          <p className="mt-5 rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-[11.5px] text-mist">
            {isPro ? "Included in your plan" : `You have ${remaining} of 3 left`}
          </p>
        </div>

        <div className="panel relative flex flex-col justify-between overflow-hidden border-accent/30 p-6">
          <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-accent/[0.09] blur-3xl" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Pro</p>
            <p className="mt-2 text-2xl font-semibold text-chalk">
              $12<span className="text-sm font-normal text-mist"> / month</span>
            </p>
            <ul className="mt-4 space-y-2 text-[12.5px] text-mist">
              <li>Unlimited roadmaps and transitions</li>
              <li>Priority generation</li>
              <li>Everything in Free</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={isPro}
            className="btn btn-primary mt-5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPro ? "You are on Pro" : "Upgrade to Pro"}
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel w-full max-w-sm p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[15px] font-semibold text-chalk">Checkout is not connected yet</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mist">
              Payments go here. The pricing is finalised, but the payment provider has not been connected, so nothing
              can be charged — and your account will not be upgraded by this button.
            </p>
            <p className="mt-3 rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-[11.5px] text-mist">
              Your 3 free plans stay available, and existing plans remain downloadable.
            </p>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary mt-5 w-full text-xs">
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
