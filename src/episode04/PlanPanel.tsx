import { useReplay } from "../episode/replay/store";

/**
 * The third panel for Episode 04 — the artifact the lead finally composes. The
 * point is that it's assembled from the helpers' three summaries, never from
 * their raw work: the lead never held that. Empty until the lead writes it, then
 * the plan appears — the series' healing-artifact beat. DOM only.
 */
export function PlanPanel() {
  const files = useReplay((s) => s.frame.artifact.files);
  const event = useReplay((s) => s.frame.event);

  const entries = Object.entries(files);
  const justWrote = event?.type === "tool_result" && event.artifact ? Object.keys(event.artifact.files) : [];

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        The lead composes the plan from the three summaries it got back — never from the helpers&rsquo;
        raw work, which it never saw. It appears here once it&rsquo;s written.
      </p>

      {entries.length === 0 ? (
        <p className="rounded border border-dashed border-[var(--color-hairline)] px-3 py-6 text-center font-mono text-xs text-[var(--color-muted)]">
          No plan yet. The lead is still delegating and gathering reports.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map(([name, content]) => {
            const isActive = justWrote.includes(name);
            return (
              <li
                key={name}
                className="overflow-hidden rounded-md border transition-colors"
                style={{
                  borderColor: isActive ? "var(--color-tool)" : "var(--color-hairline)",
                  boxShadow: isActive ? "0 0 0 1px var(--color-tool)" : "none",
                }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2">
                  <span className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink)]">
                    <FileGlyph />
                    {name}
                  </span>
                  {isActive && <span className="micro-label text-[var(--color-tool)]">← composed</span>}
                </div>
                <pre className="max-h-72 overflow-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--color-muted)]">
                  {content}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FileGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5 text-[var(--color-tool)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5.5L9 1.5Z" />
      <path d="M9 1.5V5.5H13" />
    </svg>
  );
}
