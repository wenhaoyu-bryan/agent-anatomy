import { useState, type ReactNode } from "react";
import { ReplayProvider } from "../episode/replay/store";
import { Controls } from "../episode/replay/Controls";
import { Timeline } from "../episode/replay/Timeline";
import { LoopIndicator } from "../episode/replay/LoopIndicator";
import { TranscriptPanel } from "../episode/replay/TranscriptPanel";
import { MemoryContextPanel } from "./MemoryContextPanel";
import { MemoryPanel } from "./MemoryPanel";
import type { Trace } from "../trace/schema";

type TabId = "transcript" | "context" | "memory";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "transcript", label: "Transcript" },
  { id: "context", label: "Context" },
  { id: "memory", label: "Memory" },
];

/**
 * S5 — the replay showpiece (Episode 03). Episode 01's three-panel rig, with
 * the third panel now the MEMORY layer (files that live outside the window).
 * The dramatic beat is the session break: play through it and the context meter
 * empties to nothing while the memory file stays put. User-driven (buttons +
 * scrubber + autoplay), never tied to scroll. The context panel renders the
 * WebGL condensation + window-emptying scene, degrading to the 2D meter when
 * WebGL is unavailable or motion is reduced.
 */
export function MemoryReplay({ trace }: { trace: Trace }) {
  const [tab, setTab] = useState<TabId>("transcript");

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
            Watch it run out of room — and keep going anyway
          </h2>
          <p className="mt-3 max-w-xl text-[var(--color-muted)]">
            One task across two sessions. Play it: the window fills, the agent compresses its research
            and saves notes, the session ends — and then, in an empty window the next day, it reads
            those notes back and finishes.
          </p>

          <div className="mt-10 flex flex-col gap-4 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/60 p-4 md:flex-row md:items-start md:gap-6 md:p-5">
            <div className="flex items-center justify-between gap-4 md:justify-start">
              <Controls />
              <LoopIndicator />
            </div>
            <Timeline />
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

          <div className="mt-4 grid gap-4 md:grid-cols-[1.15fr_0.85fr_1fr]">
            <Panel id="transcript" title="Transcript" activeTab={tab} scroll>
              <TranscriptPanel />
            </Panel>
            <Panel id="context" title="Context window" activeTab={tab}>
              <MemoryContextPanel />
            </Panel>
            <Panel id="memory" title="Memory (files)" activeTab={tab} scroll>
              <MemoryPanel />
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
