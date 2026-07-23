import { traceSchema } from "../trace/schema";
import { MotionRoot } from "../episode/scroll/MotionRoot";
import { HeroAmbient } from "../episode02/HeroAmbient";
import { FanOutSection } from "./FanOutSection";
import { HandoffFigure } from "./HandoffFigure";
import { LaneReplay } from "./LaneReplay";
import { SeriesIndex } from "../series/SeriesIndex";
import { SeriesNav } from "../series/SeriesNav";
import partyRaw from "../../traces/plan-birthday-party.trace.json";

// Validated at load so a bad trace edit fails loudly in dev, like every episode.
const partyTrace = traceSchema.parse(partyRaw);

const HOME_URL = import.meta.env.BASE_URL;
const REPO_URL = "https://github.com/wenhaoyu-bryan/agent-anatomy";
const PORTFOLIO_URL = "https://wenhaoyu-bryan.github.io/";

/**
 * Episode 04 shell — "How agents work together" (PLAN §6 palette, no new
 * colors). Hero, the S3 fan-out share-clip scene, the S4 handoffs figure, and
 * the S5 lane replay; the S2 recap and full S6 close land in W4.
 */
export function Episode04() {
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
        <Recap />
        <FanOutSection />
        <HandoffFigure />
        <LaneReplay trace={partyTrace} />
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
        <p className="micro-label mt-8">Episode 04</p>
        <h1
          className="mt-4 max-w-3xl text-4xl leading-[1.03] font-medium tracking-tight text-balance md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Why would an AI need a team?
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)] md:text-xl">
          Because one window can only hold so much.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
          You&rsquo;ve watched a context window fill up, overflow, and get compressed. Here&rsquo;s the
          other way out: split the job. A lead agent breaks a task too big for one window into pieces
          and hands each to a helper with its own small, fresh window. The helpers work in parallel;
          the lead never sees their work — only the short summary each hands back. Watch one task fan
          out into three windows filling at once, hit a snag, adapt, and converge into one plan. Same
          replay engine as the first four episodes, a new trace.
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <span className="micro-label">Scroll</span>
      </div>
    </section>
  );
}

function Recap() {
  return (
    <section id="recap" aria-labelledby="recap-title" className="px-4 py-24 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="reveal">
          <p className="micro-label">The problem so far</p>
          <h2
            id="recap-title"
            className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            One window, and it keeps filling up
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-muted)]">
            Every episode so far has fought the same limit: an agent thinks inside one context
            window, and that window only holds so much. Fill it and the oldest things — sometimes
            the original request — fall out the bottom. You&rsquo;ve already seen two ways to live
            with that limit. This is the third.
          </p>
        </div>

        <ul className="reveal mt-10 grid gap-3 md:grid-cols-3">
          <WayOut
            n="Retrieval"
            ep="Episode 02"
            body="Don’t hold the whole web — search for the one page you need, read it, and let the rest go."
          />
          <WayOut
            n="Memory"
            ep="Episode 03"
            body="Don’t keep everything in the window — write notes to a file outside it, and read them back later."
          />
          <WayOut
            n="Delegation"
            ep="This episode"
            body="Don’t do it all in one window — split the job and hand each piece to a helper with a window of its own."
            active
          />
        </ul>
      </div>
    </section>
  );
}

function WayOut({ n, ep, body, active }: { n: string; ep: string; body: string; active?: boolean }) {
  return (
    <li
      className={`rounded-lg border px-5 py-4 ${
        active
          ? "border-[var(--color-tool)]/40 bg-[var(--color-panel)]/60"
          : "border-[var(--color-hairline)] bg-[var(--color-panel)]/40"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="font-medium"
          style={{
            fontFamily: "var(--font-display)",
            color: active ? "var(--color-tool)" : undefined,
          }}
        >
          {n}
        </p>
        <span className="micro-label shrink-0" style={active ? { color: "var(--color-tool)" } : undefined}>
          {ep}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
    </li>
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
            className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Five episodes, one engine
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-muted)]">
            Every episode fights the same enemy — the finite context window. You watched an agent run
            its loop and fill that window; watched it overflow, loop, and get fooled; watched it read
            the web and cite its sources; watched it compress its memory and read its notes back the
            next day; and now, watched it split a job across a team so no single window has to hold the
            whole thing. Retrieval, memory, delegation — three ways out of one small room.
          </p>
          <SeriesIndex currentId="ep04" />
        </div>

        <div className="reveal mt-12 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-6">
          <p className="micro-label">Open source</p>
          <p className="mt-3 leading-relaxed">
            Five different runs — fixing a page, overflowing, reading the web, remembering across
            sessions, and now delegating to a team — all played by one engine from one trace format.
            The <code className="font-mono text-sm">1.4</code> schema adds parallel agent lanes, and
            every earlier trace still plays unchanged.
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

        <SeriesNav currentId="ep04" />
      </div>
    </section>
  );
}
