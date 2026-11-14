"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SavedItem } from "@/lib/types";
import { getItem } from "@/lib/storage";
import ResultView from "./ResultView";
import { ArrowIcon } from "./ui";

export default function SavedPlan({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItem(getItem(id));
    setReady(true);
  }, [id]);

  if (!ready) {
    return <div className="panel h-64 animate-pulse opacity-60" />;
  }

  if (!item) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-[15px] font-semibold text-chalk">This plan is not on this device</p>
        <p className="max-w-md text-[12.5px] leading-relaxed text-mist">
          Plans are stored in the browser that created them. Open the same browser you generated it in, or create a new
          plan.
        </p>
        <Link href="/" className="btn btn-primary text-xs">
          Generate a plan
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <ResultView item={item} onDeleted={() => router.push("/library")} />
  );
}
