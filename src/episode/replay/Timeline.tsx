import { useReplay } from "./store";
import { EVENT_META } from "./eventMeta";

/**
 * Scrubber for the replay. The real control is a native range input
 * (arrow keys step events for free — PLAN §8); the event dots above it
 * are a purely visual telemetry strip.
 */
export function Timeline() {
  const events = useReplay((s) => s.trace.events);
  const frame = useReplay((s) => s.frame);
  const length = useReplay((s) => s.length);
  const seek = useReplay((s) => s.seek);

  const position = frame.index < 0 ? "--" : String(frame.index + 1).padStart(2, "0");
  const valueText =
    frame.event === null
      ? "Before the run starts"
      : `Event ${frame.index + 1} of ${length}: ${EVENT_META[frame.event.type].label.toLowerCase()}`;

  return (
    <div className="min-w-0 flex-1">
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
