import { traceSchema } from "../trace/schema";
import { MotionRoot } from "../episode/scroll/MotionRoot";
import { HeroAmbient } from "../episode02/HeroAmbient";
import { FanOutSection } from "./FanOutSection";
import { HandoffFigure } from "./HandoffFigure";
import { LaneReplay } from "./LaneReplay";
import partyRaw from "../../traces/plan-birthday-party.trace.json";

// Validated at load so a bad trace edit fails loudly in dev, like every episode.
const partyTrace = traceSchema.parse(partyRaw);

const HOME_URL = import.meta.env.BASE_URL;
const EPISODE_01 = `${HOME_URL}episodes/how-an-agent-works/`;
const EPISODE_15 = `${HOME_URL}episodes/where-agents-go-wrong/`;
const EPISODE_02 = `${HOME_URL}episodes/how-ai-reads-the-web/`;
const EPISODE_03 = `${HOME_URL}episodes/how-agents-remember/`;
const REPO_URL = "https://github.com/wenhaoyu-bryan/agent-anatomy";
const PORTFOLIO_URL = "https://wenhaoyu-bryan.github.io/";
const SUGGEST_URL = `${REPO_URL}/issues/new?template=episode-suggestion.md`;

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
          <ul className="mt-8 flex flex-col gap-3">
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
              blurb="Three failure modes — a loop it can’t escape, a memory that overflows, a false signal it almost trusts."
            />
            <SeriesLink
              href={EPISODE_02}
              n="02"
              title="How AI reads the web"
              blurb="Search, selection, reading a page, and citations."
            />
            <SeriesLink
              href={EPISODE_03}
              n="03"
              title="How agents remember"
              blurb="Compaction, session breaks, and notes an agent writes to itself."
            />
            <li className="rounded-lg border border-[var(--color-tool)]/40 bg-[var(--color-panel)]/40 px-5 py-4">
              <div className="flex items-baseline gap-4">
                <span className="shrink-0 font-mono tabular-nums text-[var(--color-tool)]">04</span>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
                      How agents work together
                    </p>
                    <span className="micro-label text-[var(--color-tool)]">You are here</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Delegation: one lead splitting a job across helpers, each with its own window.
                  </p>
                </div>
              </div>
            </li>
            <li>
              <a
                href={SUGGEST_URL}
                className="group block rounded-lg border border-dashed border-[var(--color-hairline)] px-5 py-4 transition-colors hover:border-[var(--color-tool)]"
              >
                <div className="flex items-baseline gap-4">
                  <span className="shrink-0 font-mono tabular-nums text-[var(--color-muted)]">05</span>
                  <div>
                    <p
                      className="font-medium text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      What should we open up next? →
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      No fixed episode 05 — the series stays open. Tell us what confuses people about
                      agents and what you’d want to see.
                    </p>
                  </div>
                </div>
              </a>
            </li>
          </ul>
        </div>

        <div className="reveal mt-12 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-6">
          <p className="micro-label">Open source</p>
          <p className="mt-3 leading-relaxed">
            Five very different runs — fixing a page, overflowing, reading the web, remembering across
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
