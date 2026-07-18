import { Suspense, lazy, useEffect, useState } from "react";
import { useReplay, useReplayApi } from "../episode/replay/store";
import { ContextMeter2D, MeterFooter } from "../episode/replay/ContextMeter2D";
import { supportsWebGL } from "../episode/gl/glStore";

const CondensationCanvas = lazy(() => import("./CondensationCanvas"));

const LEGEND = [
  { label: "thinking", color: "var(--color-thinking)" },
  { label: "tools", color: "var(--color-tool)" },
  { label: "user", color: "var(--color-user)" },
  { label: "agent", color: "var(--color-success)" },
  { label: "compressed", color: "var(--color-muted)" },
] as const;

type Mode = "pending" | "webgl" | "fallback";

/**
 * Episode 03's context panel. When WebGL is available and motion is allowed,
 * the DOM keeps the token numbers and the condensation scene renders between
 * them — the research collapsing into a small grey summary, then the window
 * emptying at the session break. Otherwise it degrades to the same 2D meter the
 * other episodes use, whose bar already drops at compaction and clears at the
 * break, so the lesson survives with no canvas (brief: usable without WebGL).
 */
export function MemoryContextPanel() {
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
            <CondensationCanvas storeApi={storeApi} />
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
        <p className="mt-auto border-t border-[var(--color-hairline)] pt-3 font-mono text-xs text-[var(--color-muted)]">
          <MeterFooter event={frame.event} />
        </p>
      )}
    </div>
  );
}
