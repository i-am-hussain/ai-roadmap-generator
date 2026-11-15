"use client";

import { useEffect, useRef, useState } from "react";
import type { Mode, RoadmapInput, SavedItem, TransitionInput } from "@/lib/types";
import { newId, saveItem } from "@/lib/storage";
import ResultView from "./ResultView";
import { AlertIcon, ArrowIcon, SparkIcon, TargetIcon } from "./ui";

const PREFERENCES = [
  "Video courses",
  "Books & long reads",
  "Hands-on projects",
  "Official docs",
  "Community / cohort",
  "A mentor's feedback",
];

const EXAMPLES = {
  roadmap: {
    goal: "Become a hireable data analyst using Python and SQL",
    level: "some basics",
    hoursPerWeek: 8,
    durationWeeks: 12,
    background:
      "I work in retail operations and use spreadsheets daily. I did a little Python on Codecademy but never finished a project.",
    preferences: ["Hands-on projects", "Video courses"],
  } satisfies RoadmapInput,
  transition: {
    currentRole: "High-school maths teacher",
    yearsExperience: 6,
    currentSkills:
      "Lesson planning, explaining complex ideas, Excel, basic Python, assessing student work, public speaking, curriculum design, leading a small department.",
    targetRole: "Data analyst",
    targetIndustry: "EdTech or public sector",
    hoursPerWeek: 10,
    timelineMonths: 9,
    constraints: "Still teaching full time. Need to keep an income, so evenings and school holidays only.",
  } satisfies TransitionInput,
};

const initialRoadmap: RoadmapInput = {
  goal: "",
  level: "some basics",
  hoursPerWeek: 8,
  durationWeeks: 12,
  background: "",
  preferences: [],
};

const initialTransition: TransitionInput = {
  currentRole: "",
  yearsExperience: 2,
  currentSkills: "",
  targetRole: "",
  targetIndustry: "",
  hoursPerWeek: 10,
  timelineMonths: 9,
  constraints: "",
};

