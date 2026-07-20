import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReplay } from "../episode/replay/store";
import type { Citation, SourceEntry, TraceEvent } from "../trace/schema";
import type { SourceStatus } from "../trace/replay";

/**
 * S5's third panel (Episode 02): the sources the agent found and the answer it
 * wrote. Source chips appear as the search surfaces them, light when a page is
 * read, and dim with an ✕ when a page can't be read. When the answer arrives,
 * its cited spans link back to their sources with signal-cyan threads that draw
 * on as the answer assembles — the episode's share clip.
 *
 * Palette (§6): chips and threads use only the fixed telemetry palette — no
 * per-source hue. Sources are told apart by their label and glyph; the
 * thread → source mapping is carried by hovering or focusing a citation, which
 * lights its thread group and dims the rest. `sources[].faviconHue` in the
 * schema is retained for back-compat but no longer rendered.
 *
 * DOM/SVG only: fully usable with no WebGL. Threads are measured from the live
 * layout, so they track resizes and reflow.
 */

interface Thread {
  key: string;
  d: string;
  citeIndex: number;
}

/** Split the answer into plain runs and cited runs, in order. */
function segments(text: string, citations: Citation[]): Array<{ text: string; cite: number | null }> {
  const sorted = citations
    .map((citation, index) => ({ ...citation, index }))
    .filter((c) => c.spanStart < c.spanEnd && c.spanEnd <= text.length)
    .sort((a, b) => a.spanStart - b.spanStart);
  const out: Array<{ text: string; cite: number | null }> = [];
  let cursor = 0;
  for (const c of sorted) {
    if (c.spanStart < cursor) continue; // skip overlaps defensively
    if (c.spanStart > cursor) out.push({ text: text.slice(cursor, c.spanStart), cite: null });
    out.push({ text: text.slice(c.spanStart, c.spanEnd), cite: c.index });
    cursor = c.spanEnd;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), cite: null });
  return out;
}

