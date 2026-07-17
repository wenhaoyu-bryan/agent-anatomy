import { useReplay } from "../episode/replay/store";

/**
 * The memory layer — the artifact panel for Episode 03. Memory notes ARE files
 * (schema 1.3 reuses ArtifactState.files), so this renders the files the agent
 * has written. The point of the whole episode is spatial: these files sit
 * OUTSIDE the context window, so when the window empties at a session break the
 * notes are still here. Nothing WebGL — this is the DOM truth the V3 scene
 * dramatizes.
 */
export function MemoryPanel() {
  const frame = useReplay((s) => s.frame);
  const event = frame.event;

  // README.txt is scaffolding that explains the panel before any note exists.
  const notes = Object.entries(frame.artifact.files).filter(([name]) => name !== "README.txt");

  const activePath =
    event && (event.type === "memory_write" || event.type === "memory_read") ? event.path : null;
  const activeMode = event?.type === "memory_read" ? "read" : event?.type === "memory_write" ? "wrote" : null;
  const justBroke = event?.type === "session_break";

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        Files the agent wrote. They live <span className="text-[var(--color-ink)]">outside</span> the
        context window — so emptying the window doesn&rsquo;t erase them.
      </p>

      {justBroke && (
        <p className="rounded border border-[var(--color-thinking)]/40 bg-[var(--color-thinking)]/5 px-3 py-2 font-mono text-xs leading-relaxed text-[var(--color-ink)]">
          New session — the window is empty. The notes below are still here.
        </p>
      )}

      {notes.length === 0 ? (
        <p className="rounded border border-dashed border-[var(--color-hairline)] px-3 py-6 text-center font-mono text-xs text-[var(--color-muted)]">
          No notes yet. When the window fills up, the agent writes down what it wants to keep.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map(([name, content]) => {
            const isActive = name === activePath;
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
                  {isActive && (
                    <span className="micro-label text-[var(--color-tool)]">
                      {activeMode === "read" ? "reading →" : "← writing"}
                    </span>
                  )}
                </div>
                <pre className="max-h-52 overflow-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--color-muted)]">
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
