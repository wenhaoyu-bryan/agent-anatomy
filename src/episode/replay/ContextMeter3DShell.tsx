import { useReplay } from "./store";
import { useGlSlot } from "../gl/glStore";
import { EVENT_META } from "./eventMeta";

const LEGEND = [
  { label: "thinking", color: "var(--color-thinking)" },
  { label: "tools", color: "var(--color-tool)" },
  { label: "user", color: "var(--color-user)" },
  { label: "agent", color: "var(--color-success)" },
] as const;

/**
 * WebGL variant of the S4 context panel: the DOM keeps the numbers (token
 * meter is DOM, synced via the store — PLAN §7) and the tracked canvas
 * renders Scene B in the empty middle.
 */
export function ContextMeter3DShell() {
  const frame = useReplay((s) => s.frame);
  const windowTokens = useReplay((s) => s.windowTokens);
  const slotRef = useGlSlot("s4");

  const pct = Math.min(100, (frame.tokensUsed / windowTokens) * 100);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="relative z-10 flex items-baseline justify-between">
        <span className="micro-label">
          CTX {frame.tokensUsed.toLocaleString("en-US")} / {windowTokens.toLocaleString("en-US")}
        </span>
        <span className="micro-label">{pct.toFixed(1)}%</span>
      </div>

      {/* Scene B (replay mode) tracks this area. */}
      <div ref={slotRef} className="min-h-0 flex-1" aria-hidden="true" />
      <p className="sr-only" role="status">
        Context window {Math.round(pct)} percent full: {frame.tokensUsed} of {windowTokens}{" "}
        tokens used.
      </p>

      <ul className="relative z-10 flex flex-wrap gap-x-4 gap-y-1">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="micro-label">{item.label}</span>
          </li>
        ))}
      </ul>

      {frame.event && (
        <p className="relative z-10 border-t border-[var(--color-hairline)] pt-3 font-mono text-xs text-[var(--color-muted)]">
          <span style={{ color: EVENT_META[frame.event.type].color }}>
            {EVENT_META[frame.event.type].label}
          </span>{" "}
          entered the window · +{frame.event.tokens} tokens
        </p>
      )}
    </div>
  );
}
