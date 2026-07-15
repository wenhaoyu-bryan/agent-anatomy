/**
 * S4 — reading a page (Episode 02). The honest mechanics, small and concrete:
 * a real page becomes text, its boilerplate falls away, and one fragment
 * survives to enter the window. Then the counter-example: a JavaScript-only
 * page that a fetcher opens to nothing. DOM/SVG only — legible without WebGL.
 */
export function ReadingFigure() {
  return (
    <section id="reading" aria-labelledby="reading-title" className="reveal px-4 py-24 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <p className="micro-label">Reading a page</p>
        <h2
          id="reading-title"
          className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-balance md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What &ldquo;reading a page&rdquo; actually means
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-muted)]">
          A fetched page is mostly wrapping — menus, banners, footers. The agent keeps the part that
          answers the question and drops the rest. Usually. Sometimes there&rsquo;s nothing to keep.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Figure title="A page it can read">
            <PageMock
              lines={[
                { kind: "chrome", w: "60%" },
                { kind: "chrome", w: "40%" },
                { kind: "keep", text: "Cool cooked rice within an hour and refrigerate it." },
                { kind: "keep", text: "Reheat until steaming hot; don’t reheat more than once." },
                { kind: "chrome", w: "70%" },
                { kind: "chrome", w: "50%" },
              ]}
            />
            <Arrow />
            <div className="rounded border border-[var(--color-tool)]/40 bg-[var(--color-tool)]/[0.04] p-3">
              <p className="micro-label" style={{ color: "var(--color-tool)" }}>
                Fragment kept
              </p>
              <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-ink)]">
                Cool cooked rice within an hour and refrigerate it. Reheat until steaming hot; don&rsquo;t
                reheat more than once.
              </p>
            </div>
          </Figure>

          <Figure title="A page it can’t">
            <PageMock empty />
            <Arrow />
            <div className="rounded border border-dashed border-[var(--color-hairline)] p-3">
              <p className="micro-label" style={{ color: "var(--color-user)" }}>
                Nothing kept
              </p>
              <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-muted)]">
                The page builds its content with JavaScript the fetcher never runs. It opens to an
                empty shell — no text to read.
              </p>
            </div>
          </Figure>
        </div>

        <p className="mt-8 text-center font-mono text-sm text-[var(--color-muted)]">
          A page that can&rsquo;t be read can&rsquo;t be cited.
        </p>
      </div>
    </section>
  );
}

function Figure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 p-5">
      <span className="micro-label">{title}</span>
      {children}
    </div>
  );
}

type Line = { kind: "chrome"; w: string } | { kind: "keep"; text: string };

function PageMock({ lines, empty = false }: { lines?: Line[]; empty?: boolean }) {
  return (
    <div className="overflow-hidden rounded border border-[var(--color-hairline)] bg-[var(--color-canvas)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--color-hairline)] px-3 py-2">
        <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
        <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
        <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
      </div>
      <div className="flex min-h-[132px] flex-col gap-2 p-3">
        {empty ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <code className="font-mono text-xs text-[var(--color-hairline)]">&lt;div id=&quot;root&quot;&gt;&lt;/div&gt;</code>
          </div>
        ) : (
          lines!.map((line, i) =>
            line.kind === "chrome" ? (
              <span key={i} className="h-2 rounded-sm bg-[var(--color-hairline)]" style={{ width: line.w }} />
            ) : (
              <span
                key={i}
                className="rounded-sm bg-[var(--color-tool)]/[0.08] px-1.5 py-1 font-mono text-[11px] leading-snug text-[var(--color-ink)]"
              >
                {line.text}
              </span>
            ),
          )
        )}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="text-[var(--color-muted)]">
        <path d="M8 1v15m0 0 5-5m-5 5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
