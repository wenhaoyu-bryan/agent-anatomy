const EPISODE_01 = `${import.meta.env.BASE_URL}episodes/how-an-agent-works/`;

/**
 * S2 — the cutoff (Episode 02). One idea, one small figure: a model's
 * knowledge is a sealed archive with a date on the door; the world keeps
 * moving past it; search is the bridge. DOM/SVG — legible without WebGL.
 */
export function CutoffFigure() {
  return (
    <section id="cutoff" aria-labelledby="cutoff-title" className="reveal px-4 py-24 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <p className="micro-label">The cutoff</p>
        <h2
          id="cutoff-title"
          className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          A model is a snapshot. The world keeps moving.
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-muted)]">
          Everything a model learned, it learned once, up to a cutoff date — then training stopped.
          Ask it about anything after that line, or anything specific enough that it was never sure,
          and honest is <em>&ldquo;I&rsquo;d have to look.&rdquo;</em> Search is how it looks.
        </p>

        <div className="mt-10 grid items-center gap-6 md:grid-cols-[auto_1fr]">
          {/* The sealed archive with a date on the door. */}
          <div className="flex items-stretch gap-4">
            <div className="flex w-40 flex-col rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/50 p-4">
              <span className="micro-label">Training data</span>
              <div className="mt-3 flex flex-1 flex-col justify-center gap-1.5" aria-hidden="true">
                {["78%", "62%", "90%", "54%", "70%"].map((w, i) => (
                  <span key={i} className="h-2 rounded-sm bg-[var(--color-hairline)]" style={{ width: w }} />
                ))}
              </div>
              <span className="mt-3 rounded border border-[var(--color-hairline)] px-2 py-1 text-center font-mono text-[11px] text-[var(--color-muted)]">
                sealed · cutoff
              </span>
            </div>
            <div className="flex items-center" aria-hidden="true">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="text-[var(--color-tool)]">
                <path d="M2 12h32m0 0-7-7m7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div>
            <p className="leading-relaxed">
              Past the cutoff, the model can&rsquo;t know what it never saw — new guidance, this
              week&rsquo;s news, the specific page you need. So it does what you&rsquo;d do: it goes and
              reads. What it reads lands in the same{" "}
              <a
                href={`${EPISODE_01}#context`}
                className="underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
              >
                context window
              </a>{" "}
              from Episode 01 — the working memory everything has to fit inside.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
