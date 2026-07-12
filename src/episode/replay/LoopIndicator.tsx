import { useReplayStore } from "./store";

type LoopPhase = "think" | "act" | "observe" | "idle";

const PHASE_META: Record<LoopPhase, { label: string; color: string }> = {
  think: { label: "THINK", color: "var(--color-thinking)" },
  act: { label: "ACT", color: "var(--color-tool)" },
  observe: { label: "OBSERVE", color: "var(--color-success)" },
  idle: { label: "STANDBY", color: "var(--color-muted)" },
};

// On the tiny ring: think top, act right, observe left.
const DOT_POS: Record<Exclude<LoopPhase, "idle">, { x: number; y: number }> = {
  think: { x: 12, y: 4.5 },
  act: { x: 18.5, y: 15.75 },
  observe: { x: 5.5, y: 15.75 },
};

function phaseOf(type: string | undefined): LoopPhase {
  switch (type) {
    case "thinking":
    case "assistant_message":
      return "think";
    case "tool_call":
      return "act";
    case "tool_result":
    case "user_message":
      return "observe";
    default:
      return "idle";
  }
}

/**
 * The S2 loop motif, miniaturized: a live state indicator showing which
 * phase of think → act → observe the agent is in at the current event
 * (PLAN §5 S2 — the page's recurring visual signature).
 */
export function LoopIndicator() {
  const event = useReplayStore((s) => s.frame.event);
  const phase = phaseOf(event?.type);
  const meta = PHASE_META[phase];

  return (
    <div className="flex items-center gap-2" title={`Loop phase: ${meta.label.toLowerCase()}`}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="var(--color-hairline)" strokeWidth="1.5" />
        {(Object.keys(DOT_POS) as Array<keyof typeof DOT_POS>).map((p) => (
          <circle
            key={p}
            cx={DOT_POS[p].x}
            cy={DOT_POS[p].y}
            r={phase === p ? 3 : 1.75}
            fill={phase === p ? PHASE_META[p].color : "var(--color-hairline)"}
            style={{ transition: "r 200ms var(--ease-mechanical), fill 200ms ease" }}
          />
        ))}
      </svg>
      <span className="micro-label w-16" style={{ color: meta.color }} aria-live="polite">
        {meta.label}
      </span>
    </div>
  );
}
