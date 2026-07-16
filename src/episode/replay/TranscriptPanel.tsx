import { useEffect, useRef } from "react";
import { useReplay } from "./store";
import { EVENT_META, eventBody } from "./eventMeta";
import type { TraceEvent } from "../../trace/schema";

/**
 * The event stream, chronological. Events up to the current index are shown —
 * scrubbing back rewinds the story. Items an eviction has dropped from the
 * window stay in the log but dimmed (they happened; they're just no longer
 * live), and a `context_evicted` marker records the moment. The current event
 * is highlighted and kept in view.
 */
export function TranscriptPanel() {
  const frame = useReplay((s) => s.frame);
  const events = useReplay((s) => s.trace.events);
  const currentRef = useRef<HTMLLIElement>(null);

  // Keep the current event in view by scrolling ONLY the panel. scrollIntoView
  // would climb to the document and yank the page while the reader is
  // elsewhere — scroll-jacking, which §8 forbids.
  useEffect(() => {
    const item = currentRef.current;
    const container = item?.closest<HTMLElement>("[data-replay-scroll]");
    if (!item || !container) return;
    const c = container.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.bottom > c.bottom) {
      container.scrollTop += r.bottom - c.bottom;
    } else if (r.top < c.top) {
      container.scrollTop -= c.top - r.top;
    }
  }, [frame.index]);

  if (frame.index < 0) {
    return (
      <p className="p-4 font-mono text-sm text-[var(--color-muted)]">
        Press play — or drag the timeline — to watch the run.
      </p>
    );
  }

  const shown = events.slice(0, frame.index + 1);
  // Which earlier events an eviction has already dropped from the live window.
  const evicted = new Set<string>();
  for (const event of shown) {
    if (event.type === "context_evicted") {
      for (const id of event.evictedEventIds) evicted.add(id);
    }
  }

  return (
    <ol className="flex flex-col gap-1.5 p-3">
      {shown.map((event, i) => {
        const isCurrent = i === frame.index;
        const isEviction = event.type === "context_evicted";
        const isEvicted = evicted.has(event.id);
        const meta = EVENT_META[event.type];
        return (
          <li
            key={event.id}
            ref={isCurrent ? currentRef : undefined}
            aria-current={isCurrent ? "step" : undefined}
            className={`replay-item rounded-r border-l-2 py-2 pr-3 pl-3 ${
              isCurrent ? "bg-[var(--color-panel)]" : "bg-transparent"
            } ${isEviction ? "border-dashed" : ""}`}
            style={{ borderLeftColor: meta.color, opacity: isEvicted ? 0.4 : 1 }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="micro-label" style={{ color: meta.color }}>
                EVT {String(i + 1).padStart(2, "0")} · {meta.label}
                {isEvicted ? " · dropped" : ""}
              </span>
              <span className="micro-label shrink-0">
                {isEviction ? "−" : "+"}
                {event.tokens} tok
              </span>
            </div>
            <EventText event={event} />
            {event.annotation && <Annotation text={event.annotation} />}
          </li>
        );
      })}
    </ol>
  );
}

function EventText({ event }: { event: TraceEvent }) {
  if (event.type === "tool_result") {
    return (
      <pre className="mt-1.5 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-[var(--color-muted)]">
        {eventBody(event)}
      </pre>
    );
  }
  // Web retrieval (v1.2): a search shows its query; a fetch shows the fragment
  // it read, or that it couldn't read the page at all (the GEO beat).
  if (event.type === "search") {
    return (
      <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-muted)]">
        Searched &ldquo;{event.query}&rdquo; — {event.results.length} results.
      </p>
    );
  }
  if (event.type === "fetch") {
    if (event.status === "unreadable") {
      return (
        <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-muted)]">
          <span className="text-[var(--color-user)]">Couldn&rsquo;t read</span> {event.url} — the page
          returned no readable text.
        </p>
      );
    }
    return (
      <div className="mt-1.5">
        <p className="font-mono text-[11px] text-[var(--color-muted)]">Read {event.url}</p>
        <p className="mt-1 border-l border-[var(--color-tool)]/40 pl-2 font-mono text-[13px] leading-relaxed text-[var(--color-ink)]">
          {event.extracted}
        </p>
      </div>
    );
  }
  const body = eventBody(event);
  const isVoice = event.type !== "tool_call" && event.type !== "context_evicted";
  return (
    <p
      className={`mt-1.5 font-mono text-[13px] leading-relaxed ${
        isVoice ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"
      }`}
    >
      {body}
    </p>
  );
}

/** Sparse authorial voice-over (v1.1 annotation) — set apart from the log. */
function Annotation({ text }: { text: string }) {
  return (
    <p className="mt-2 flex gap-1.5 border-l border-[var(--color-thinking)]/50 pl-2 font-mono text-[11px] leading-relaxed text-[var(--color-muted)] italic">
      <span aria-hidden="true" className="not-italic text-[var(--color-thinking)]">
        ▸
      </span>
      {text}
    </p>
  );
}
