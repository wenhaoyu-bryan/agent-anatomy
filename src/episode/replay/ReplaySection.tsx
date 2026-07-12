import { useState } from "react";
import { Timeline } from "./Timeline";
import { Controls } from "./Controls";
import { TranscriptPanel } from "./TranscriptPanel";
import { ContextMeter2D } from "./ContextMeter2D";
import { ArtifactPanel } from "./ArtifactPanel";

type TabId = "transcript" | "context" | "page";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "transcript", label: "Transcript" },
  { id: "context", label: "Context" },
  { id: "page", label: "The page" },
];

/**
 * S4 — the replay (PLAN §5). User-driven: buttons + scrubber + autoplay,
 * never tied to scroll. Desktop: three panels. Mobile: tabbed panels with
 * the timeline persistent. Pinning arrives with scroll orchestration in M4.
 */
export function ReplaySection() {
  const [tab, setTab] = useState<TabId>("transcript");

  return (
    <section id="replay" aria-labelledby="replay-title" className="px-4 py-24 md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <p className="micro-label">The replay</p>
        <h2
          id="replay-title"
          className="mt-3 text-3xl font-medium tracking-tight md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Watch an agent fix a real page
        </h2>
        <p className="mt-3 max-w-xl text-[var(--color-muted)]">
          A scripted run, played back event by event. Step through it — or press play and watch
          the page heal.
        </p>

        <div className="mt-10 flex flex-col gap-4 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/60 p-4 md:flex-row md:items-start md:gap-6 md:p-5">
          <Controls />
          <Timeline />
        </div>

        {/* Mobile tab bar (hidden on md+ where all three panels show). */}
        <div role="tablist" aria-label="Replay panels" className="mt-4 flex gap-2 md:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
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
          <Panel id="transcript" title="Transcript" activeTab={tab}>
            <TranscriptPanel />
          </Panel>
          <Panel id="context" title="Context window" activeTab={tab}>
            <ContextMeter2D />
          </Panel>
          <Panel id="page" title="The page" activeTab={tab}>
            <ArtifactPanel />
          </Panel>
        </div>
      </div>
    </section>
  );
}

function Panel({
  id,
  title,
  activeTab,
  children,
}: {
  id: TabId;
  title: string;
  activeTab: TabId;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={`${activeTab === id ? "flex" : "hidden"} h-[480px] flex-col overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 md:flex`}
    >
      <div className="border-b border-[var(--color-hairline)] px-4 py-2.5">
        <span className="micro-label">{title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
