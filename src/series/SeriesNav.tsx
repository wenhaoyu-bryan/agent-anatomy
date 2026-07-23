import { neighbors } from "./episodes";

/**
 * Compact prev/next footer nav ("← 1.5 · 03 →") so a reader can continue to the
 * next episode without scrolling back to the top. Episodes only; the ends are
 * one-sided (Ep 01 has no prev, Ep 04 no next). Reads from the same manifest as
 * SeriesIndex.
 */
export function SeriesNav({ currentId }: { currentId: string }) {
  const { prev, next } = neighbors(currentId);
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Episode navigation"
      className="reveal mt-12 flex items-stretch justify-between gap-4 border-t border-[var(--color-hairline)] pt-6"
    >
      {prev ? (
        <a href={prev.href} className="group flex flex-col gap-1 text-left">
          <span className="micro-label">← Previous</span>
          <span
            className="font-medium transition-colors group-hover:text-[var(--color-tool)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {prev.number} · {prev.title}
          </span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
      {next ? (
        <a href={next.href} className="group ml-auto flex flex-col gap-1 text-right">
          <span className="micro-label">Next →</span>
          <span
            className="font-medium transition-colors group-hover:text-[var(--color-tool)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {next.number} · {next.title}
          </span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
