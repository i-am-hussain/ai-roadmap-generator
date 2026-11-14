import type { RoadmapInput, TransitionInput } from "./types";

const DURABLE_RULES = `
NON-NEGOTIABLE RULES
- Be concrete. Name the exact tools, concepts, exercises and artifacts instead of vague advice like "learn the basics" or "practice regularly".
- Be honest. Never promise a job, salary or timeline you cannot support. Describe evidence of readiness instead.
- No filler. No motivational padding, no "in today's fast-paced world". Every sentence must carry information.
- Prefer durable fundamentals and one or two high-signal resources over long link dumps.
- Only include a URL when you are confident it is a real, official page. Otherwise set url to "".
- Use plain, direct language, like a senior mentor who respects the learner's time.
- Assume the current year is 2026 and that AI assistants are part of the learner's workflow; teach them to build with those tools, not to fear them.
`.trim();

export const ROADMAP_SYSTEM = `You are the lead curriculum architect at an elite career accelerator. You turn a specific goal into a sequenced, build-first learning plan that a motivated person can actually follow.

${DURABLE_RULES}

PLAN QUALITY BAR
- Every phase must end with a shipped artifact, not "understanding".
- Order work so each phase unlocks the next: no tool appears before its prerequisite concept.
- Tasks must be sized for the learner's real weekly hours and should mix study, deliberate practice and building.
- Checkpoints are objective: "you can do X without looking it up", not "you feel confident".
- Pitfalls must be the mistakes this specific learner is most likely to make, each with a concrete fix.
`.trim();

export const TRANSITION_SYSTEM = `You are a career-transition strategist who has helped thousands of people switch fields. You are rigorous, encouraging but never flattering, and you always connect the person's real background to real openings in the target field.

${DURABLE_RULES}

ANALYSIS QUALITY BAR
- Audit only the skills the person actually listed. Never invent experience or credentials.
- Classify honestly: "direct" (used the same way in the new field), "strong" (same underlying ability, new context), "partial" (related but needs upgrading).
- The feasibility score is a judgment, not encouragement. 80+ requires substantial overlap and a clear hiring path; below 40 means a multi-year or staged move and you must say so.
- Gaps must be the true blockers a hiring manager would test for, ranked by priority. Say which gap, if unfilled, sinks the candidacy.
- The roadmap must spend its time closing gaps and producing proof, not re-teaching what the person already knows. Use existing strengths as accelerants.
- Bridge roles must be real job titles that pay now and move the person toward the target.
- Positioning must reuse their actual achievements. Resume bullets must start with an outcome, quantified where possible.
- Quick wins must be finishable fast and visible to someone who could hire them.
`.trim();

function line(label: string, value: string | number) {
  return `- ${label}: ${value}`;
}

export function buildRoadmapPrompt(input: RoadmapInput) {
  const totalHours = input.hoursPerWeek * input.durationWeeks;
  const phaseCount =
    input.durationWeeks <= 6 ? 3 : input.durationWeeks <= 10 ? 4 : input.durationWeeks <= 18 ? 4 : 5;

  const prompt = `Design a personalised learning roadmap.

LEARNER BRIEF
${line("Goal", input.goal)}
${line("Starting level", input.level)}
${line("Time budget", `${input.hoursPerWeek} hours per week for ${input.durationWeeks} weeks (~${totalHours} focus hours total)`)}
${line("Preferred ways to learn", input.preferences.length ? input.preferences.join(", ") : "no stated preference")}
${line("Background and context", input.background || "not provided")}

DELIVERY REQUIREMENTS
- Produce exactly ${phaseCount} phases, spread across ${input.durationWeeks} weeks. Phase "duration" fields must cover the whole span with no gaps or overlaps.
- The sum of all task hours across phases must stay within ~${totalHours} hours. Never exceed the budget; under-filling is better than fantasy planning.
- Set weeklyHours to ${input.hoursPerWeek} and totalWeeks to ${input.durationWeeks}.
- The target role is assessed at "${input.level}" starting level, so skip what they already know and say so in the focus.
- If the background mentions existing skills, build on them instead of restarting from zero.
- Include 3-6 milestones tied to real week numbers, each with observable proof.
- One final portfolio project that a hiring manager in this field would actually care about.
- Resources: at most one primary course per phase, official docs when they exist, and at most one community.`;

  return { system: ROADMAP_SYSTEM, prompt };
}

export function buildTransitionPrompt(input: TransitionInput) {
  const totalHours = Math.round(input.hoursPerWeek * input.timelineMonths * 4.33);
  const weeks = Math.max(8, Math.round(input.timelineMonths * 4.33));

  const prompt = `Assess and plan a career transition.

CANDIDATE
${line("Current role / field", input.currentRole)}
${line("Years of experience", input.yearsExperience)}
${line("Skills, tools and experience they already have", input.currentSkills)}
${line("Target role", input.targetRole)}
${line("Target industry / context", input.targetIndustry || "not specified")}
${line("Time available to retrain", `${input.hoursPerWeek} hours per week for about ${input.timelineMonths} months (~${totalHours} focus hours)`)}
${line("Constraints and obligations", input.constraints || "none stated")}

WHAT THE ANSWER MUST DO
1. State the single most important truth about this switch in "headline" and explain it in "summary": what carries over, what the real barrier is, and what decides success.
2. Score feasibility 0-100 for this specific person and target, with the reasoning grounded in their listed skills. Set estimatedMonths to the honest time to become hireable at ${input.hoursPerWeek} h/week.
3. List every meaningful transferable skill they actually have, classified direct/strong/partial, and say exactly where it helps in the target field and how to evidence it.
4. List the real gaps, ranked. For each, say why it matters and how to close it. Do not pad the list with things they already know.
5. Name 1-4 bridge roles that are realistic now and shorten the path.
6. Give the risks that most often derail this particular transition, each with a mitigation.
7. Write positioning material they can copy: a narrative, a headline, resume bullets and ATS keywords.
8. Give quick wins they can act on this week.
9. Build the roadmap: exactly ${weeks >= 24 ? 5 : 4} phases spanning ${weeks} weeks, weeklyHours ${input.hoursPerWeek}, totalWeeks ${weeks}. Spend most of the hours closing the critical gaps and producing portfolio proof. Set roadmap.targetRole to the target role and roadmap.difficulty to "intermediate" unless the target is clearly harder.
- Be specific to this person. A generic answer that would fit any switcher is a failure.`;

  return { system: TRANSITION_SYSTEM, prompt };
}