export function SourcesAnswerPanel() {
  const frame = useReplay((s) => s.frame);
  const sources = useReplay((s) => s.sources);
  const events = useReplay((s) => s.trace.events);

  const answerIndex = events.findIndex((event) => event.type === "assistant_message");
  const answerEvent = answerIndex >= 0 ? (events[answerIndex] as Extract<TraceEvent, { type: "assistant_message" }>) : null;
  const answerVisible = answerEvent !== null && frame.index >= answerIndex;
  const citations = answerEvent?.citations ?? [];

  const sourceStates = frame.sourceStates;
  const byId = new Map(sources.map((source) => [source.sourceId, source]));

  const containerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLElement>());
  const markRefs = useRef<Array<HTMLElement | null>>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [drawn, setDrawn] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  // Measure spans → chips and build the thread paths, relative to the panel so
  // they scroll and resize with the content.
  useLayoutEffect(() => {
    if (!answerVisible) {
      setThreads([]);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const compute = (): void => {
      const cr = container.getBoundingClientRect();
      const next: Thread[] = [];
      citations.forEach((citation, ci) => {
        const mark = markRefs.current[ci];
        if (!mark) return;
        const m = mark.getBoundingClientRect();
        const x1 = m.left + m.width / 2 - cr.left;
        const y1 = m.top - cr.top; // leave from the top of the span
        for (const sourceId of citation.sourceIds) {
          const chip = chipRefs.current.get(sourceId);
          const source = byId.get(sourceId);
          if (!chip || !source) continue;
          const c = chip.getBoundingClientRect();
          const x2 = c.left + c.width / 2 - cr.left;
          const y2 = c.bottom - cr.top; // arrive at the bottom of the chip
          const dy = y1 - y2;
          const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${(y1 - dy * 0.42).toFixed(1)}, ${x2.toFixed(1)} ${(y2 + dy * 0.42).toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
          next.push({ key: `${ci}-${sourceId}`, d, citeIndex: ci });
        }
      });
      setThreads(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    window.addEventListener("resize", compute);
    // Re-measure once webfonts settle (they shift the answer's line wrapping).
    void document.fonts?.ready?.then(compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerVisible, frame.index, sources]);

  // Draw the threads on shortly after the answer appears (dashoffset 1 → 0).
  useEffect(() => {
    if (!answerVisible) {
      setDrawn(false);
      return;
    }
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [answerVisible]);

  const hasSearched = Object.keys(sourceStates).length > 0;
  // Registry order, but only sources that have surfaced by now.
  const visibleSources = sources.filter((source) => sourceStates[source.sourceId] !== undefined);

  return (
    <div ref={containerRef} className="relative p-4">
      {/* Threads overlay — sits above chips/text, ignores pointer events. */}
      <svg
        className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        {threads.map((thread) => {
          const active = hovered === null || hovered === thread.citeIndex;
          return (
            <g key={thread.key} style={{ opacity: active ? 1 : 0.16, transition: "opacity 160ms ease" }}>
              <path d={thread.d} fill="none" stroke="var(--color-tool)" strokeWidth={6} strokeOpacity={0.16} strokeLinecap="round" />
              <path
                className="cite-thread"
                d={thread.d}
                fill="none"
                stroke="var(--color-tool)"
                strokeWidth={1.6}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={drawn ? 0 : 1}
                style={{ transitionDelay: `${thread.citeIndex * 160}ms` }}
              />
            </g>
          );
        })}
      </svg>

      {/* Sources on top, answer below, so threads arc up from each cited span to
          the chip it came from — in a narrow column or full width alike. */}
      <div className="flex flex-col gap-5">
        <div className="relative z-10">
          <span className="micro-label">Sources</span>
          {!hasSearched ? (
            <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
              The agent hasn&rsquo;t searched the web yet. Sources appear here as it finds them.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {visibleSources.map((source) => (
                <SourceChip
                  key={source.sourceId}
                  source={source}
                  status={sourceStates[source.sourceId]!}
                  registerRef={(el) => {
                    if (el) chipRefs.current.set(source.sourceId, el);
                    else chipRefs.current.delete(source.sourceId);
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="relative z-10 min-w-0">
          <span className="micro-label">Answer</span>
          {answerVisible && answerEvent ? (
            <p
              className="mt-3 font-mono text-sm leading-relaxed text-[var(--color-ink)]"
              style={{ animation: "cite-answer-in 320ms var(--ease-mechanical)" }}
            >
            {segments(answerEvent.text, citations).map((seg, i) => {
              if (seg.cite === null) return <span key={i}>{seg.text}</span>;
              const ci = seg.cite;
              const cited = citations[ci]!;
              const titles = cited.sourceIds.map((id) => byId.get(id)?.title ?? id).join("; ");
              return (
                <button
                  key={i}
                  type="button"
                  ref={(el) => {
                    markRefs.current[ci] = el;
                  }}
                  aria-label={`Cited from: ${titles}`}
                  onMouseEnter={() => setHovered(ci)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(ci)}
                  onBlur={() => setHovered(null)}
                  className="rounded-sm px-0.5 text-left align-baseline underline decoration-dotted decoration-[var(--color-muted)] underline-offset-4 transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-panel)]"
                  style={
                    hovered === ci
                      ? { backgroundColor: "var(--color-panel)", boxShadow: "inset 0 -2px 0 var(--color-tool)" }
                      : undefined
                  }
                >
                  {seg.text}
                </button>
              );
            })}
          </p>
        ) : (
          <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
            {hasSearched
              ? "The agent is still reading. Its answer appears here once it’s written — with links back to the sources it used."
              : "Nothing written yet."}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}

/** A small document glyph, tinted by read state — the chip's only mark. */
function SourceGlyph({ read }: { read: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden="true"
      className="shrink-0"
      style={{ color: read ? "var(--color-tool)" : "var(--color-muted)" }}
    >
      <path
        d="M4 1.75h4.6L12.25 5.4V13.75a.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V2.5a.75.75 0 0 1 .75-.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path d="M8.4 1.9V5.4h3.5" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  );
}

function SourceChip({
  source,
  status,
  registerRef,
}: {
  source: SourceEntry;
  status: SourceStatus;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const read = status === "read";
  const unreadable = status === "unreadable";
  return (
    <li
      ref={registerRef}
      className="source-chip flex items-center gap-2.5 rounded border px-2.5 py-2"
      style={{
        opacity: unreadable ? 0.5 : read ? 1 : 0.8,
        borderColor: read ? "color-mix(in srgb, var(--color-tool) 45%, var(--color-hairline))" : "var(--color-hairline)",
        backgroundColor: read ? "color-mix(in srgb, var(--color-panel) 70%, transparent)" : "transparent",
      }}
    >
      <SourceGlyph read={read} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] ${unreadable ? "text-[var(--color-muted)] line-through" : "text-[var(--color-ink)]"}`}>
          {source.title}
        </span>
        <span className="block truncate font-mono text-[11px] text-[var(--color-muted)]">{source.url}</span>
      </span>
      <span className="micro-label shrink-0" style={{ color: read ? "var(--color-tool)" : "var(--color-muted)" }}>
        {read ? "read" : unreadable ? "✕ unread" : "found"}
      </span>
    </li>
  );
}