export default function Generator() {
  const [mode, setMode] = useState<Mode>("roadmap");
  const [roadmapForm, setRoadmapForm] = useState<RoadmapInput>(initialRoadmap);
  const [transitionForm, setTransitionForm] = useState<TransitionInput>(initialTransition);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SavedItem | null>(null);
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: true, model: "gemini" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateRoadmap(patch: Partial<RoadmapInput>) {
    setRoadmapForm((current) => ({ ...current, ...patch }));
  }

  function updateTransition(patch: Partial<TransitionInput>) {
    setTransitionForm((current) => ({ ...current, ...patch }));
  }

  function togglePreference(preference: string) {
    setRoadmapForm((current) => ({
      ...current,
      preferences: current.preferences.includes(preference)
        ? current.preferences.filter((item) => item !== preference)
        : [...current.preferences, preference],
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    if (mode === "roadmap" && roadmapForm.goal.trim().length < 3) {
      setError("Tell us the goal you are working towards first.");
      return;
    }
    if (mode === "transition") {
      if (transitionForm.currentRole.trim().length < 2 || transitionForm.targetRole.trim().length < 2) {
        setError("Add both your current role and the role you want to move into.");
        return;
      }
      if (transitionForm.currentSkills.trim().length < 3) {
        setError("List at least a few of your current skills so we can map what carries over.");
        return;
      }
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const endpoint = mode === "roadmap" ? "/api/roadmap" : "/api/transition";
      const payload = mode === "roadmap" ? roadmapForm : transitionForm;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      let item: SavedItem;
      if (mode === "roadmap") {
        const roadmap = data.roadmap;
        item = {
          id: newId(),
          kind: "roadmap",
          createdAt: new Date().toISOString(),
          title: roadmap.title,
          subtitle: roadmap.tagline,
          input: roadmapForm,
          roadmap,
          progress: {},
        };
      } else {
        const transition = data.transition;
        item = {
          id: newId(),
          kind: "transition",
          createdAt: new Date().toISOString(),
          title: transition.headline,
          subtitle: transition.summary,
          input: transitionForm,
          roadmap: transition.roadmap,
          transition,
          progress: {},
        };
      }

      saveItem(item);
      setResult(item);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function loadExample() {
    if (mode === "roadmap") setRoadmapForm(EXAMPLES.roadmap);
    else setTransitionForm(EXAMPLES.transition);
    setError(null);
  }

  const isConfigured = status?.configured ?? true;

  return (
    <div id="generate" className="scroll-mt-24">
      {status && !isConfigured ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3.5">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="text-[12.5px] leading-relaxed text-amber-100/90">
            <p className="font-semibold">Gemini API key missing</p>
            <p className="mt-1 text-amber-100/70">
              Add <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">GEMINI_API_KEY=...</code> to{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px]">.env.local</code>, then restart the
              dev server. Grab a free key at aistudio.google.com/apikey.
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="panel overflow-hidden">
        <div className="grid gap-2 border-b border-line/80 p-3 sm:grid-cols-2">
          <ModeTab
            active={mode === "roadmap"}
            onClick={() => {
              setMode("roadmap");
              setError(null);
            }}
            icon={<SparkIcon className="h-4 w-4" />}
            title="Build a roadmap"
            description="Any skill or role, sequenced week by week"
          />
          <ModeTab
            active={mode === "transition"}
            onClick={() => {
              setMode("transition");
              setError(null);
            }}
            icon={<ArrowIcon className="h-4 w-4" />}
            title="Switch careers"
            description="What carries over, what you must learn"
          />
        </div>

        <div className="p-5 sm:p-7">
          {mode === "roadmap" ? (
            <div className="animate-fade-in space-y-5">
              <div>
                <label className="label" htmlFor="goal">
                  What do you want to become good at?
                </label>
                <input
                  id="goal"
                  className="field"
                  placeholder="e.g. Become a frontend developer, master motion design, pass the AWS SAA exam"
                  value={roadmapForm.goal}
                  maxLength={200}
                  onChange={(event) => updateRoadmap({ goal: event.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="level">
                    Starting point
                  </label>
                  <select
                    id="level"
                    className="field"
                    value={roadmapForm.level}
                    onChange={(event) => updateRoadmap({ level: event.target.value as RoadmapInput["level"] })}
                  >
                    <option value="absolute beginner">Absolute beginner</option>
                    <option value="some basics">I know some basics</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="hours">
                    Hours per week
                  </label>
                  <input
                    id="hours"
                    type="number"
                    min={1}
                    max={60}
                    className="field"
                    value={roadmapForm.hoursPerWeek}
                    onChange={(event) => updateRoadmap({ hoursPerWeek: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="weeks">
                    Weeks available
                  </label>
                  <input
                    id="weeks"
                    type="number"
                    min={2}
                    max={104}
                    className="field"
                    value={roadmapForm.durationWeeks}
                    onChange={(event) => updateRoadmap({ durationWeeks: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div>
                <span className="label">How do you like to learn?</span>
                <div className="flex flex-wrap gap-2">
                  {PREFERENCES.map((preference) => {
                    const active = roadmapForm.preferences.includes(preference);
                    return (
                      <button
                        key={preference}
                        type="button"
                        onClick={() => togglePreference(preference)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-accent/50 bg-accent/15 text-accent"
                            : "border-line bg-white/[0.02] text-mist hover:border-line-strong hover:text-chalk"
                        }`}
                      >
                        {preference}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label" htmlFor="background">
                  Anything else we should know?{" "}
                  <span className="font-normal text-mist/70">optional, but makes the plan sharper</span>
                </label>
                <textarea
                  id="background"
                  className="field min-h-[84px] resize-y"
                  placeholder="Your current job, what you have already tried, a deadline, a project you want to build..."
                  value={roadmapForm.background}
                  maxLength={1500}
                  onChange={(event) => updateRoadmap({ background: event.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="animate-fade-in space-y-5">
              <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                <div>
                  <label className="label" htmlFor="currentRole">
                    Where you are now
                  </label>
                  <input
                    id="currentRole"
                    className="field"
                    placeholder="e.g. Primary school teacher, warehouse supervisor, QA tester"
                    value={transitionForm.currentRole}
                    maxLength={160}
                    onChange={(event) => updateTransition({ currentRole: event.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="years">
                    Years of experience
                  </label>
                  <input
                    id="years"
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    className="field"
                    value={transitionForm.yearsExperience}
                    onChange={(event) => updateTransition({ yearsExperience: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="skills">
                  What can you already do?
                </label>
                <textarea
                  id="skills"
                  className="field min-h-[104px] resize-y"
                  placeholder="List tools, responsibilities, projects, certifications and soft skills. e.g. Excel modelling, stakeholder updates, Python basics, managing a team of 6..."
                  value={transitionForm.currentSkills}
                  maxLength={2500}
                  onChange={(event) => updateTransition({ currentSkills: event.target.value })}
                />
                <p className="mt-1.5 text-[11px] text-mist/70">
                  Be generous here — the analysis is only as good as this list. Soft skills count too.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="targetRole">
                    Where you want to go
                  </label>
                  <input
                    id="targetRole"
                    className="field"
                    placeholder="e.g. Product designer, data analyst, DevOps engineer"
                    value={transitionForm.targetRole}
                    maxLength={160}
                    onChange={(event) => updateTransition({ targetRole: event.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="targetIndustry">
                    Industry or context <span className="font-normal text-mist/70">optional</span>
                  </label>
                  <input
                    id="targetIndustry"
                    className="field"
                    placeholder="e.g. Fintech, healthcare, a startup"
                    value={transitionForm.targetIndustry}
                    maxLength={160}
                    onChange={(event) => updateTransition({ targetIndustry: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="transitionHours">
                    Hours per week you can study
                  </label>
                  <input
                    id="transitionHours"
                    type="number"
                    min={1}
                    max={60}
                    className="field"
                    value={transitionForm.hoursPerWeek}
                    onChange={(event) => updateTransition({ hoursPerWeek: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="timelineMonths">
                    Months you want this to take
                  </label>
                  <input
                    id="timelineMonths"
                    type="number"
                    min={1}
                    max={60}
                    className="field"
                    value={transitionForm.timelineMonths}
                    onChange={(event) => updateTransition({ timelineMonths: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="constraints">
                  Constraints <span className="font-normal text-mist/70">optional</span>
                </label>
                <textarea
                  id="constraints"
                  className="field min-h-[72px] resize-y"
                  placeholder="Can't quit your job, no budget for courses, need a visa-eligible role, family commitments..."
                  value={transitionForm.constraints}
                  maxLength={1200}
                  onChange={(event) => updateTransition({ constraints: event.target.value })}
                />
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-400/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-rose-100">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={loading || !isConfigured}>
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black/80" />
                  Working on your plan…
                </>
              ) : (
                <>
                  {mode === "roadmap" ? <SparkIcon className="h-4 w-4" /> : <TargetIcon className="h-4 w-4" />}
                  {mode === "roadmap" ? "Generate my roadmap" : "Analyse my transition"}
                </>
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={loadExample} disabled={loading}>
              Try an example
            </button>
            <p className="text-[11px] text-mist/70">
              {mode === "roadmap"
                ? `${roadmapForm.hoursPerWeek * roadmapForm.durationWeeks || 0}h of planned work · usually 1-2 min`
                : "Honest feasibility read · usually 1-2 min"}
            </p>
          </div>
        </div>
      </form>

      <div className="mt-8" ref={resultRef}>
        {loading ? <GeneratingState mode={mode} /> : null}
        {!loading && result ? (
          <ResultView item={result} onDeleted={() => setResult(null)} onClose={() => setResult(null)} />
        ) : null}
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
        active
          ? "border-accent/35 bg-accent/[0.07]"
          : "border-transparent bg-transparent hover:border-line hover:bg-white/[0.025]"
      }`}
    >
      <span className={`flex items-center gap-2 text-[13px] font-semibold ${active ? "text-accent" : "text-chalk/85"}`}>
        {icon}
        {title}
      </span>
      <span className="mt-0.5 block text-[11.5px] text-mist">{description}</span>
    </button>
  );
}

function GeneratingState({ mode }: { mode: Mode }) {
  const steps =
    mode === "roadmap"
      ? ["Reading your goal", "Sequencing the phases", "Picking high-signal resources", "Sizing the weekly load"]
      : ["Auditing your existing skills", "Mapping what transfers", "Finding the real gaps", "Building the plan around them"];

  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setStep((current) => Math.min(steps.length - 1, current + 1));
    }, 4500);
    const clock = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(clock);
    };
  }, [steps.length]);

  return (
    <div className="panel animate-fade-in relative overflow-hidden p-8 sm:p-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center rounded-full border border-accent/30 bg-accent/10">
            <span className="absolute inset-0 animate-ping rounded-full border border-accent/20" />
            <SparkIcon className="h-4 w-4 text-accent" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-chalk">
              {mode === "roadmap" ? "Designing your roadmap" : "Analysing your transition"}
            </p>
            <p className="text-[11px] text-mist">
              Gemini is thinking · {seconds}s{seconds > 60 ? " · complex plans can take up to two minutes" : ""}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          {steps.map((label, index) => {
            const state = index < step ? "done" : index === step ? "active" : "pending";
            return (
              <div key={label} className="flex items-center gap-3">
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] ${
                    state === "done"
                      ? "border-accent/50 bg-accent/20 text-accent"
                      : state === "active"
                        ? "border-accent/40 bg-transparent text-accent"
                        : "border-line text-mist/40"
                  }`}
                >
                  {state === "done" ? "✓" : state === "active" ? "•" : ""}
                </span>
                <span
                  className={`text-[12.5px] ${
                    state === "pending" ? "text-mist/45" : state === "active" ? "text-chalk" : "text-mist"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-accent/70 transition-[width] duration-1000 ease-out"
            style={{ width: `${Math.min(92, 12 + step * 22 + seconds * 0.6)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
