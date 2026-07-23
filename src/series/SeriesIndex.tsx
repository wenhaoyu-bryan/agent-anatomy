import { EPISODES, SUGGEST_ENTRY } from "./episodes";

/**
 * The shared series index rendered at the close of every episode. Renders from
 * the EPISODES manifest so all five pages show the same, current roster: each
 * live episode is a real link, the current episode is marked "You are here"
 * (and is not a link), and the open "suggest a topic" slot closes the list.
 *
 * Callers own the surrounding heading ("The series" / a narrative line), so each
 * episode keeps its own voice while the roster stays in one place.
 */
export function SeriesIndex({ currentId }: { currentId: string }) {
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {EPISODES.map((ep) =>
        ep.id === currentId ? (
          <li
            key={ep.id}
            aria-current="page"
            className="rounded-lg border border-[var(--color-tool)]/40 bg-[var(--color-panel)]/40 px-5 py-4"
          >
            <div className="flex items-baseline gap-4">
              <span className="shrink-0 font-mono tabular-nums text-[var(--color-tool)]">{ep.number}</span>
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
                    {ep.title}
                  </p>
                  <span className="micro-label text-[var(--color-tool)]">You are here</span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{ep.blurb}</p>
              </div>
            </div>
          </li>
        ) : (
          <li key={ep.id}>
            <a
              href={ep.href}
              className="block rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-4 transition-colors hover:border-[var(--color-muted)]"
            >
              <div className="flex items-baseline gap-4">
                <span className="shrink-0 font-mono tabular-nums text-[var(--color-tool)]">{ep.number}</span>
                <div>
                  <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
                    {ep.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{ep.blurb}</p>
                </div>
              </div>
            </a>
          </li>
        ),
      )}
      <li>
        <a
          href={SUGGEST_ENTRY.href}
          className="group block rounded-lg border border-dashed border-[var(--color-hairline)] px-5 py-4 transition-colors hover:border-[var(--color-tool)]"
        >
          <div className="flex items-baseline gap-4">
            <span className="shrink-0 font-mono tabular-nums text-[var(--color-muted)]">{SUGGEST_ENTRY.number}</span>
            <div>
              <p
                className="font-medium text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-ink)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {SUGGEST_ENTRY.title} →
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{SUGGEST_ENTRY.blurb}</p>
            </div>
          </div>
        </a>
      </li>
    </ul>
  );
}
