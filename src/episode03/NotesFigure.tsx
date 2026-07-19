/**
 * S4 — Notes, not neurons. One concrete figure: the context window is a glass
 * box that empties; the memory file sits OUTSIDE it, on disk, and persists.
 * The idea, in civilian words (the PM thesis unlabelled): the most durable
 * memory an agent has is something it wrote down.
 */
export function NotesFigure() {
  return (
    <section id="notes" aria-labelledby="notes-title" className="reveal px-4 py-24 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <p className="micro-label">Notes, not neurons</p>
        <h2
          id="notes-title"
          className="mt-3 max-w-xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The most durable memory is the one it wrote down
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-[var(--color-muted)]">
          An agent doesn’t “remember” a conversation the way you do — nothing is stored in its
          weights when a session ends. What survives is what it wrote to a file. The window is
          scratch space that gets wiped; the file is the part it can count on tomorrow.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center" aria-hidden="true">
          {/* The window: a glass box, emptied. */}
          <figure className="flex flex-col items-center gap-2">
            <div className="relative flex h-40 w-full max-w-xs items-end justify-center overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-tool)]/[0.02]">
              <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-[var(--color-muted)]">
                empty
              </span>
            </div>
            <figcaption className="micro-label">context window · wiped at session end</figcaption>
          </figure>

          <div className="flex items-center justify-center">
            <span className="font-mono text-sm text-[var(--color-muted)]">outlives →</span>
          </div>

          {/* The file: persists, in the artifact panel's language. */}
          <figure className="flex flex-col items-center gap-2">
            <div
              className="w-full max-w-xs overflow-hidden rounded-md border"
              style={{ borderColor: "var(--color-tool)", boxShadow: "0 0 0 1px var(--color-tool)" }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2">
                <span className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink)]">
                  <FileGlyph />
                  notes/tokyo-trip.md
                </span>
                <span className="micro-label text-[var(--color-tool)]">on disk</span>
              </div>
              <pre className="px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--color-muted)]">
                {"# Tokyo — 3 days, November\nlikes: food markets, quiet\ntemples; don't cram\nday 1: Yanaka (temples,\n  slow morning)\nopen: exact temple hours"}
              </pre>
            </div>
            <figcaption className="micro-label">a file · persists</figcaption>
          </figure>
        </div>

        <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
          Write it down and you can read it back exactly — no guessing what a fading memory used to
          say. Some systems also let an agent search its own notes by meaning, not just by name; that
          is a mechanism for another episode.
        </p>
      </div>
    </section>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-[var(--color-tool)]" fill="none" aria-hidden="true">
      <path
        d="M4 2h5l3 3v9a0 0 0 0 1 0 0H4a0 0 0 0 1 0 0V2z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
