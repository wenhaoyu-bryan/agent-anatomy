const HOME_URL = import.meta.env.BASE_URL;
const EPISODE_15 = `${HOME_URL}episodes/where-agents-go-wrong/`;

// The stacked window, in the 2D meter's language (§6 palette). The oldest band —
// the original request — is the one that fell out in Episode 1.5's F2.
const LIVE = [
  { w: 14, color: "var(--color-tool)" },
  { w: 18, color: "var(--color-thinking)" },
  { w: 22, color: "var(--color-tool)" },
  { w: 16, color: "var(--color-success)" },
  { w: 12, color: "var(--color-tool)" },
] as const;
const EVICTED = [
  { w: 10, color: "var(--color-muted)" },
  { w: 8, color: "var(--color-user)" },
] as const;

/**
 * S2 — the wound (recap). One compact figure replaying Episode 1.5's eviction
 * moment in miniature, in the 2D context-meter's visual grammar (a full window
 * dropping its oldest band out the bottom) rather than a second WebGL canvas —
 * the page already runs three, and the still frame carries the wound cleanly.
 * Ends on the question the rest of the episode answers.
 */
export function WoundRecap() {
  return (
    <section id="wound" aria-labelledby="wound-title" className="reveal px-4 py-24 md:px-6">
      <div className="mx-auto grid w-full max-w-4xl gap-10 md:grid-cols-[1fr_auto] md:items-center md:gap-14">
        <div>
          <p className="micro-label">The wound</p>
          <h2
            id="wound-title"
            className="mt-3 max-w-xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            You’ve seen what happens when the window fills
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-[var(--color-muted)]">
            In{" "}
            <a
              href={EPISODE_15}
              className="text-[var(--color-ink)] underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:decoration-[var(--color-muted)]"
            >
              Episode 1.5
            </a>
            , an agent read until its context window was full — and to keep going, the oldest items
            fell out the bottom, including the original request. It kept working anyway, on a task it
            could no longer see.
          </p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-[var(--color-ink)]">
            So how does anything survive a window that keeps emptying?
          </p>
        </div>

        <figure className="mx-auto w-full max-w-[15rem]" aria-hidden="true">
          <div className="flex h-4 w-full overflow-hidden rounded-sm border border-[var(--color-hairline)] bg-[var(--color-canvas)]">
            {LIVE.map((seg, i) => (
              <div key={i} className="h-full" style={{ width: `${seg.w}%`, backgroundColor: seg.color }} />
            ))}
            {EVICTED.map((seg, i) => (
              <div key={i} className="h-full opacity-25" style={{ width: `${seg.w}%`, backgroundColor: seg.color }} />
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <span
              className="micro-label rounded-sm border border-dashed border-[var(--color-muted)]/60 px-1.5 py-0.5"
              style={{ color: "var(--color-muted)" }}
            >
              ✕ evicted — the request
            </span>
          </div>
          <figcaption className="micro-label mt-3 block text-center">context window · full</figcaption>
        </figure>
      </div>
    </section>
  );
}
