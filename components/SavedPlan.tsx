"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SavedItem } from "@/lib/types";
import { ApiError, getItem } from "@/lib/storage";
import ResultView from "./ResultView";
import { ArrowIcon } from "./ui";

export default function SavedPlan({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [ready, setReady] = useState(false);
  const [signIn, setSignIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getItem(id)
      .then((found) => {
        if (!cancelled) setItem(found);
      })
      .catch((error) => {
        if (!cancelled) setSignIn(error instanceof ApiError && error.status === 401);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!ready) {
    return <div className="panel h-64 animate-pulse opacity-60" />;
  }

  if (signIn) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-[15px] font-semibold text-chalk">Sign in to open this plan</p>
        <p className="max-w-md text-[12.5px] leading-relaxed text-mist">
          Plans are stored against your account so they follow you between devices.
        </p>
        <Link href={`/login?next=/library/${id}`} className="btn btn-primary text-xs">
          Continue with Google
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-[15px] font-semibold text-chalk">This plan could not be found</p>
        <p className="max-w-md text-[12.5px] leading-relaxed text-mist">
          It may have been deleted, or it belongs to a different account.
        </p>
        <Link href="/" className="btn btn-primary text-xs">
          Generate a plan
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return <ResultView item={item} onDeleted={() => router.push("/library")} />;
}
