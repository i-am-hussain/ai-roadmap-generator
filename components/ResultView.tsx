"use client";

import { useMemo, useState } from "react";
import type { SavedItem } from "@/lib/types";
import { deleteItem, saveProgress, totalTasks } from "@/lib/storage";
import { itemToMarkdown } from "@/lib/markdown";
import RoadmapView from "./RoadmapView";
import TransitionView from "./TransitionView";
import { CopyButton, DownloadIcon, Pill, ProgressRing, SparkIcon, TrashIcon } from "./ui";

type Props = {
  item: SavedItem;
  onDeleted?: () => void;
  onClose?: () => void;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export default function ResultView({ item, onDeleted, onClose }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>(item.progress ?? {});
  const [exported, setExported] = useState(false);

  const total = totalTasks(item);
  const done = useMemo(
    () => item.roadmap.phases.reduce((sum, phase) => sum + phase.tasks.filter((_, i) => progress[`${phase.id}:${i}`]).length, 0),
    [item.roadmap.phases, progress],
  );
  const percent = total ? Math.round((done / total) * 100) : 0;

  function toggle(key: string) {
    const next = { ...progress };
    if (next[key]) delete next[key];
    else next[key] = true;
    setProgress(next);
    void saveProgress(item.id, next).catch(() => {
      /* offline: the click still applies for this session */
    });
  }

  function exportMarkdown() {
    const markdown = itemToMarkdown({ ...item, progress });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(item.title) || "roadmap"}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 1800);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this plan from your library? This cannot be undone.")) return;
    try {
      await deleteItem(item.id);
      onDeleted?.();
    } catch {
      window.alert("Could not delete this plan. Please try again.");
    }
  }

  const isTransition = item.kind === "transition" && item.transition;
  const title = isTransition ? item.transition!.headline : item.roadmap.title;
  const subtitle = item.roadmap.tagline;

  return (
    <div className="animate-fade-up">
      <div className="panel relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.07] blur-3xl" />
        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={isTransition ? "violet" : "lime"}>
                <SparkIcon className="h-3 w-3" />
                {isTransition ? "Career transition analysis" : "Learning roadmap"}
              </Pill>
              <Pill tone="neutral">{item.roadmap.targetRole}</Pill>
              <Pill tone="neutral">{item.roadmap.difficulty}</Pill>
            </div>

            <h1 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-chalk sm:text-[30px]">
              {title}
            </h1>
            <p className="mt-2.5 max-w-3xl text-[13.5px] leading-relaxed text-mist">{subtitle}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-mist">
              <span>
                <span className="font-semibold text-chalk">{item.roadmap.totalWeeks}</span> weeks
              </span>
              <span>
                <span className="font-semibold text-chalk">{item.roadmap.weeklyHours}</span> h / week
              </span>
              <span>
                <span className="font-semibold text-chalk">{item.roadmap.phases.length}</span> phases
              </span>
              <span>
                <span className="font-semibold text-chalk">{done}</span> of {total} tasks done
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <a href={`/api/plans/${item.id}/pdf`} className="btn btn-primary text-xs">
                <DownloadIcon className="h-3.5 w-3.5" />
                Download PDF
              </a>
              <button type="button" onClick={exportMarkdown} className="btn btn-ghost text-xs">
                <DownloadIcon className="h-3.5 w-3.5" />
                {exported ? "Downloaded" : "Markdown"}
              </button>
              <CopyButton text={itemToMarkdown({ ...item, progress })} label="Copy plan" />
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-ghost text-xs text-rose-200/80 hover:border-rose-400/30 hover:bg-rose-400/10"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete
              </button>
              {onClose ? (
                <button type="button" onClick={onClose} className="btn btn-ghost text-xs">
                  Start another
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-xl border border-line bg-black/25 px-4 py-3 lg:flex-col lg:gap-2 lg:px-5 lg:py-4">
            <ProgressRing value={percent} size={62} />
            <div className="lg:text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Progress</p>
              <p className="mt-0.5 text-[11px] text-mist/80">{done}/{total} tasks · saved to your account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        {isTransition ? (
          <TransitionView
            transition={item.transition!}
            roadmap={item.roadmap}
            progress={progress}
            onToggle={toggle}
          />
        ) : (
          <RoadmapView roadmap={item.roadmap} progress={progress} onToggle={toggle} />
        )}
      </div>
    </div>
  );
}
