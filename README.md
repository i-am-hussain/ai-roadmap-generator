# Pathforge — AI roadmap & career-transition generator

A Next.js app that turns a goal into a week-by-week learning roadmap, and tells career switchers exactly which
of their existing skills carry into a new field, which gaps block them, and how to close those gaps.

Runs on Z.ai's free GLM Flash models by default, or on Google Gemini, any OpenAI-compatible model endpoint, or a
local Ollama server — with structured JSON output validated end-to-end with Zod.

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

Then pick a provider in `.env.local`.

**Z.ai GLM Flash** (default; free, no card, no daily request cap — free key from
<https://z.ai/manage-apikey/apikey-list>):

```env
ZAI_API_KEY=your_key_here
```

The app calls `glm-4.5-flash` and falls back to `glm-4.7-flash`, both free (\$0 input and output, no card). The free
tier is throttled to roughly one request at a time rather than a daily budget, so a plan may need a retry if another
request is still running. Thinking mode is disabled on these requests — with it on, a single plan exceeded the
timeout. Expect about 1–2 minutes for a roadmap and 3–4 minutes for a career-transition analysis. Pin a different
GLM id with `AI_MODEL`.

**Gemini** (optional; free tier, key from <https://aistudio.google.com/apikey>):

```env
GEMINI_API_KEY=your_key_here
```

Optionally pin a model with `GEMINI_MODEL`. If unset, the app tries `gemini-3.8-flash`, `gemini-3.7-flash`,
`gemini-3.6-flash` and `gemini-3.5-flash` in order, so the app keeps working if a model is unavailable.
`GEMINI_BASE_URL` can point the SDK at a proxy or gateway.

**A local model** (free, no request quota — needs [Ollama](https://ollama.com) and enough RAM/VRAM):

```bash
ollama pull qwen2.5:7b
```

```env
AI_PROVIDER=ollama
AI_MODEL=qwen2.5:7b
```

**Any other OpenAI-compatible endpoint** (Groq, OpenRouter free models, Cerebras, LM Studio, vLLM):

```env
AI_PROVIDER=openai
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=your_key_here
AI_MODEL=llama-3.3-70b-versatile
```

With `AI_PROVIDER` unset the app uses Z.ai when `ZAI_API_KEY` exists, then Gemini when a Google key exists, then an
OpenAI-compatible endpoint when `AI_BASE_URL` is set. Set `AI_PROVIDER` explicitly to override that order.
`AI_JSON_MODE=false` disables `response_format: json_object` for endpoints that reject it.

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
  llm.ts                   provider transport (Z.ai / OpenAI-compatible / Gemini), retries, JSON repair, validation
  types.ts                 form types + server-side request validation
  storage.ts               localStorage persistence
  markdown.ts              export
```

**Structured output, not parsing.** The Zod schema is converted with `z.toJSONSchema()` and passed to Gemini as
`responseJsonSchema` (for OpenAI-compatible endpoints it is embedded in the prompt, since JSON mode there is
schema-less). The response is parsed and validated against the same schema; if validation fails, one self-repair
pass is attempted with the validation errors fed back. Arrays that merely overshoot their maximum length are
trimmed rather than rejected. If the model returns an unparseable response, the request fails loudly instead of
rendering broken UI.

**Budget integrity.** The learner's real weekly hours and total weeks are written back over the model's output on
the server, so a plan can't quietly promise more time than the person has.

**Data.** Plans live in `localStorage` (`pathforge.v1.items`) — no accounts, no database, nothing leaves the browser
except the prompt sent to your configured provider. API routes are rate-limited per IP in memory.

## Deploying

Set the provider variables from `.env.example` in your hosting provider's environment and build normally
(`npm run build`). Route handlers run on the Node.js runtime. On serverless, the in-memory rate limiter is
per-instance, and a local Ollama endpoint is not reachable — use a hosted provider there.

## Notes & limitations

- Resources can be hallucinated. URLs are only rendered when the model returns one, and the prompt asks for an empty
  string when unsure — verify before paying for anything.
- Feasibility scores are a model judgement, not a hiring forecast.
- Plans are only as good as the input: the skills list drives the entire transfer audit.
- Model output is capped at 6 phases to keep latency and cost reasonable (roughly 1–4 minutes per plan on the free
  tier). A single generation is capped at a 280s budget across model retries, so a request cannot hang indefinitely.
- The Gemini API rejects `minItems`/`maxItems` in a response JSON Schema, so array-length limits are carried in each
  field's description and enforced by zod afterwards: over-long arrays are trimmed, short ones trigger the
  self-repair pass. OpenAI-compatible endpoints embed the schema in the prompt instead.
- Z.ai publishes no numeric free quota for the GLM Flash models, but the free tier is throttle-limited (about one
  concurrent request), so bursts of generations can return a 429. Other free tiers (Google AI Studio, Groq,
  OpenRouter `:free`, Cerebras) have daily caps. A local model via Ollama is the only option with no external quota
  at all, at the cost of quality and speed.
