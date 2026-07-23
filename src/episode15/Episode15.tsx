import { traceSchema } from "../trace/schema";
import { MotionRoot } from "../episode/scroll/MotionRoot";
import { HeroAmbient } from "../episode02/HeroAmbient";
import { RecapFigure } from "./RecapFigure";
import { Vignette } from "./Vignette";
import loopTrapRaw from "../../traces/the-loop-trap.trace.json";
import overflowRaw from "../../traces/context-overflow.trace.json";
import badObsRaw from "../../traces/bad-observation-recovery.trace.json";

// Validated at load so a bad trace edit fails loudly in dev, like Episode 01.
const loopTrap = traceSchema.parse(loopTrapRaw);
const contextOverflow = traceSchema.parse(overflowRaw);
const badObservation = traceSchema.parse(badObsRaw);

const HOME_URL = import.meta.env.BASE_URL;
const EPISODE_01 = `${HOME_URL}episodes/how-an-agent-works/`;
const REPO_URL = "https://github.com/wenhaoyu-bryan/agent-anatomy";
const PORTFOLIO_URL = "https://wenhaoyu-bryan.github.io/";

/** Episode 1.5 shell — the darker companion piece (PLAN §6 palette, no new colors). */
export function Episode15() {
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
        <RecapFigure />
        <Vignette
          id="loop-trap"
          eyebrow="Failure 01 · The loop trap"
          title="It tries the same fix, harder, forever"
          lede="Asked to change a banner, the agent edits the file, re-renders, and sees no change — because the page is served from a stale build. So it edits again. And again. The transcript starts to rhyme; the context meter only climbs. Agents don't get frustrated. They get expensive."
          trace={loopTrap}
          panels={[{ type: "page", url: "shop.example.com" }, { type: "meter" }]}
        />
        <Vignette
          id="context-overflow"
          eyebrow="Failure 02 · Context overflow"
          title="It reads until it forgets why"
          lede="Investigating a slow checkout, the agent reads file after file until the window is full. To keep going, the oldest context falls out the bottom — including the original request. Watch the meter shrink at the eviction, then watch the agent confidently answer a question no one asked."
          trace={contextOverflow}
          panels={[{ type: "eviction" }]}
        />
        <Vignette
          id="bad-observation"
          eyebrow="Failure 03 · A bad observation, caught"
          title="A false signal it almost trusted"
          lede="A stale cached check reports the broken contact form works fine. The agent nearly believes it — then verifies against the real file, finds the actual bug, fixes it, and confirms with a fresh render. The only failure here with a happy ending, and it's no accident."
          trace={badObservation}
          panels={[{ type: "page", url: "example.com/contact" }]}
        />
        <Close />
      </main>
      <MotionRoot />
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6">
      {/* Same ambient drift + loop motif as the rest of the series (S1 identity);
          the vignette below keeps this episode's darker mood. */}
      <HeroAmbient />
      <div
        className="telemetry-grid pointer-events-none absolute inset-0 z-[2]"
        aria-hidden="true"
      />
      {/* Darker mood than Ep 01's hero, same identity: a downward vignette. */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(130% 90% at 50% 8%, transparent 42%, rgba(0,0,0,0.55) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <a href={HOME_URL} className="micro-label transition-colors hover:text-[var(--color-ink)]">
          ← Agent Anatomy
        </a>
        <p className="micro-label mt-8">Episode 1.5</p>
        <h1
          className="mt-4 max-w-3xl text-4xl leading-[1.03] font-medium tracking-tight text-balance md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What happens when the loop goes wrong?
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)] md:text-xl">
          Episode 01 showed the loop working. It doesn&rsquo;t always.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
          Three ways an agent fails — a loop it can&rsquo;t escape, a memory that overflows, and a
          false signal it almost trusts — plus the one habit that saves the last one. Same replay
          engine as Episode 01, three new traces.
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
          <p className="micro-label">The thesis</p>
          <h2
            id="debrief-title"
            className="mt-3 text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Good agents aren&rsquo;t the ones that never err
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed">
            Every failure here started the same way any capable teammate&rsquo;s might: a
            reasonable step on incomplete information. The loop trap kept trying because each edit
            truly reported success. The overflow answered the wrong question because the right one
            had quietly scrolled out of memory. What separated the third run wasn&rsquo;t a smarter
            agent — it was one set up to <em>check a result before trusting it</em>.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-muted)]">
            That&rsquo;s the practical takeaway if you build with these systems. The wins don&rsquo;t
            come from a model that never slips. They come from the scaffolding around it:
            verification steps, checkpoints where work is reviewed before it&rsquo;s built on, and
            limits that keep a run from wandering forever. Agents are legible — so instrument them
            to notice when they&rsquo;ve gone wrong, and most of these failures become recoverable.
          </p>
        </div>

        <div className="reveal mt-14">
          <p className="micro-label">The series</p>
          <ul className="mt-4 flex flex-col gap-3">
            <li>
              <a
                href={EPISODE_01}
                className="block rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-4 transition-colors hover:border-[var(--color-muted)]"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className="shrink-0 font-mono tabular-nums text-[var(--color-tool)]"
                  >
                    01
                  </span>
                  <div>
                    <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
                      How an AI agent works
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      The loop, the context window, and what happens when you give an AI a task.
                    </p>
                  </div>
                </div>
              </a>
            </li>
            <li className="rounded-lg border border-dashed border-[var(--color-hairline)] px-5 py-4">
              <div className="flex items-baseline gap-4">
                <span className="shrink-0 font-mono tabular-nums text-[var(--color-muted)]">02</span>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
                      To be announced
                    </p>
                    <span className="micro-label">Planned</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div className="reveal mt-12 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-6">
          <p className="micro-label">Open source</p>
          <p className="mt-3 leading-relaxed">
            These three failures are JSON trace files played by the same engine as Episode 01 —
            proof the format generalizes. The new <code className="font-mono text-sm">1.1</code>{" "}
            schema adds context eviction and authorial annotations. Write your own run and it plays.
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
      </div>
    </section>
  );
}
