# Pathforge — AI roadmap & career-transition generator

A Next.js app that turns a goal into a week-by-week learning roadmap, and tells career switchers exactly which
of their existing skills carry into a new field, which gaps block them, and how to close those gaps.

Powered by Google Gemini with structured JSON output, validated end-to-end with Zod.

## What it does

**1. Roadmap mode** — describe the skill or role you want, your starting level, weekly hours and total weeks.
You get:

- 3–6 phases with durations, objectives and the specific skills each phase covers
- Concrete, hour-sized tasks (with a checkbox each, progress saved in your browser)
- One primary course/docs set and a community per phase, with a reason for each
- A build per phase and an objective checkpoint before moving on
- Milestones with observable proof, a portfolio-grade final project
- Success metrics, the pitfalls most likely to derail _you_, and what to do when the plan ends

**2. Career-transition mode** — give your current role, years of experience, the skills you actually have, the role
you want and your real constraints. You get:

- A **feasibility verdict** (0–100), honest timeline to hireable, and the reasoning behind it
- A **transfer audit**: each existing skill classified as _direct_, _strong adjacency_ or _partial_, with where it
  helps in the target field and how to evidence it on a CV or in an interview
- A **gap analysis** ranked critical / important / nice-to-have, with weeks-to-close and a concrete way to close each
- **Bridge roles** that are realistic now and shorten the path
- Risks with mitigations, quick wins for this week
- Copy-ready **positioning**: narrative, headline, resume bullets and ATS keywords
- A roadmap built around the gaps, not a generic curriculum

Both modes: markdown export, copy-to-clipboard, saved-plan library, and per-task progress tracking.

## Quickstart

```bash
npm install
cp .env.example .env.local   # then paste your key
npm run dev
```

Add a Gemini API key to `.env.local` (free key: <https://aistudio.google.com/apikey>):

```env
GEMINI_API_KEY=your_key_here
```

Optionally pin a model with `GEMINI_MODEL`. If unset, the app tries `gemini-3.8-flash`, `gemini-3-flash`,
`gemini-2.5-flash` and `gemini-2.0-flash` in order, so the app keeps working if a model name changes.
`GEMINI_BASE_URL` can point the SDK at a proxy or gateway.

Open <http://localhost:3000>.

## How it works

```
app/
  page.tsx                 landing + generator
  library/                 saved plans (list + detail)
  api/roadmap/route.ts     POST → roadmap JSON
  api/transition/route.ts  POST → transfer analysis + roadmap JSON
  api/status/route.ts      whether a key is configured
components/
  Generator.tsx            both forms, validation, loading state
  RoadmapView.tsx          phases, tasks, resources, milestones
  TransitionView.tsx       verdict, transfer audit, gaps, positioning
  ResultView.tsx           header, progress, export
  Library.tsx / SavedPlan.tsx
lib/
  schemas.ts               Zod schemas = source of truth, converted to JSON Schema for Gemini
  prompts.ts               system + user prompts
  gemini.ts                client, model fallback, JSON repair, validation
  types.ts                 form types + server-side request validation
  storage.ts               localStorage persistence
  markdown.ts              export
```

**Structured output, not parsing.** The Zod schema is converted with `z.toJSONSchema()` and passed to Gemini as
`responseJsonSchema`. The response is parsed and validated against the same schema; if validation fails, one
self-repair pass is attempted with the validation errors fed back. If Gemini returns an unparseable response, the
request fails loudly instead of rendering broken UI.

**Budget integrity.** The learner's real weekly hours and total weeks are written back over the model's output on
the server, so a plan can't quietly promise more time than the person has.

**Data.** Plans live in `localStorage` (`pathforge.v1.items`) — no accounts, no database, nothing leaves the browser
except the prompt sent to Gemini. API routes are rate-limited per IP in memory.

## Deploying

Set `GEMINI_API_KEY` in your hosting provider's environment and build normally (`npm run build`). Route handlers run on
the Node.js runtime. On serverless, the in-memory rate limiter is per-instance.

## Notes & limitations

- Resources can be hallucinated. URLs are only rendered when the model returns one, and the prompt asks for an empty
  string when unsure — verify before paying for anything.
- Feasibility scores are a model judgement, not a hiring forecast.
- Plans are only as good as the input: the skills list drives the entire transfer audit.
- Model output is capped at 6 phases to keep latency and cost reasonable (usually 20–45s per plan).
