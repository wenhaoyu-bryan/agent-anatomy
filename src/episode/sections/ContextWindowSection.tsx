import { useEffect, useRef } from "react";
import { whenIdle } from "../../lib/idle";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import { useGlSlot, useGlStore } from "../gl/glStore";
import { S3_DEMO_ITEMS, S3_DEMO_TOTAL } from "../gl/demoStream";
import { CATEGORY_HEX } from "../gl/palette";

const WINDOW_TOKENS = 4096;

/**
 * S3 — the context window (PLAN §5). Pinned and scroll-scrubbed when WebGL
 * is available: the reader scrolls and the glass volume fills. Copy here is
 * a working draft — the M4 narrative pass rewrites it. Fallback: a static
 * 2D stacked meter with the same teaching.
 */
export function ContextWindowSection() {
  const mode = useGlStore((s) => s.mode);
  const slotRef = useGlSlot("s3");
  const sectionRef = useRef<HTMLElement>(null);
  const ctxLabelRef = useRef<HTMLSpanElement>(null);

  // Pin + scrub (webgl mode only; reduced-motion/fallback scrolls normally).
  // gsap is imported dynamically: it never runs during SSR and stays out of
  // the initial bundle.
  useEffect(() => {
    if (mode !== "webgl" || !sectionRef.current) return;
    let trigger: ScrollTriggerType | undefined;
    let cancelled = false;
    void whenIdle()
      .then(() => Promise.all([import("gsap"), import("gsap/ScrollTrigger")]))
      .then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled || !sectionRef.current) return;
        gsap.registerPlugin(ScrollTrigger);
        trigger = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: "+=220%",
          pin: true,
          scrub: 0.4,
          onUpdate: (self) => useGlStore.getState().setS3Progress(self.progress),
        });
      },
    );
    return () => {
      cancelled = true;
      trigger?.kill();
    };
  }, [mode]);

  // Live token meter — DOM, synced from the store without re-rendering.
  useEffect(() => {
    return useGlStore.subscribe((state) => {
      const label = ctxLabelRef.current;
      if (!label) return;
      const tokens = Math.round(state.s3Progress * S3_DEMO_TOTAL);
      label.textContent = `CTX ${tokens.toLocaleString("en-US")} / ${WINDOW_TOKENS.toLocaleString("en-US")}`;
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      id="context-window"
      aria-labelledby="context-title"
      className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-4 py-24 md:px-6"
    >
      {/* Scene B (scroll mode) renders in this tracked area. */}
      <div ref={slotRef} className="absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="max-w-md">
          <p className="micro-label">The context window</p>
          <h2
            id="context-title"
            className="mt-3 text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Everything it knows has to fit in here
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--color-muted)]">
            The model doesn&rsquo;t &ldquo;remember.&rdquo; Everything the agent knows right now
            — its instructions, your request, every file it has read, every result it got back —
            must fit inside one window. Watch it fill as the run unfolds.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Every tool result spends budget. What happens when it fills up? That&rsquo;s episode
            1.5.
          </p>
        </div>

        {mode === "fallback" ? (
          <StaticMeter />
        ) : (
          <div className="mt-10 flex flex-col gap-1.5">
            <span ref={ctxLabelRef} className="micro-label">
              CTX 0 / {WINDOW_TOKENS.toLocaleString("en-US")}
            </span>
            <span className="micro-label">Scroll to feed the window</span>
          </div>
        )}
      </div>
    </section>
  );
}

/** No-WebGL / reduced-motion variant: the same lesson as a static bar. */
function StaticMeter() {
  return (
    <div className="mt-10 max-w-2xl">
      <div className="flex items-baseline justify-between">
        <span className="micro-label">
          CTX {S3_DEMO_TOTAL.toLocaleString("en-US")} / {WINDOW_TOKENS.toLocaleString("en-US")}
        </span>
        <span className="micro-label">
          {((S3_DEMO_TOTAL / WINDOW_TOKENS) * 100).toFixed(1)}%
        </span>
      </div>
      <div
        role="img"
        aria-label={`Context window: ${S3_DEMO_TOTAL} of ${WINDOW_TOKENS} tokens used after a typical run`}
        className="mt-2 flex h-4 w-full overflow-hidden rounded-sm border border-[var(--color-hairline)] bg-[var(--color-canvas)]"
      >
        {S3_DEMO_ITEMS.map((item, i) => (
          <div
            key={i}
            className="h-full"
            style={{
              width: `${(item.tokens / WINDOW_TOKENS) * 100}%`,
              backgroundColor: CATEGORY_HEX[item.category],
            }}
          />
        ))}
      </div>
    </div>
  );
}
