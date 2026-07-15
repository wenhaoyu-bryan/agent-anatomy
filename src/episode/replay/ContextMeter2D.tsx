import { useReplay } from "./store";
import { EVENT_META } from "./eventMeta";

const LEGEND = [
  { label: "thinking", color: "var(--color-thinking)" },
  { label: "tools", color: "var(--color-tool)" },
  { label: "user", color: "var(--color-user)" },
  { label: "agent", color: "var(--color-success)" },
] as const;

/**
 * Temporary 2D context meter (M2). Replaced by the WebGL particle scene in
 * M3, after which this component stays on as the reduced-motion / no-WebGL
 * fallback (PLAN §7).
 */
export function ContextMeter2D() {
  const frame = useReplay((s) => s.frame);
  const windowTokens = useReplay((s) => s.windowTokens);

  const pct = Math.min(100, (frame.tokensUsed / windowTokens) * 100);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <span className="micro-label">
          CTX {frame.tokensUsed.toLocaleString("en-US")} / {windowTokens.toLocaleString("en-US")}
        </span>
        <span className="micro-label">{pct.toFixed(1)}%</span>
      </div>

      <div
        role="img"
        aria-label={`Context window: ${frame.tokensUsed} of ${windowTokens} tokens used`}
        className="flex h-4 w-full overflow-hidden rounded-sm border border-[var(--color-hairline)] bg-[var(--color-canvas)]"
      >
        {frame.contextItems.map((event) => (
          <div
            key={event.id}
            className="h-full"
            style={{
              width: `${(event.tokens / windowTokens) * 100}%`,
              backgroundColor: EVENT_META[event.type].color,
              transition: "width 300ms var(--ease-mechanical)",
            }}
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        Everything the agent knows right now must fit in this window. Every message, every thought,
        every file it reads — each one spends budget.
      </p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
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

      {frame.event &&
        (frame.event.type === "context_evicted" ? (
          <p className="mt-auto border-t border-[var(--color-hairline)] pt-3 font-mono text-xs text-[var(--color-muted)]">
            <span style={{ color: EVENT_META.context_evicted.color }}>
              {frame.event.evictedEventIds.length} item
              {frame.event.evictedEventIds.length === 1 ? "" : "s"}
            </span>{" "}
            left the window · −{frame.event.tokens} tokens
          </p>
        ) : (
          <p className="mt-auto border-t border-[var(--color-hairline)] pt-3 font-mono text-xs text-[var(--color-muted)]">
            <span style={{ color: EVENT_META[frame.event.type].color }}>
              {EVENT_META[frame.event.type].label}
            </span>{" "}
            entered the window · +{frame.event.tokens} tokens
          </p>
        ))}
    </div>
  );
}
