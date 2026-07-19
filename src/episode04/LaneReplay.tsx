import { useState, type ReactNode } from "react";
import { ReplayProvider } from "../episode/replay/store";
import { Controls } from "../episode/replay/Controls";
import { Timeline, type TimelineMarker } from "../episode/replay/Timeline";
import { LoopIndicator } from "../episode/replay/LoopIndicator";
import { TranscriptPanel } from "../episode/replay/TranscriptPanel";
import { LaneMeters } from "./LaneMeters";
import { PlanPanel } from "./PlanPanel";
import type { Trace } from "../trace/schema";

type TabId = "transcript" | "windows" | "plan";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "transcript", label: "Transcript" },
  { id: "windows", label: "Windows" },
  { id: "plan", label: "The plan" },
];

// The coordination beats worth finding on the timeline: the snag (venue's first
// pick is over budget) and the lead's adaptation (it re-briefs venue). Resolved
// by event id so they survive an edit to the trace.
const MARKER_SPEC: Array<{ id: string; label: string }> = [
  { id: "e16", label: "over budget" },
  { id: "e21", label: "re-brief" },
];

/**
 * S5 — the replay showpiece (Episode 04). The shared three-panel rig, its
 * context panel now a grid of windows (lead + three helpers). Play it and watch
 * one task fan out into parallel windows, hit a snag, adapt, and converge into
 * one plan. User-driven (buttons + scrubber + autoplay), never tied to scroll.
 * Desktop shows all three panels; mobile tabs between them. Fully usable with no
 * WebGL — the fan-out scene (S3) is the WebGL dramatization of this same grid.
 */
export function LaneReplay({ trace }: { trace: Trace }) {
  const [tab, setTab] = useState<TabId>("transcript");

  const markers: TimelineMarker[] = MARKER_SPEC.map((spec) => ({
    index: trace.events.findIndex((event) => event.id === spec.id),
    label: spec.label,
  })).filter((marker) => marker.index >= 0);

  return (
    <ReplayProvider trace={trace}>
      <section id="replay" aria-labelledby="replay-title" className="px-4 py-24 md:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <p className="micro-label">The replay</p>
          <h2
            id="replay-title"
            className="mt-3 text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Watch one agent split into a team
          </h2>
          <p className="mt-3 max-w-xl text-[var(--color-muted)]">
            A scripted run, played back event by event. Step through it — or press play and watch the
            lead hand out three briefs, the helper windows fill in parallel, one come back over budget,
            and the lead adapt and compose the final plan.
          </p>

          <div className="mt-10 flex flex-col gap-4 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/60 p-4 md:flex-row md:items-start md:gap-6 md:p-5">
            <div className="flex items-center justify-between gap-4 md:justify-start">
              <Controls />
              <LoopIndicator />
            </div>
            <Timeline markers={markers} />
          </div>

          {/* Mobile tab bar (hidden on md+ where all three panels show). */}
          <div
            role="tablist"
            aria-label="Replay panels"
            className="mt-4 flex gap-2 md:hidden"
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const delta = e.key === "ArrowRight" ? 1 : -1;
              const current = TABS.findIndex((t) => t.id === tab);
              const next = TABS[(current + delta + TABS.length) % TABS.length]!;
              setTab(next.id);
              document.getElementById(`tab-${next.id}`)?.focus();
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`pressable flex-1 rounded border px-3 py-2 font-mono text-xs tracking-wide uppercase ${
                  tab === t.id
                    ? "border-[var(--color-tool)] bg-[var(--color-panel)] text-[var(--color-ink)]"
                    : "border-[var(--color-hairline)] text-[var(--color-muted)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Desktop: the shared 3-across grid — transcript | windows | plan. */}
          <div className="mt-4 grid gap-4 md:grid-cols-[1.15fr_0.85fr_1fr]">
            <Panel id="transcript" title="Transcript" activeTab={tab} scroll>
              <TranscriptPanel />
            </Panel>
            <Panel id="windows" title="Context windows" activeTab={tab}>
              <LaneMeters />
            </Panel>
            <Panel id="plan" title="The plan" activeTab={tab} scroll>
              <PlanPanel />
            </Panel>
          </div>
        </div>
      </section>
    </ReplayProvider>
  );
}

function Panel({
  id,
  title,
  activeTab,
  scroll = false,
  children,
}: {
  id: TabId;
  title: string;
  activeTab: TabId;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={`${activeTab === id ? "flex" : "hidden"} h-[520px] flex-col overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 md:flex`}
    >
      <div className="border-b border-[var(--color-hairline)] px-4 py-2.5">
        <span className="micro-label">{title}</span>
      </div>
      <div data-replay-scroll className={`min-h-0 flex-1 ${scroll ? "overflow-y-auto" : ""}`}>
        {children}
      </div>
    </div>
  );
}
