import { ReplaySection } from "./replay/ReplaySection";
import { ContextWindowSection } from "./sections/ContextWindowSection";
import { GlRoot } from "./gl/GlRoot";
import { useGlSlot } from "./gl/glStore";

const HOME_URL = import.meta.env.BASE_URL;

/**
 * Episode shell. S1 hero + S4 replay so far; S2/S3/S5 and scroll
 * orchestration arrive in M3–M4.
 */
export function Episode() {
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
        <ContextWindowSection />
        <ReplaySection />
      </main>
      <GlRoot />
    </>
  );
}

function Hero() {
  const slotRef = useGlSlot("hero");
  return (
    <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6">
      {/* Scene A (ambient WebGL) tracks the hero; the grid always stays. */}
      <div ref={slotRef} className="absolute inset-0" aria-hidden="true" />
      <div className="telemetry-grid pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <a href={HOME_URL} className="micro-label transition-colors hover:text-[var(--color-ink)]">
          ← Agent Anatomy
        </a>
        <p className="micro-label mt-8">Episode 01</p>
        <h1
          className="mt-4 max-w-3xl text-4xl leading-[1.03] font-medium tracking-tight text-balance md:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What happens when you give an AI a task?
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)] md:text-xl">
          A visual guide to how AI agents actually work. No background needed.
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <span className="micro-label">Scroll</span>
      </div>
    </section>
  );
}
