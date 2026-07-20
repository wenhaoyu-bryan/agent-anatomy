import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useGlReady } from "../episode02/useGlReady";

const FanOutCanvas = lazy(() => import("./FanOutCanvas"));

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

const SPLIT_START = 0.18;
const SPLIT_END = 0.4;

const STAGES = [
  {
    label: "One job",
    caption:
      "That one job is three — a venue, the food, the invitations. Held in a single window, they pile up fast, and the earliest details start to fall out the bottom.",
  },
  {
    label: "Splitting",
    caption:
      "So the agent splits it. Each piece becomes a short brief, handed to a helper — a fresh, empty window that knows only its one task.",
  },
  {
    label: "In parallel",
    caption:
      "Three windows fill at once, each carrying only its own piece. Where one window would have drowned, three stay light — and the work happens side by side.",
  },
] as const;

function stageOf(p: number): number {
  if (p < SPLIT_START) return 0;
  if (p < SPLIT_END) return 1;
  return 2;
}

/**
 * S3 — the fan-out section (Episode 04's share clip). A tall section with a
 * sticky viewport; scrolling scrubs the WebGL fan-out (CSS-sticky "pin", no
 * scroll-jacking) — a concept scene, so it's scroll-driven, unlike the
 * player-driven replay. Reduced motion / no WebGL / SSR get a compact static
 * before/after diagram, so the lesson survives with no canvas.
 */
export function FanOutSection() {
  const ready = useGlReady();
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const stageRef = useRef(0);
  const [stage, setStage] = useState(0);
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
      <section id="fan-out" aria-labelledby="fan-out-title" className="reveal px-4 py-24 md:px-6">
        <div className="mx-auto w-full max-w-4xl">
          <FanOutHeading />
          <FanOutStaticFigure />
          <p className="mx-auto mt-8 max-w-md text-center text-sm leading-relaxed text-[var(--color-muted)]">
            {STAGES[2].caption}
          </p>
        </div>
      </section>
    );
  }

  const windows = stage === 0 ? "1 window" : stage === 1 ? "1 → 3 windows" : "3 windows";

  return (
    <section
      ref={sectionRef}
      id="fan-out"
      aria-labelledby="fan-out-title"
      className="relative"
      style={{ height: "320vh" }}
    >
      <div ref={stickyRef} className="sticky top-0 flex h-dvh flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Suspense fallback={null}>
            <FanOutCanvas progressRef={progressRef} frameloop={inView ? "always" : "never"} />
          </Suspense>
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col justify-between px-4 py-16 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <FanOutHeading />
            <div className="shrink-0 text-right">
              <p className="micro-label" style={{ color: "var(--color-tool)" }}>
                {windows}
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="micro-label" style={{ color: "var(--color-tool)" }}>
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
        {STAGES[stage]!.label}: {STAGES[stage]!.caption}
      </p>
    </section>
  );
}

function FanOutHeading() {
  return (
    <div>
      <p className="micro-label">The fan-out</p>
      <h2
        id="fan-out-title"
        className="mt-3 max-w-xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Watch one task fan out into three
      </h2>
    </div>
  );
}

/** Static fallback — one window's task splitting into three part-full windows. */
function FanOutStaticFigure() {
  const lanes = [
    { name: "VENUE", dots: 22 },
    { name: "FOOD", dots: 18 },
    { name: "INVITES", dots: 11 },
  ];
  const dotColor = (i: number) =>
    i % 5 === 0 ? "var(--color-thinking)" : "var(--color-tool)";
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-6" aria-hidden="true">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-40 w-40 items-center justify-center rounded-md border border-[var(--color-hairline)] bg-[var(--color-tool)]/[0.03] p-2">
          <div className="flex flex-wrap content-center justify-center gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="size-2.5 rounded-full"
                style={{ backgroundColor: "var(--color-tool)", opacity: 0.9 }}
              />
            ))}
          </div>
        </div>
        <span className="micro-label">one job, one window</span>
      </div>

      <span className="font-mono text-2xl text-[var(--color-muted)]">→</span>

      <div className="flex flex-col gap-2">
        {lanes.map((lane) => (
          <div key={lane.name} className="flex items-center gap-3">
            <div className="flex h-11 w-40 flex-wrap content-end gap-0.5 overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-tool)]/[0.03] p-1.5">
              {Array.from({ length: lane.dots }).map((_, i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: dotColor(i), opacity: 0.85 }}
                />
              ))}
            </div>
            <span className="micro-label w-16 shrink-0">{lane.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
