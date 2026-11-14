import Generator from "@/components/Generator";

const CAPABILITIES = [
  {
    title: "Week-by-week planning",
    body: "Every phase has objectives, sized tasks, resources, a build and an objective checkpoint — not just a list of courses.",
  },
  {
    title: "Honest skill transfer",
    body: "Your existing skills are classified as direct, strong or partial transfers, with exactly where each one helps in the new field.",
  },
  {
    title: "Gap-first roadmaps",
    body: "Transition plans spend your hours closing the gaps that actually block hiring, instead of re-teaching what you already know.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line/60">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-mist">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(201,247,95,0.45)]" />
              Two modes · powered by Gemini
            </div>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Your next move,
              <span className="heading-serif text-accent"> mapped to the week.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-mist sm:text-base">
              Turn any goal into a sequenced roadmap you can follow tonight. Or tell Pathforge what you already know and
              where you want to be — it will show you exactly which skills carry over, which gaps stand in the way, and
              how to close them.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-mist/80">
              <span>Structured, week-by-week plans</span>
              <span className="hidden h-1 w-1 rounded-full bg-line-strong sm:block" />
              <span>Transferable-skill audit</span>
              <span className="hidden h-1 w-1 rounded-full bg-line-strong sm:block" />
              <span>Progress saved on your device</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
        <Generator />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {CAPABILITIES.map((capability, index) => (
            <div key={capability.title} className="panel p-5">
              <span className="text-[11px] font-semibold tabular-nums text-accent/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[14px] font-semibold tracking-tight text-chalk">{capability.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist">{capability.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
