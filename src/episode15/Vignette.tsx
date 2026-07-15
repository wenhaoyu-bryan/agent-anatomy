import type { ReactNode } from "react";
import type { Trace } from "../trace/schema";
import { ReplayProvider } from "../episode/replay/store";
import { Controls } from "../episode/replay/Controls";
import { Timeline } from "../episode/replay/Timeline";
import { LoopIndicator } from "../episode/replay/LoopIndicator";
import { TranscriptPanel } from "../episode/replay/TranscriptPanel";
import { ContextMeter2D } from "../episode/replay/ContextMeter2D";
import { ArtifactView } from "./ArtifactView";
import { F2ContextPanel } from "./F2ContextPanel";

export type PanelSpec =
  | { type: "meter" }
  | { type: "eviction" }
  | { type: "page"; url: string };

interface VignetteProps {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  trace: Trace;
  /** Panels shown beside the transcript. One or two; never the full S4 rig. */
  panels: PanelSpec[];
}

/**
 * A single failure-mode mini-replay (Episode 1.5). Its own ReplayProvider so
 * each vignette's playhead is independent, driving the same reusable replay
 * components in a compact transcript + aux-panel layout.
 */
export function Vignette({ id, eyebrow, title, lede, trace, panels }: VignetteProps) {
  return (
    <ReplayProvider trace={trace}>
      <section id={id} aria-labelledby={`${id}-title`} className="reveal px-4 py-20 md:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <p className="micro-label">{eyebrow}</p>
          <h2
            id={`${id}-title`}
            className="mt-3 text-2xl font-medium tracking-tight text-balance md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-muted)]">{lede}</p>

          <div className="mt-8 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/60 p-4 md:p-5">
            <div className="flex items-center justify-between gap-4 md:justify-start md:gap-6">
              <Controls />
              <LoopIndicator />
            </div>
            <div className="mt-4">
              <Timeline />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <PanelShell title="Transcript" scroll>
              <TranscriptPanel />
            </PanelShell>
            <div className="flex flex-col gap-4">
              {panels.map((panel, i) => {
                if (panel.type === "meter") {
                  return (
                    <PanelShell key={i} title="Context window">
                      <ContextMeter2D />
                    </PanelShell>
                  );
                }
                if (panel.type === "eviction") {
                  return (
                    <PanelShell key={i} title="Context window">
                      <F2ContextPanel />
                    </PanelShell>
                  );
                }
                return (
                  <PanelShell key={i} title="The page">
                    <ArtifactView url={panel.url} />
                  </PanelShell>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </ReplayProvider>
  );
}

function PanelShell({
  title,
  children,
  scroll = false,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40">
      <div className="border-b border-[var(--color-hairline)] px-4 py-2.5">
        <span className="micro-label">{title}</span>
      </div>
      <div
        data-replay-scroll
        className={`min-h-0 ${scroll ? "max-h-[440px] overflow-y-auto" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
