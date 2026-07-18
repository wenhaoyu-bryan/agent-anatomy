import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useGlReady } from "../episode02/useGlReady";

const CompactionCanvas = lazy(() => import("./CompactionCanvas"));

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

// Mirrors the trace: the window nearly fills, then the six research reads
// compress ~4× into one summary.
const WINDOW = 2400;
const PEAK = 2225;
const AFTER = 925;
const CONDENSE_START = 0.5;

const STAGES = [
  {
    label: "Filling",
    caption: "The research piles up. Every page the agent reads spends window — and it is running out of room.",
  },
  {
    label: "Full",
    caption: "The window is nearly full. Keep reading and the earliest context starts to fall out the bottom.",
  },
  {
    label: "Compacting",
    caption: "Six reads collapse into one summary — smaller, and rendered dim and blurry. A summary is a trade: you keep the gist and lose the detail.",
  },
] as const;

function stageOf(p: number): number {
  if (p < 0.42) return 0;
  if (p < CONDENSE_START) return 1;
  return 2;
}

function tokensOf(p: number): number {
  const raw =
    p <= CONDENSE_START
      ? clamp01(p / CONDENSE_START) * PEAK
      : PEAK + (AFTER - PEAK) * easeInOut(clamp01((p - CONDENSE_START) / (1 - CONDENSE_START)));
  return Math.round(raw / 25) * 25;
}

/**
 * S3 — the compaction section. A tall section with a sticky viewport; scrolling
 * scrubs the WebGL condensation (CSS-sticky "pin", no scroll-jacking). The DOM
 * keeps the token readout dropping in sync. Reduced motion / no WebGL / SSR get
 * a compact static diagram instead — the lesson survives with no canvas.
 */
export function CompactionSection() {
  const ready = useGlReady();
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const stageRef = useRef(0);
  const tokensRef = useRef(0);
  const [stage, setStage] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const el = stickyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = clamp01(total > 0 ? -rect.top / total : 0);
      progressRef.current = progress;
      const idx = stageOf(progress);
      if (idx !== stageRef.current) {
        stageRef.current = idx;
        setStage(idx);
      }
      const tk = tokensOf(progress);
      if (tk !== tokensRef.current) {
        tokensRef.current = tk;
        setTokens(tk);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ready]);

  // Fallback: a compact, static, server-rendered diagram — no tall scroll area.
  if (!ready) {
    return (
      <section id="compaction" aria-labelledby="compaction-title" className="reveal px-4 py-24 md:px-6">
        <div className="mx-auto w-full max-w-4xl">
          <CompactionHeading />
          <CompactionStaticFigure />
          <p className="mx-auto mt-8 max-w-md text-center text-sm leading-relaxed text-[var(--color-muted)]">
            {STAGES[2].caption}
          </p>
        </div>
      </section>
    );
  }

  const pct = Math.round((tokens / WINDOW) * 100);

  return (
    <section
      ref={sectionRef}
      id="compaction"
      aria-labelledby="compaction-title"
      className="relative"
      style={{ height: "320vh" }}
    >
      <div ref={stickyRef} className="sticky top-0 flex h-dvh flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Suspense fallback={null}>
            <CompactionCanvas progressRef={progressRef} frameloop={inView ? "always" : "never"} />
          </Suspense>
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col justify-between px-4 py-16 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <CompactionHeading />
            <div className="shrink-0 text-right">
              <p className="micro-label">
                CTX {tokens.toLocaleString("en-US")} / {WINDOW.toLocaleString("en-US")}
              </p>
              <p className="micro-label mt-1" style={{ color: stage === 2 ? "var(--color-muted)" : "var(--color-tool)" }}>
                {pct}%
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="micro-label" style={{ color: stage === 2 ? "var(--color-muted)" : "var(--color-tool)" }}>
              {String(stage + 1).padStart(2, "0")} · {STAGES[stage]!.label}
            </p>
            <p
              key={stage}
              className="mt-2 text-lg leading-relaxed text-[var(--color-ink)]"
              style={{ animation: "cite-answer-in 360ms var(--ease-mechanical)" }}
            >
              {STAGES[stage]!.caption}
            </p>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status">
        Context window {pct} percent full: {tokens} of {WINDOW} tokens.
      </p>
    </section>
  );
}

function CompactionHeading() {
  return (
    <div>
      <p className="micro-label">Compaction</p>
      <h2
        id="compaction-title"
        className="mt-3 max-w-xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Watch an AI compress its own memory
      </h2>
    </div>
  );
}

/** Static fallback — crowded window collapsing to a small grey block (SSR / reduced motion). */
function CompactionStaticFigure() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-6" aria-hidden="true">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-40 w-52 flex-wrap content-end gap-1 rounded-md border border-[var(--color-hairline)] bg-[var(--color-tool)]/[0.03] p-2">
          {Array.from({ length: 72 }).map((_, i) => (
            <span
              key={i}
              className="size-2 rounded-full"
              style={{
                backgroundColor:
                  i % 7 === 0
                    ? "var(--color-thinking)"
                    : i % 11 === 0
                      ? "var(--color-user)"
                      : "var(--color-tool)",
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        <span className="micro-label">2,225 / 2,400 — full</span>
      </div>

      <span className="font-mono text-2xl text-[var(--color-muted)]">→</span>

      <div className="flex flex-col items-center gap-2">
        <div className="flex h-40 w-52 items-end justify-center rounded-md border border-[var(--color-hairline)] bg-[var(--color-tool)]/[0.03] p-2">
          <div className="mb-1 flex h-10 w-14 flex-wrap content-end justify-center gap-0.5 rounded-sm">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className="size-1.5 rounded-full"
                style={{ backgroundColor: "var(--color-muted)", opacity: 0.6 }}
              />
            ))}
          </div>
        </div>
        <span className="micro-label">925 — one summary</span>
      </div>
    </div>
  );
}
