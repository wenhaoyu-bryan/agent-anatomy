import { Suspense, lazy, useEffect, useState } from "react";
import { useReplay, useReplayApi } from "../episode/replay/store";
import { EVENT_META } from "../episode/replay/eventMeta";
import { ContextMeter2D } from "../episode/replay/ContextMeter2D";
import { supportsWebGL } from "../episode/gl/glStore";

const EvictionCanvas = lazy(() => import("./EvictionCanvas"));

const LEGEND = [
  { label: "thinking", color: "var(--color-thinking)" },
  { label: "tools", color: "var(--color-tool)" },
  { label: "user", color: "var(--color-user)" },
  { label: "agent", color: "var(--color-success)" },
] as const;

type Mode = "pending" | "webgl" | "fallback";

/**
 * F2's context panel. When WebGL is available and motion is allowed, the DOM
 * keeps the token numbers (PLAN §7) and the particle eviction scene renders in
 * the middle. Otherwise it degrades to the same 2D meter the other vignettes
 * use — whose bar already shrinks at the eviction — so the lesson survives with
 * no canvas.
 */
export function F2ContextPanel() {
  const [mode, setMode] = useState<Mode>("pending");
  const [idle, setIdle] = useState(false);
  const frame = useReplay((s) => s.frame);
  const windowTokens = useReplay((s) => s.windowTokens);
  const storeApi = useReplayApi();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(!reduced && supportsWebGL() ? "webgl" : "fallback");
  }, []);

  // Defer the three.js parse until the main thread is idle (§8 perf).
  useEffect(() => {
    if (mode !== "webgl") return;
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setIdle(true), 1200);
    return () => clearTimeout(id);
  }, [mode]);

  if (mode !== "webgl") return <ContextMeter2D />;

  const pct = Math.min(100, (frame.tokensUsed / windowTokens) * 100);
  const evicting = frame.event?.type === "context_evicted";

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <span className="micro-label">
          CTX {frame.tokensUsed.toLocaleString("en-US")} /{" "}
          {windowTokens.toLocaleString("en-US")}
        </span>
        <span className="micro-label">{pct.toFixed(1)}%</span>
      </div>

      <div className="relative h-[340px] w-full overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)]">
        {idle && (
          <Suspense fallback={null}>
            <EvictionCanvas storeApi={storeApi} />
          </Suspense>
        )}
      </div>
      <p className="sr-only" role="status">
        Context window {Math.round(pct)} percent full: {frame.tokensUsed} of {windowTokens} tokens
        used.
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

      {frame.event && (
        <p className="border-t border-[var(--color-hairline)] pt-3 font-mono text-xs text-[var(--color-muted)]">
          {evicting && frame.event.type === "context_evicted" ? (
            <>
              <span style={{ color: EVENT_META.context_evicted.color }}>
                {frame.event.evictedEventIds.length} item
                {frame.event.evictedEventIds.length === 1 ? "" : "s"}
              </span>{" "}
              left the window · −{frame.event.tokens} tokens
            </>
          ) : (
            <>
              <span style={{ color: EVENT_META[frame.event.type].color }}>
                {EVENT_META[frame.event.type].label}
              </span>{" "}
              entered the window · +{frame.event.tokens} tokens
            </>
          )}
        </p>
      )}
    </div>
  );
}
