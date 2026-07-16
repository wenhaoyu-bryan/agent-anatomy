import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReplay } from "../episode/replay/store";
import type { Citation, SourceEntry, TraceEvent } from "../trace/schema";
import type { SourceStatus } from "../trace/replay";

/**
 * S5's third panel (Episode 02): the sources the agent found and the answer it
 * wrote. Source chips appear as the search surfaces them, light when a page is
 * read, and dim with an ✕ when a page can't be read. When the answer arrives,
 * its cited spans link back to their sources with luminous curved threads that
 * draw on as the answer assembles — the episode's share clip.
 *
 * DOM/SVG only: fully usable with no WebGL. Threads are measured from the live
 * layout, so they track resizes and reflow.
 */

interface Thread {
  key: string;
  d: string;
  hue: number;
  citeIndex: number;
}

const hueColor = (hue: number, sat = 60, light = 64): string => `hsl(${hue} ${sat}% ${light}%)`;

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
          next.push({ key: `${ci}-${sourceId}`, d, hue: source.faviconHue, citeIndex: ci });
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
            <g key={thread.key} style={{ opacity: active ? 1 : 0.18, transition: "opacity 160ms ease" }}>
              <path d={thread.d} fill="none" stroke={hueColor(thread.hue, 70, 60)} strokeWidth={6} strokeOpacity={0.18} strokeLinecap="round" />
              <path
                className="cite-thread"
                d={thread.d}
                fill="none"
                stroke={hueColor(thread.hue, 80, 70)}
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

      {/* Answer on the left, sources on the right (desktop) so threads arc
          horizontally; stacked with sources on top on mobile. */}
      <div className="flex flex-col gap-5 md:flex-row-reverse md:gap-6">
        <div className="relative z-10 shrink-0 md:w-[290px]">
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

        <div className="relative z-10 min-w-0 flex-1">
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
                      ? { backgroundColor: "var(--color-panel)", boxShadow: `inset 0 -2px 0 ${hueColor(cited.sourceIds.length ? (byId.get(cited.sourceIds[0]!)?.faviconHue ?? 200) : 200, 80, 66)}` }
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
  const dot = hueColor(source.faviconHue, read ? 62 : 40, read ? 62 : 52);
  return (
    <li
      ref={registerRef}
      className="source-chip flex items-center gap-2.5 rounded border px-2.5 py-2"
      style={{
        opacity: unreadable ? 0.5 : read ? 1 : 0.8,
        borderColor: read ? hueColor(source.faviconHue, 45, 46) : "var(--color-hairline)",
        backgroundColor: read ? "color-mix(in srgb, var(--color-panel) 70%, transparent)" : "transparent",
      }}
    >
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full"
        style={{
          backgroundColor: unreadable ? "transparent" : dot,
          border: unreadable ? `1px solid var(--color-muted)` : "none",
          boxShadow: read ? `0 0 6px ${dot}` : "none",
        }}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] ${unreadable ? "text-[var(--color-muted)] line-through" : "text-[var(--color-ink)]"}`}>
          {source.title}
        </span>
        <span className="block truncate font-mono text-[11px] text-[var(--color-muted)]">{source.url}</span>
      </span>
      <span className="micro-label shrink-0" style={{ color: read ? hueColor(source.faviconHue, 55, 66) : "var(--color-muted)" }}>
        {read ? "read" : unreadable ? "✕ unread" : "found"}
      </span>
    </li>
  );
}
