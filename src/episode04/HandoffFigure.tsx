/**
 * S4 — handoffs are summaries. A small, concrete figure: a helper's full window
 * (everything it read and thought) versus the single condensed block that
 * actually reaches the lead. It reuses Episode 03's lossy grammar — the digest
 * is smaller, greyed, and softened — because a handoff is the same trade as a
 * compaction: keep the gist, lose the detail. The quietly most PM sentence in
 * the series, kept in civilian words. DOM only.
 */
export function HandoffFigure() {
  // A helper's window is a crowd of its own reads, searches, and thoughts.
  const dotColor = (i: number) =>
    i % 6 === 0 ? "var(--color-thinking)" : i % 13 === 0 ? "var(--color-success)" : "var(--color-tool)";

  return (
    <section id="handoffs" aria-labelledby="handoffs-title" className="px-4 py-24 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="reveal">
          <p className="micro-label">Handoffs</p>
          <h2
            id="handoffs-title"
            className="mt-3 max-w-xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The lead never sees the work — only the report
          </h2>
        </div>

        <div className="reveal mt-10 flex flex-col items-center gap-6 md:flex-row md:justify-center">
          {/* The helper's full window — crowded and colourful. */}
          <figure className="flex flex-col items-center gap-2">
            <div className="flex h-44 w-56 flex-wrap content-start gap-1 overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-tool)]/[0.03] p-2.5">
              {Array.from({ length: 60 }).map((_, i) => (
                <span
                  key={i}
                  className="size-2 rounded-full"
                  style={{ backgroundColor: dotColor(i), opacity: 0.9 }}
                />
              ))}
            </div>
            <figcaption className="micro-label">VENUE’s window — all it read and thought</figcaption>
          </figure>

          {/* The hand-off: a labelled arrow. */}
          <div className="flex shrink-0 flex-col items-center gap-1 text-[var(--color-muted)]">
            <span className="font-mono text-2xl md:rotate-0">→</span>
            <span className="micro-label">hands back</span>
          </div>

          {/* What the lead actually receives — one small, softened, greyed block. */}
          <figure className="flex flex-col items-center gap-2">
            <div className="flex h-44 w-56 items-center justify-center rounded-md border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 p-3">
              <div
                className="rounded-sm border border-[var(--color-hairline)] bg-[var(--color-muted)]/10 px-3 py-2"
                style={{ filter: "blur(0.4px)", opacity: 0.85 }}
              >
                <p className="font-mono text-[11px] leading-relaxed text-[var(--color-muted)] italic">
                  “Top pick: Sunset Loft — private, low-key. But a $2,400 minimum, likely over budget.”
                </p>
              </div>
            </div>
            <figcaption className="micro-label">what the lead gets — one summary</figcaption>
          </figure>
        </div>

        <p className="reveal mx-auto mt-8 max-w-xl text-center leading-relaxed text-[var(--color-muted)]">
          The lead delegates the work and gets back a sentence. It never holds the searches, the pages,
          the dead ends — only the conclusion. That keeps the lead light enough to run the whole show,
          and it&rsquo;s the same trade as compressing a memory:{" "}
          <span className="text-[var(--color-ink)]">you keep the gist and lose the detail</span>. Most of
          the time that&rsquo;s exactly what you want — until the detail that got dropped was the one
          that mattered.
        </p>
      </div>
    </section>
  );
}
