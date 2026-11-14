import type { Metadata } from "next";
import Library from "@/components/Library";

export const metadata: Metadata = {
  title: "Library — Pathforge",
  description: "Your saved roadmaps, transitions and progress.",
};

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mist">Saved locally</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your library</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-mist">
          Every plan you generate is stored in this browser only — no account, no server-side history. Tick tasks off
          inside a plan to keep your progress.
        </p>
      </div>
      <Library />
    </div>
  );
}
