import { traceSchema } from "../trace/schema";
import { MotionRoot } from "../episode/scroll/MotionRoot";
import { MemoryReplay } from "./MemoryReplay";
import { HeroAmbient } from "../episode02/HeroAmbient";
import { WoundRecap } from "./WoundRecap";
import { CompactionSection } from "./CompactionSection";
import { NotesFigure } from "./NotesFigure";
import { SeriesIndex } from "../series/SeriesIndex";
import { SeriesNav } from "../series/SeriesNav";
import tokyoTripRaw from "../../traces/tokyo-trip.trace.json";

// Validated at load so a bad trace edit fails loudly in dev, like Episode 01.
const tokyoTrip = traceSchema.parse(tokyoTripRaw);

const HOME_URL = import.meta.env.BASE_URL;
const REPO_URL = "https://github.com/wenhaoyu-bryan/agent-anatomy";
const PORTFOLIO_URL = "https://wenhaoyu-bryan.github.io/";

/**
 * Episode 03 shell — "How agents remember" (PLAN §6 palette, no new colors).
 * The full page: hero, the S2 wound recap, the S3 compaction share-clip, the S4
 * notes-not-neurons figure, the S5 replay showpiece, and the S6 season finale.
 */
export function Episode03() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-[var(--color-panel)] focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <main id="main">
        <Hero />
        <WoundRecap />
        <CompactionSection />
        <NotesFigure />
        <MemoryReplay trace={tokyoTrip} />
        <Close />
      </main>
      <MotionRoot />
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6">
      <HeroAmbient />
      <div className="telemetry-grid pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: "radial-gradient(130% 90% at 50% 8%, transparent 42%, rgba(0,0,0,0.55) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <a href={HOME_URL} className="micro-label transition-colors hover:text-[var(--color-ink)]">
          ← Agent Anatomy
        </a>
        <p className="micro-label mt-8">Episode 03</p>
        <h1
          className="mt-4 max-w-3xl text-4xl leading-[1.03] font-medium tracking-tight text-balance md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What does an AI remember about you?
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)] md:text-xl">
          Almost nothing — unless it takes notes.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
          The context window is what an agent knows right now, and it runs out. Memory is what it
          writes down outside the window so the work survives. Watch one task cross two sessions: the
          window fills, the agent compresses what it learned and saves its notes, the session ends —
          and in a fresh, empty window the next day, it reads those notes back and finishes the job.
          Same replay engine as the first three episodes, a new trace.
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <span className="micro-label">Scroll</span>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section id="debrief" aria-labelledby="debrief-title" className="px-4 py-28 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="reveal">
          <p className="micro-label">Season finale</p>
          <h2
            id="debrief-title"
            className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four episodes, one story
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-muted)]">
            This is where the first season ends. You watched an agent run its loop and fill a context
            window; you watched that window overflow, loop, and get fooled; you watched it search the
            web and cite what it read; and just now, you watched it compress its memory, run out of
            session, and pick the work back up from a note it left itself. One loop, one window, one
            trace format — four ways of looking at the same machine.
          </p>
          <SeriesIndex currentId="ep03" />
        </div>

        <div className="reveal mt-12 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-6">
          <p className="micro-label">Open source</p>
          <p className="mt-3 leading-relaxed">
            Four very different runs — fixing a page, overflowing, reading the web, remembering across
            sessions — all played by one engine from one trace format. The{" "}
            <code className="font-mono text-sm">1.3</code> schema adds compaction, session breaks, and
            memory files, and every earlier trace still plays unchanged.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={REPO_URL}
              className="pressable rounded border border-[var(--color-hairline)] bg-[var(--color-ink)] px-4 py-2 font-mono text-sm text-[var(--color-canvas)] hover:brightness-90"
            >
              View the repo
            </a>
            <a
              href={`${REPO_URL}/blob/main/docs/trace-format.md`}
              className="pressable rounded border border-[var(--color-hairline)] px-4 py-2 font-mono text-sm hover:border-[var(--color-muted)]"
            >
              Trace format spec
            </a>
          </div>
        </div>

        <p className="reveal mt-16 text-sm text-[var(--color-muted)]">
          Made by{" "}
          <a
            href={PORTFOLIO_URL}
            className="underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
          >
            Wenhao Yu
          </a>{" "}
          · Open source · MIT ·{" "}
          <a
            href={REPO_URL}
            className="underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
          >
            ★ Star on GitHub
          </a>
        </p>

        <SeriesNav currentId="ep03" />
      </div>
    </section>
  );
}
