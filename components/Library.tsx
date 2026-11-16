"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, deleteItem, listItems, type PlanSummary } from "@/lib/storage";
import { ArrowIcon, ClockIcon, ProgressRing, SparkIcon, TrashIcon } from "./ui";

export default function Library() {
  const [items, setItems] = useState<PlanSummary[] | null>(null);
  const [error, setError] = useState<{ message: string; signIn: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listItems()
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch((failure) => {
        if (cancelled) return;
        setItems([]);
        setError({
          message: failure instanceof Error ? failure.message : "Could not load your library.",
          signIn: failure instanceof ApiError && failure.status === 401,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this plan? This cannot be undone.")) return;
    setBusy(id);
    try {
      await deleteItem(id);
      setItems((current) => (current ? current.filter((item) => item.id !== id) : current));
    } catch (failure) {
      setError({ message: failure instanceof Error ? failure.message : "Could not delete the plan.", signIn: false });
    } finally {
      setBusy(null);
    }
  }

  if (items === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="panel h-44 animate-pulse opacity-60" />
        ))}
      </div>
    );
  }

  if (error?.signIn) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[0.03] text-accent">
          <SparkIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-chalk">Sign in to open your library</p>
          <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-mist">
            Plans are saved to your account, so they follow you between devices.
          </p>
        </div>
        <Link href="/login?next=/library" className="btn btn-primary text-xs">
          Continue with Google
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[0.03] text-accent">
          <SparkIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-chalk">Nothing saved yet</p>
          <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-mist">
            Generate a roadmap or a transition analysis and it lands here automatically, with your task progress.
          </p>
        </div>
        <Link href="/" className="btn btn-primary text-xs">
          Build your first plan
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && !error.signIn ? (
        <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/[0.07] px-4 py-3 text-[12.5px] text-rose-100">
          {error.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const percent = item.taskCount ? Math.round((item.completedTasks / item.taskCount) * 100) : 0;
          return (
            <div key={item.id} className="panel panel-hover group relative overflow-hidden p-5">
              <Link href={`/library/${item.id}`} className="absolute inset-0 z-0" aria-label={`Open ${item.title}`} />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      item.kind === "transition"
                        ? "border-violet/30 bg-violet/10 text-violet"
                        : "border-accent/30 bg-accent/10 text-accent"
                    }`}
                  >
                    {item.kind === "transition" ? "Transition" : "Roadmap"}
                  </span>
                  <span className="text-[10.5px] text-mist/70">
                    {item.targetRole} · {item.totalWeeks}w
                  </span>
                </div>
                <div className="pointer-events-auto relative z-20">
                  <ProgressRing value={percent} size={44} />
                </div>
              </div>

              <h2 className="relative z-10 mt-3 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-chalk transition-colors group-hover:text-accent">
                {item.title}
              </h2>
              <p className="relative z-10 mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-mist">{item.subtitle}</p>

              <div className="relative z-10 mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-3 text-[10.5px] text-mist/70">
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="tabular-nums">
                  {percent}% · {item.taskCount} tasks
                </span>
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void remove(item.id);
                  }}
                  className="relative z-20 rounded-md p-1 text-mist/60 transition-colors hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-50"
                  aria-label="Delete plan"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
