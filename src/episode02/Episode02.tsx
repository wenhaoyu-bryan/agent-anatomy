import { traceSchema } from "../trace/schema";
import { MotionRoot } from "../episode/scroll/MotionRoot";
import { ReadingReplay } from "./ReadingReplay";
import reheatRiceRaw from "../../traces/reheat-rice.trace.json";

// Validated at load so a bad trace edit fails loudly in dev, like Episode 01.
const reheatRice = traceSchema.parse(reheatRiceRaw);

const HOME_URL = import.meta.env.BASE_URL;
const EPISODE_01 = `${HOME_URL}episodes/how-an-agent-works/`;
const EPISODE_15 = `${HOME_URL}episodes/where-agents-go-wrong/`;
const REPO_URL = "https://github.com/wenhaoyu-bryan/agent-anatomy";
const PORTFOLIO_URL = "https://wenhaoyu-bryan.github.io/";

/**
 * Episode 02 shell — "How AI reads the web" (PLAN §6 palette, no new colors).
 * U2 builds the hero and the S5 replay showpiece; S2/S3/S4 scenes and the S6
 * close arrive in U3/U4.
 */
export function Episode02() {
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
        <ReadingReplay trace={reheatRice} />
        <Close />
      </main>
      <MotionRoot />
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6">
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
        <p className="micro-label mt-8">Episode 02</p>
        <h1
          className="mt-4 max-w-3xl text-4xl leading-[1.03] font-medium tracking-tight text-balance md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          When AI doesn&rsquo;t know, what happens next?
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)] md:text-xl">
          Ask a model something outside what it learned, and it doesn&rsquo;t guess — it goes looking.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
          Watch a real search-and-answer run: the query forms, the web narrows to a handful of pages,
          they get read — one of them fails to be read at all — and an answer assembles with visible
          threads back to its sources. Same replay engine as Episodes 01 and 1.5, a new trace.
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
          <p className="micro-label">The series</p>
          <h2
            id="debrief-title"
            className="mt-3 text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three episodes, one engine
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-[var(--color-muted)]">
            Fixing a page, running out of memory, reading the web — three very different runs, all
            played by the same replay engine from the same trace format. That&rsquo;s the point of the
            format: write a run that fits the schema, and it plays.
          </p>
        </div>

        <div className="reveal mt-12">
          <ul className="flex flex-col gap-3">
            <SeriesLink
              href={EPISODE_01}
              n="01"
              title="How an AI agent works"
              blurb="The loop, the context window, and what happens when you give an AI a task."
            />
            <SeriesLink
              href={EPISODE_15}
              n="1.5"
              title="Where agents go wrong"
              blurb="Three failure modes — a loop it can't escape, a memory that overflows, a false signal it almost trusts."
            />
            <li className="rounded-lg border border-[var(--color-tool)]/40 bg-[var(--color-panel)]/40 px-5 py-4">
              <div className="flex items-baseline gap-4">
                <span className="shrink-0 font-mono tabular-nums text-[var(--color-tool)]">02</span>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
                      How AI reads the web
                    </p>
                    <span className="micro-label text-[var(--color-tool)]">You are here</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Search, selection, reading a page, and citations.
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div className="reveal mt-12 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-6">
          <p className="micro-label">Open source</p>
          <p className="mt-3 leading-relaxed">
            The <code className="font-mono text-sm">1.2</code> schema adds web search, page fetches,
            and citations — and every earlier trace still plays unchanged. Write your own run and it
            plays too.
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
          · Open source · MIT
        </p>
      </div>
    </section>
  );
}

function SeriesLink({ href, n, title, blurb }: { href: string; n: string; title: string; blurb: string }) {
  return (
    <li>
      <a
        href={href}
        className="block rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-4 transition-colors hover:border-[var(--color-muted)]"
      >
        <div className="flex items-baseline gap-4">
          <span className="shrink-0 font-mono tabular-nums text-[var(--color-tool)]">{n}</span>
          <div>
            <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{blurb}</p>
          </div>
        </div>
      </a>
    </li>
  );
}
