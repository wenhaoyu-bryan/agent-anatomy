import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useGlReady } from "./useGlReady";

const FunnelCanvas = lazy(() => import("./FunnelCanvas"));

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

const STAGES = [
  { label: "The web", caption: "Billions of pages the model was never trained on — the live web." },
  { label: "Results", caption: "A search surfaces a handful of pages that might hold the answer." },
  { label: "Selected", caption: "The agent picks the few worth actually reading." },
  { label: "Into the window", caption: "Their contents become fragments that flow into the context window." },
] as const;

function stageOf(progress: number): number {
  if (progress < 0.18) return 0;
  if (progress < 0.4) return 1;
  if (progress < 0.6) return 2;
  return 3;
}

/**
 * S3 — the funnel section. A tall section with a sticky viewport; scrolling
 * scrubs the WebGL narrowing (CSS-sticky "pin", no scroll-jacking). Reduced
 * motion / no WebGL / SSR get a compact static diagram instead.
 */
export function FunnelSection() {
  const ready = useGlReady();
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const stageRef = useRef(0);
  const [stage, setStage] = useState(0);
  const [inView, setInView] = useState(false);

  // Pause the funnel's frameloop whenever its pinned viewport is off-screen.
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
      <section id="funnel" aria-labelledby="funnel-title" className="reveal px-4 py-24 md:px-6">
        <div className="mx-auto w-full max-w-4xl">
          <FunnelHeading />
          <FunnelStaticFigure />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="funnel"
      aria-labelledby="funnel-title"
      className="relative"
      style={{ height: "340vh" }}
    >
      <div ref={stickyRef} className="sticky top-0 flex h-dvh flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Suspense fallback={null}>
            <FunnelCanvas progressRef={progressRef} frameloop={inView ? "always" : "never"} />
          </Suspense>
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col justify-between px-4 py-16 md:px-6">
          <FunnelHeading />
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
    </section>
  );
}

function FunnelHeading() {
  return (
    <div>
      <p className="micro-label">The narrowing</p>
      <h2
        id="funnel-title"
        className="mt-3 max-w-xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        From the whole web down to a few fragments
      </h2>
    </div>
  );
}

/** Static fallback — the same narrowing as a plain diagram (SSR / reduced motion). */
function FunnelStaticFigure() {
  return (
    <div className="mt-10 flex flex-col items-center gap-3" aria-hidden="true">
      <Row n={11} tint="muted" label="the web" />
      <Row n={5} tint="tool-dim" label="results" />
      <Row n={3} tint="tool" label="selected" />
      <div className="mt-2 flex h-16 w-40 items-end justify-center gap-1 rounded-md border border-[var(--color-hairline)] bg-[var(--color-tool)]/[0.03] p-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="w-2 rounded-sm bg-[var(--color-tool)]" style={{ height: `${30 + ((i * 37) % 60)}%`, opacity: 0.8 }} />
        ))}
      </div>
      <span className="micro-label">context window</span>
    </div>
  );
}

function Row({ n, tint, label }: { n: number; tint: "muted" | "tool-dim" | "tool"; label: string }) {
  const color = tint === "tool" ? "var(--color-tool)" : "var(--color-muted)";
  const opacity = tint === "muted" ? 0.4 : tint === "tool-dim" ? 0.7 : 1;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {Array.from({ length: n }).map((_, i) => (
          <span key={i} className="size-2.5 rounded-[2px]" style={{ backgroundColor: color, opacity }} />
        ))}
      </div>
      <span className="micro-label">{label}</span>
    </div>
  );
}
