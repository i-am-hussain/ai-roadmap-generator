"use client";

import type { Roadmap, TransitionResult } from "@/lib/schemas";
import { AlertIcon, CopyButton, Pill, ScoreBar, SectionTitle, TargetIcon, type Tone } from "./ui";
import RoadmapView from "./RoadmapView";

type Props = {
  transition: TransitionResult;
  roadmap: Roadmap;
  progress: Record<string, boolean>;
  onToggle: (key: string) => void;
};

const STRENGTH: Record<string, { tone: Tone; label: string }> = {
  direct: { tone: "lime", label: "Direct transfer" },
  strong: { tone: "sky", label: "Strong adjacency" },
  partial: { tone: "amber", label: "Partial" },
};

const PRIORITY: Record<string, { tone: Tone; label: string }> = {
  critical: { tone: "rose", label: "Critical" },
  important: { tone: "amber", label: "Important" },
  "nice-to-have": { tone: "neutral", label: "Nice to have" },
};

const FIT: Record<string, { tone: Tone; label: string }> = {
  high: { tone: "lime", label: "High fit" },
  medium: { tone: "sky", label: "Medium fit" },
  low: { tone: "neutral", label: "Stepping stone" },
};

const scoreTone = (score: number): Tone =>
  score >= 70 ? "lime" : score >= 45 ? "sky" : score >= 30 ? "amber" : "rose";

export default function TransitionView({ transition, roadmap, progress, onToggle }: Props) {
  const tone = scoreTone(transition.feasibility.score);

  return (
    <div className="space-y-12">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[190px_1fr] md:items-center">
          <div className="rounded-xl border border-line bg-black/30 p-5 text-center">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-mist">Feasibility</p>
            <p className="mt-1 text-5xl font-semibold tabular-nums tracking-tight text-chalk">
              {transition.feasibility.score}
              <span className="text-lg text-mist">/100</span>
            </p>
            <div className="mt-3">
              <ScoreBar score={transition.feasibility.score} tone={tone} />
            </div>
            <div className="mt-3 flex justify-center">
              <Pill tone={tone}>{transition.feasibility.label}</Pill>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="violet">Transition verdict</Pill>
              <Pill tone="neutral">~{transition.feasibility.estimatedMonths} months to hireable</Pill>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-chalk/90">{transition.feasibility.reasoning}</p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-mist">{transition.summary}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Your leverage"
          title="Skills you already have that carry over"
          description="These are the assets to lead with — reframe them for the target field instead of hiding them."
        />
        <div className="space-y-2.5">
          {transition.transferable.map((item) => {
            const meta = STRENGTH[item.strength] ?? STRENGTH.partial;
            return (
              <div key={item.skill} className="panel p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14.5px] font-semibold text-chalk">{item.skill}</h3>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                </div>
                <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">Where it helps</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-chalk/85">{item.whereItHelps}</p>
                  </div>
                  <div className="sm:border-l sm:border-line/70 sm:pl-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">How to prove it</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-chalk/85">{item.proof}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <SectionTitle eyebrow="Gap analysis" title="What you still need" />
          <div className="space-y-2">
            {transition.gaps.map((gap) => {
              const meta = PRIORITY[gap.priority] ?? PRIORITY.important;
              return (
                <div key={gap.skill} className="rounded-xl border border-line bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13.5px] font-semibold text-chalk">{gap.skill}</h3>
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                    <span className="ml-auto text-[11px] tabular-nums text-mist">~{gap.weeks}w</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-mist">{gap.why}</p>
                  <p className="mt-2 border-t border-line/60 pt-2 text-[12px] leading-relaxed text-chalk/80">
                    <span className="font-semibold text-accent/90">Close it · </span>
                    {gap.howToClose}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionTitle eyebrow="Assets" title="Your starting hand" />
            <ul className="space-y-1.5">
              {transition.currentAssets.map((asset) => (
                <li key={asset} className="flex gap-2.5 text-[12.5px] leading-relaxed text-chalk/85">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
                  {asset}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionTitle eyebrow="Shorter hops" title="Bridge roles" />
            <div className="space-y-2">
              {transition.bridgeRoles.map((role) => {
                const meta = FIT[role.fit] ?? FIT.medium;
                return (
                  <div key={role.role} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-chalk">{role.role}</p>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-mist">{role.why}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Positioning" title="How to tell the story" />
          <div className="panel space-y-4 p-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">Narrative</p>
                <CopyButton text={transition.positioning.narrative} />
              </div>
              <p className="text-[13px] leading-relaxed text-chalk/85">{transition.positioning.narrative}</p>
            </div>

            <div className="border-t border-line/70 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">Headline</p>
                <CopyButton text={transition.positioning.headline} />
              </div>
              <p className="rounded-lg border border-sky/20 bg-sky/[0.06] px-3 py-2 text-[12.5px] font-medium text-sky">
                {transition.positioning.headline}
              </p>
            </div>

            <div className="border-t border-line/70 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">Resume bullets</p>
                <CopyButton text={transition.positioning.resumeBullets.map((b) => `• ${b}`).join("\n")} />
              </div>
              <ul className="space-y-1.5">
                {transition.positioning.resumeBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-[12.5px] leading-relaxed text-chalk/85">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-line/70 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">ATS keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {transition.positioning.keywords.map((keyword) => (
                  <span key={keyword} className="chip">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionTitle eyebrow="Do this week" title="Quick wins" />
            <div className="space-y-2">
              {transition.quickWins.map((win) => (
                <div key={win.action} className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-medium text-chalk">{win.action}</p>
                    <span className="shrink-0 text-[10.5px] text-accent/80">{win.effort}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-mist">{win.why}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle eyebrow="Watch out" title="What derails this switch" />
            <div className="space-y-2">
              {transition.risks.map((risk) => (
                <div key={risk.risk} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
                  <p className="flex items-start gap-2 text-[12.5px] font-medium text-amber-200/90">
                    <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {risk.risk}
                  </p>
                  <p className="mt-1 pl-5.5 text-[11.5px] leading-relaxed text-mist">{risk.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line/70 pt-10">
        <div className="mb-8 flex items-center gap-2">
          <TargetIcon className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-semibold tracking-tight">Your transition roadmap</h2>
          <span className="chip ml-1">{roadmap.totalWeeks} weeks</span>
        </div>
        <RoadmapView roadmap={roadmap} progress={progress} onToggle={onToggle} />
      </section>
    </div>
  );
}
