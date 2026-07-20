import { useReplay } from "./store";
import { EVENT_META } from "./eventMeta";
import type { TraceEvent } from "../../trace/schema";

const SESSION_LETTERS = ["A", "B", "C", "D", "E"];

/**
 * Split the run into sessions at each `session_break` (v1.3). A break ends its
 * session; the caption on the next session is the break's label ("The next
 * day"). Traces with no break yield a single unlabeled segment, so every prior
 * episode renders exactly as before.
 */
function computeSegments(events: TraceEvent[]) {
  const bounds = [-1];
  events.forEach((event, i) => {
    if (event.type === "session_break") bounds.push(i);
  });
  bounds.push(events.length - 1);
  return bounds.slice(0, -1).map((start, k) => {
    const end = bounds[k + 1]!; // last event index of this segment (inclusive)
    const breakEvent = start >= 0 ? events[start] : null;
    return {
      startIndex: start + 1,
      endIndex: end,
      count: end - start,
      label: `Session ${SESSION_LETTERS[k] ?? k + 1}`,
      caption: breakEvent && breakEvent.type === "session_break" ? breakEvent.label : null,
    };
  });
}

/** A labelled point of interest on the timeline (v1.4) — e.g. the snag beat. */
export interface TimelineMarker {
  index: number;
  label: string;
}

/**
 * Scrubber for the replay. The real control is a native range input
 * (arrow keys step events for free — PLAN §8); the event dots above it
 * are a purely visual telemetry strip. When the run spans multiple sessions
 * (v1.3), a label row above the strip marks each session. Optional `markers`
 * flag key beats (v1.4) — small buttons that seek to that event.
 */
export function Timeline({ markers }: { markers?: TimelineMarker[] } = {}) {
  const events = useReplay((s) => s.trace.events);
  const frame = useReplay((s) => s.frame);
  const length = useReplay((s) => s.length);
  const seek = useReplay((s) => s.seek);

  const position = frame.index < 0 ? "--" : String(frame.index + 1).padStart(2, "0");
  const valueText =
    frame.event === null
      ? "Before the run starts"
      : `Event ${frame.index + 1} of ${length}: ${EVENT_META[frame.event.type].label.toLowerCase()}`;

  const segments = computeSegments(events);

  return (
    <div className="min-w-0 flex-1">
      {segments.length > 1 && (
        <div aria-hidden="true" className="mb-1.5 flex gap-1">
          {segments.map((seg, k) => {
            const isCurrent = frame.index >= seg.startIndex && frame.index <= seg.endIndex;
            return (
              <div
                key={k}
                className={`flex min-w-0 items-baseline gap-1.5 border-l-2 pl-1.5 ${
                  k === 0 ? "" : ""
                }`}
                style={{ flexGrow: seg.count, borderLeftColor: isCurrent ? "var(--color-tool)" : "var(--color-hairline)" }}
              >
                <span
                  className="micro-label shrink-0"
                  style={{ color: isCurrent ? "var(--color-ink)" : "var(--color-muted)" }}
                >
                  {seg.label}
                </span>
                {seg.caption && (
                  <span className="truncate font-mono text-[10px] text-[var(--color-muted)]">
                    · {seg.caption}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {markers && markers.length > 0 && length > 1 && (
        <div className="relative mb-1 h-4">
          {markers.map((marker) => {
            const left = (marker.index / (length - 1)) * 100;
            const reached = frame.index >= marker.index;
            return (
              <button
                key={marker.index}
                type="button"
                onClick={() => seek(marker.index)}
                title={`Jump to: ${marker.label}`}
                className="pressable absolute top-0 -translate-x-1/2 rounded-sm border px-1.5 font-mono text-[10px] tracking-wide whitespace-nowrap uppercase transition-colors"
                style={{
                  left: `${left}%`,
                  borderColor: reached ? "var(--color-tool)" : "var(--color-hairline)",
                  color: reached ? "var(--color-ink)" : "var(--color-muted)",
                }}
              >
                {marker.label}
              </button>
            );
          })}
        </div>
      )}
      <div aria-hidden="true" className="relative mx-[2px] flex items-center justify-between">
        <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--color-hairline)]" />
        {events.map((event, i) => (
          <span
            key={event.id}
            className="relative size-[7px] rounded-full border transition-colors duration-200"
            style={
              i <= frame.index
                ? {
                    backgroundColor: EVENT_META[event.type].color,
                    borderColor: EVENT_META[event.type].color,
                  }
                : {
                    backgroundColor: "var(--color-canvas)",
                    borderColor: "var(--color-hairline)",
                  }
            }
          />
        ))}
      </div>
      <input
        type="range"
        min={-1}
        max={length - 1}
        step={1}
        value={frame.index}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Replay timeline"
        aria-valuetext={valueText}
        className="mt-2 block h-4 w-full cursor-pointer accent-[var(--color-tool)]"
      />
      <div className="mt-1 flex justify-between">
        <span className="micro-label">
          EVT {position}/{length}
        </span>
        <span className="micro-label">{frame.event ? EVENT_META[frame.event.type].label : "STANDBY"}</span>
      </div>
    </div>
  );
}
