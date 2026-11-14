import type { Metadata } from "next";
import Link from "next/link";
import SavedPlan from "@/components/SavedPlan";

export const metadata: Metadata = {
  title: "Saved plan — Pathforge",
};

export default async function SavedPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft />
        Back to library
      </Link>
      <SavedPlan id={id} />
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19 12H6m0 0 5-5m-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
