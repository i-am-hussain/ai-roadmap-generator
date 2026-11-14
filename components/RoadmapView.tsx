"use client";

import type { Roadmap } from "@/lib/schemas";
import { CheckIcon, ClockIcon, Pill, SectionTitle } from "./ui";

type Props = {
  roadmap: Roadmap;
  progress: Record<string, boolean>;
  onToggle: (key: string) => void;
};

const isSafeUrl = (url: string) => /^https?:\/\//i.test(url.trim());

const RESOURCE_LABEL: Record<string, string> = {
  course: "Course",
  docs: "Docs",
  book: "Book",
  video: "Video",
  practice: "Practice",
  community: "Community",
};

export default function RoadmapView({ roadmap, progress, onToggle }: Props) {
  return (
    <div className="space-y-12">
      <section>
        <SectionTitle eyebrow="Outcomes" title="What you will be able to do" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {roadmap.outcomes.map((outcome) => (
            <div key={outcome} className="flex gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <CheckIcon className="h-3 w-3" />
              </span>
              <p className="text-[13.5px] leading-relaxed text-chalk/90">{outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="The plan"
          title={`${roadmap.phases.length} phases, ${roadmap.totalWeeks} weeks`}
          description="Work top to bottom. Tick tasks off as you finish them — your progress is saved on this device."
        />

        <div className="relative space-y-5">
          <div className="absolute bottom-6 left-[21px] top-6 hidden w-px bg-gradient-to-b from-accent/40 via-line to-transparent sm:block" />

          {roadmap.phases.map((phase, index) => {
            const done = phase.tasks.filter((_, taskIndex) => progress[`${phase.id}:${taskIndex}`]).length;
            const complete = done === phase.tasks.length && phase.tasks.length > 0;

            return (
              <article key={phase.id} className="relative sm:pl-14">
                <div
                  className={`absolute left-0 top-5 hidden h-[43px] w-[43px] place-items-center rounded-xl border text-sm font-semibold sm:grid ${
                    complete
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-line bg-surface text-mist"
                  }`}
                >
                  {complete ? <CheckIcon className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}
                </div>

                <div className="panel overflow-hidden">
                  <div className="border-b border-line/80 bg-white/[0.015] px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="lime">{phase.duration}</Pill>
                      <Pill tone="neutral">{phase.skills.length} skills</Pill>
                      <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-mist">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {phase.tasks.reduce((sum, task) => sum + task.hours, 0)}h planned
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight">{phase.title}</h3>
                    <p className="mt-1 text-sm text-mist">{phase.focus}</p>
                  </div>

                  <div className="space-y-5 px-5 py-5">
                    <div>
                      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
                        Objectives
                      </h4>
                      <ul className="space-y-1.5">
                        {phase.objectives.map((objective) => (
                          <li key={objective} className="flex gap-2.5 text-[13.5px] leading-relaxed text-chalk/85">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="mb-2.5 flex items-center justify-between">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">Tasks</h4>
                        <span className="text-[11px] tabular-nums text-mist">
                          {done}/{phase.tasks.length} done
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {phase.tasks.map((task, taskIndex) => {
                          const key = `${phase.id}:${taskIndex}`;
                          const checked = Boolean(progress[key]);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => onToggle(key)}
                              aria-pressed={checked}
                              className={`group flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                                checked
                                  ? "border-accent/20 bg-accent/[0.045]"
                                  : "border-line/70 bg-black/20 hover:border-line-strong hover:bg-white/[0.03]"
                              }`}
                            >
                              <span
                                className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ${
                                  checked
                                    ? "border-accent bg-accent text-[#0a0d05]"
                                    : "border-line-strong bg-transparent text-transparent group-hover:border-mist"
                                }`}
                              >
                                <CheckIcon className="h-3 w-3" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block text-[13.5px] font-medium ${
                                    checked ? "text-mist line-through decoration-mist/40" : "text-chalk"
                                  }`}
                                >
                                  {task.title}
                                </span>
                                <span className={`mt-0.5 block text-xs leading-relaxed ${checked ? "text-mist/60" : "text-mist"}`}>
                                  {task.detail}
                                </span>
                              </span>
                              <span className="mt-0.5 shrink-0 text-[11px] tabular-nums text-mist/80">{task.hours}h</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
                          Resources
                        </h4>
                        <div className="space-y-2">
                          {phase.resources.map((resource) => (
                            <div key={resource.title} className="rounded-xl border border-line/70 bg-black/20 px-3.5 py-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[13px] font-medium text-chalk/95">
                                  {isSafeUrl(resource.url) ? (
                                    <a
                                      href={resource.url.trim()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent/60"
                                    >
                                      {resource.title}
                                    </a>
                                  ) : (
                                    resource.title
                                  )}
                                </p>
                                <span className="shrink-0 rounded border border-line bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mist">
                                  {RESOURCE_LABEL[resource.type] ?? resource.type}
                                </span>
                              </div>
                              <p className="mt-1 text-[11.5px] leading-relaxed text-mist">{resource.why}</p>
                              <p className="mt-1 text-[11px] text-mist/60">{resource.provider}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-4">
                          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent/90">
                            Build this
                          </p>
                          <p className="mt-1.5 text-[13.5px] font-semibold text-chalk">{phase.project.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-mist">{phase.project.brief}</p>
                          <p className="mt-2.5 border-t border-accent/15 pt-2.5 text-[11.5px] leading-relaxed text-chalk/80">
                            <span className="font-semibold text-accent/90">Deliverable · </span>
                            {phase.project.deliverable}
                          </p>
                        </div>
                        <div className="rounded-xl border border-line/70 bg-black/20 p-4">
                          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-mist">
                            Checkpoint
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-chalk/85">{phase.checkpoint}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 border-t border-line/60 pt-4">
                      {phase.skills.map((skill) => (
                        <span key={skill} className="chip">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Milestones" title="Proof points along the way" />
        <div className="panel divide-y divide-line/70">
          {roadmap.milestones.map((milestone) => (
            <div key={`${milestone.week}-${milestone.title}`} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-5">
              <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Week {milestone.week}
              </span>
              <div>
                <p className="text-[13.5px] font-medium text-chalk">{milestone.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-mist">{milestone.proof}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Capstone" title="Final project" />
        <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-[linear-gradient(135deg,rgba(201,247,95,0.09),rgba(125,211,252,0.05)_45%,transparent)] p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
          <h3 className="relative text-lg font-semibold text-chalk">{roadmap.finalProject.title}</h3>
          <p className="relative mt-2 max-w-3xl text-sm leading-relaxed text-chalk/80">{roadmap.finalProject.brief}</p>
          <p className="relative mt-4 text-[13px] text-chalk/90">
            <span className="font-semibold text-accent">Deliverable · </span>
            {roadmap.finalProject.deliverable}
          </p>
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {roadmap.finalProject.skillsShown.map((skill) => (
              <Pill key={skill} tone="sky">
                {skill}
              </Pill>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Definition of done" title="Success metrics" />
          <div className="space-y-2">
            {roadmap.successMetrics.map((metric) => (
              <div key={metric} className="flex gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky" />
                <p className="text-[13px] leading-relaxed text-chalk/85">{metric}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="Avoid" title="Common pitfalls" />
          <div className="space-y-2">
            {roadmap.pitfalls.map((pitfall) => (
              <div key={pitfall.pitfall} className="rounded-xl border border-line bg-white/[0.02] px-4 py-3">
                <p className="text-[13px] font-medium text-amber-200/90">{pitfall.pitfall}</p>
                <p className="mt-1 text-xs leading-relaxed text-mist">{pitfall.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="When this plan ends" title="Next steps" />
        <ol className="panel divide-y divide-line/70">
          {roadmap.nextSteps.map((step, index) => (
            <li key={step} className="flex gap-4 px-5 py-3.5">
              <span className="text-[11px] font-semibold tabular-nums text-accent">{String(index + 1).padStart(2, "0")}</span>
              <p className="text-[13px] leading-relaxed text-chalk/85">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
