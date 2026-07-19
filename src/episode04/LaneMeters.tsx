import { useEffect, useState } from "react";
import { useReplay } from "../episode/replay/store";
import { EVENT_META } from "../episode/replay/eventMeta";
import type { LaneState } from "../trace/replay";

/**
 * The context panel for Episode 04: not one window but a grid of them — the
 * lead plus one per helper (schema 1.4 `frame.lanes`). Each fills independently;
 * the lane the current event just changed is highlighted. This is the whole
 * lesson made spatial — three small windows filling in parallel where one would
 * have drowned. DOM only, so it works with no WebGL (the fan-out scene in S3 is
 * the WebGL dramatization of the same thing).
 *
 * Palette (§6): lanes are told apart by name and grid position, never by hue —
 * the bars keep the fixed event-type colours, and the active lane gets the one
 * cyan accent. Desktop shows all four; mobile switches between them.
 */
export function LaneMeters() {
  const lanes = useReplay((s) => s.frame.lanes);
  const activeAgentId = useReplay((s) => s.frame.activeAgentId);
  const index = useReplay((s) => s.frame.index);
  const [selected, setSelected] = useState(activeAgentId);

  // On mobile the panel shows one lane at a time; follow the action so the
  // visible window is whichever one the current event just changed.
  useEffect(() => {
    setSelected(activeAgentId);
  }, [activeAgentId, index]);

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        Four windows, not one. The <span className="text-[var(--color-ink)]">lead</span> keeps a small
        window and hands each helper a fresh one. No single window has to hold everything.
      </p>

      {/* Mobile lane switcher — desktop shows all four at once. */}
      <div role="tablist" aria-label="Agent windows" className="flex flex-wrap gap-1.5 md:hidden">
        {lanes.map((lane) => {
          const on = selected === lane.agentId;
          return (
            <button
              key={lane.agentId}
              role="tab"
              aria-selected={on}
              onClick={() => setSelected(lane.agentId)}
              className={`pressable rounded border px-2 py-1 font-mono text-[11px] tracking-wide uppercase ${
                on
                  ? "border-[var(--color-tool)] text-[var(--color-ink)]"
                  : "border-[var(--color-hairline)] text-[var(--color-muted)]"
              }`}
            >
              {lane.name}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
        {lanes.map((lane) => (
          <LaneCell
            key={lane.agentId}
            lane={lane}
            active={lane.agentId === activeAgentId}
            visibleOnMobile={selected === lane.agentId}
          />
        ))}
      </div>
    </div>
  );
}

function LaneCell({
  lane,
  active,
  visibleOnMobile,
}: {
  lane: LaneState;
  active: boolean;
  visibleOnMobile: boolean;
}) {
  const pct = Math.min(100, (lane.tokensUsed / lane.window) * 100);
  const isLead = lane.agentId === "lead";
  return (
    <div
      className={`${visibleOnMobile ? "flex" : "hidden"} flex-col gap-2 rounded-md border p-3 transition-colors md:flex`}
      style={{
        borderColor: active ? "var(--color-tool)" : "var(--color-hairline)",
        boxShadow: active ? "0 0 0 1px var(--color-tool)" : "none",
        backgroundColor: active ? "color-mix(in srgb, var(--color-panel) 60%, transparent)" : "transparent",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="micro-label"
          style={{ color: active ? "var(--color-ink)" : "var(--color-muted)" }}
        >
          {isLead ? "Lead" : lane.name}
        </span>
        {active && <span className="micro-label text-[var(--color-tool)]">active</span>}
      </div>

      <div
        role="img"
        aria-label={`${lane.name} window: ${lane.tokensUsed} of ${lane.window} tokens used`}
        className="flex h-3 w-full overflow-hidden rounded-sm border border-[var(--color-hairline)] bg-[var(--color-canvas)]"
      >
        {lane.contextItems.map((event) => (
          <div
            key={event.id}
            className="h-full"
            style={{
              width: `${(event.tokens / lane.window) * 100}%`,
              backgroundColor: EVENT_META[event.type].color,
              transition: "width 300ms var(--ease-mechanical)",
            }}
          />
        ))}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="micro-label">
          CTX {lane.tokensUsed.toLocaleString("en-US")}/{lane.window.toLocaleString("en-US")}
        </span>
        <span className="micro-label">{pct.toFixed(0)}%</span>
      </div>

      {lane.contextItems.length === 0 && !isLead && (
        <p className="font-mono text-[11px] text-[var(--color-muted)]">waiting for a brief…</p>
      )}
    </div>
  );
}
