import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pathforge — AI roadmaps & career transitions",
  description:
    "Turn any goal into a week-by-week roadmap, or find out exactly how your existing skills transfer into a new field. Powered by Gemini.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(201,247,95,0.10),transparent_65%)] blur-2xl" />
          <div className="absolute -bottom-52 right-0 h-[460px] w-[620px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(125,211,252,0.07),transparent_65%)] blur-2xl" />
        </div>

        <header className="sticky top-0 z-50 border-b border-line/80 bg-ink/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-accent/30 bg-accent/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 19V7.5L12 4l7 3.5V19"
                    stroke="var(--color-accent)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M9 19v-5h6v5" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[15px] font-semibold tracking-tight">Pathforge</span>
            </Link>

            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-mist transition-colors hover:bg-white/5 hover:text-chalk"
              >
                Generate
              </Link>
              <Link
                href="/library"
                className="rounded-lg px-3 py-1.5 text-mist transition-colors hover:bg-white/5 hover:text-chalk"
              >
                Library
              </Link>
              <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-mist sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(201,247,95,0.45)]" />
                Gemini
              </span>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-line/70 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-mist sm:flex-row">
            <p>Pathforge — structured plans, honest transitions.</p>
            <p>Plans are AI-generated. Verify resources before you rely on them.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
