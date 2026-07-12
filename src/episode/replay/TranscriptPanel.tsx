import { useEffect, useRef } from "react";
import { useReplayStore } from "./store";
import { EVENT_META, eventBody } from "./eventMeta";
import type { TraceEvent } from "../../trace/schema";

/**
 * The event stream. Only events that have entered the context so far are
 * shown — scrubbing back rewinds the story. Current event is highlighted
 * and kept in view.
 */
export function TranscriptPanel() {
  const frame = useReplayStore((s) => s.frame);
  const currentRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [frame.index]);

  if (frame.contextItems.length === 0) {
    return (
      <p className="p-4 font-mono text-sm text-[var(--color-muted)]">
        Press play — or drag the timeline — to watch the run.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5 p-3">
      {frame.contextItems.map((event, i) => {
        const isCurrent = i === frame.index;
        return (
          <li
            key={event.id}
            ref={isCurrent ? currentRef : undefined}
            aria-current={isCurrent ? "step" : undefined}
            className={`replay-item rounded-r border-l-2 py-2 pr-3 pl-3 transition-colors duration-200 ${
              isCurrent ? "bg-[var(--color-panel)]" : "bg-transparent"
            }`}
            style={{ borderLeftColor: EVENT_META[event.type].color }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="micro-label" style={{ color: EVENT_META[event.type].color }}>
                EVT {String(i + 1).padStart(2, "0")} · {EVENT_META[event.type].label}
              </span>
              <span className="micro-label shrink-0">+{event.tokens} tok</span>
            </div>
            <EventText event={event} />
          </li>
        );
      })}
    </ol>
  );
}

function EventText({ event }: { event: TraceEvent }) {
  const body = eventBody(event);
  if (event.type === "tool_result") {
    return (
      <pre className="mt-1.5 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-[var(--color-muted)]">
        {body}
      </pre>
    );
  }
  const isVoice = event.type !== "tool_call";
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
