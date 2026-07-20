import { useEffect, useRef } from "react";
import { useReplay } from "./store";
import { EVENT_META, eventBody } from "./eventMeta";
import type { TraceEvent } from "../../trace/schema";

/**
 * The event stream, chronological. Events up to the current index are shown —
 * scrubbing back rewinds the story. Items an eviction has dropped from the
 * window stay in the log but dimmed (they happened; they're just no longer
 * live), and a `context_evicted` marker records the moment. The current event
 * is highlighted and kept in view.
 */
export function TranscriptPanel() {
  const frame = useReplay((s) => s.frame);
  const events = useReplay((s) => s.trace.events);
  const agentDefs = useReplay((s) => s.trace.agents);
  const currentRef = useRef<HTMLLIElement>(null);
  const agentName = new Map((agentDefs ?? []).map((agent) => [agent.agentId, agent.name]));

  // Keep the current event in view by scrolling ONLY the panel. scrollIntoView
  // would climb to the document and yank the page while the reader is
  // elsewhere — scroll-jacking, which §8 forbids.
  useEffect(() => {
    const item = currentRef.current;
    const container = item?.closest<HTMLElement>("[data-replay-scroll]");
    if (!item || !container) return;
    const c = container.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.bottom > c.bottom) {
      container.scrollTop += r.bottom - c.bottom;
    } else if (r.top < c.top) {
      container.scrollTop -= c.top - r.top;
    }
  }, [frame.index]);

  if (frame.index < 0) {
    return (
      <p className="p-4 font-mono text-sm text-[var(--color-muted)]">
        Press play — or drag the timeline — to watch the run.
      </p>
    );
  }

  const shown = events.slice(0, frame.index + 1);
  // What's still live across ALL lanes right now (the engine folds evictions,
  // compaction, session breaks, and per-agent resets). An event is dimmed only
  // if it's live in no lane — e.g. a helper's first attempt after its window was
  // reset by a re-brief. For a single-agent trace this is just the lead window,
  // unchanged. Markers aren't window items, so they're never dimmed.
  const liveIds = new Set(frame.lanes.flatMap((lane) => lane.contextItems.map((event) => event.id)));

  return (
    <ol className="flex flex-col gap-1.5 p-3">
      {shown.map((event, i) => {
        const isCurrent = i === frame.index;
        const isMarker = event.type === "context_evicted" || event.type === "session_break";
        const isDropped = !isMarker && !liveIds.has(event.id);
        const meta = EVENT_META[event.type];
        // Which lane this event belongs to (v1.4) — a small tick tells helper
        // work apart from the lead's, and nests it. Null for the lead / pre-1.4.
        const laneId =
          event.type === "agent_spawn"
            ? event.spawnedAgentId
            : (event.agentId ?? "lead");
        const laneName = agentName.get(laneId) ?? laneId;
        const laneTick =
          event.type === "agent_spawn"
            ? `→ ${agentName.get(event.spawnedAgentId) ?? event.spawnedAgentId}`
            : event.type === "agent_result"
              ? `${laneName} →`
              : laneId !== "lead"
                ? laneName
                : null;
        const isHelperWork =
          laneId !== "lead" && event.type !== "agent_spawn" && event.type !== "agent_result";
        return (
          <li
            key={event.id}
            ref={isCurrent ? currentRef : undefined}
            aria-current={isCurrent ? "step" : undefined}
            className={`replay-item rounded-r border-l-2 py-2 pr-3 pl-3 ${
              isCurrent ? "bg-[var(--color-panel)]" : "bg-transparent"
            } ${isMarker ? "border-dashed" : ""} ${isHelperWork ? "ml-4" : ""}`}
            style={{ borderLeftColor: meta.color, opacity: isDropped ? 0.4 : 1 }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="micro-label" style={{ color: meta.color }}>
                  EVT {String(i + 1).padStart(2, "0")} · {meta.label}
                  {isDropped ? " · dropped" : ""}
                </span>
                {laneTick && (
                  <span className="shrink-0 rounded-sm border border-[var(--color-hairline)] px-1.5 font-mono text-[10px] tracking-wide text-[var(--color-muted)] uppercase">
                    {laneTick}
                  </span>
                )}
              </span>
              <span className="micro-label shrink-0">
                <TokenDelta event={event} />
              </span>
            </div>
            <EventText event={event} />
            {event.annotation && <Annotation text={event.annotation} />}
          </li>
        );
      })}
    </ol>
  );
}

/** The per-event budget change: additive events add, evictions and compaction free. */
function TokenDelta({ event }: { event: TraceEvent }) {
  if (event.type === "context_evicted") return <>−{event.tokens} tok</>;
  if (event.type === "compaction") return <>−{event.tokensBefore - event.tokens} tok</>;
  if (event.type === "session_break") return <>cleared</>;
  return <>+{event.tokens} tok</>;
}

function EventText({ event }: { event: TraceEvent }) {
  if (event.type === "tool_result") {
    return (
      <pre className="mt-1.5 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-[var(--color-muted)]">
        {eventBody(event)}
      </pre>
    );
  }
  // Web retrieval (v1.2): a search shows its query; a fetch shows the fragment
  // it read, or that it couldn't read the page at all (the GEO beat).
  if (event.type === "search") {
    return (
      <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-muted)]">
        Searched &ldquo;{event.query}&rdquo; — {event.results.length} results.
      </p>
    );
  }
  if (event.type === "fetch") {
    if (event.status === "unreadable") {
      return (
        <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-muted)]">
          <span className="text-[var(--color-user)]">Couldn&rsquo;t read</span> {event.url} — the page
          returned no readable text.
        </p>
      );
    }
    return (
      <div className="mt-1.5">
        <p className="font-mono text-[11px] text-[var(--color-muted)]">Read {event.url}</p>
        <p className="mt-1 border-l border-[var(--color-tool)]/40 pl-2 font-mono text-[13px] leading-relaxed text-[var(--color-ink)]">
          {event.extracted}
        </p>
      </div>
    );
  }
  // Memory (v1.3).
  if (event.type === "compaction") {
    return (
      <div className="mt-1.5">
        <p className="font-mono text-[11px] text-[var(--color-muted)]">
          Compressed {event.replacesEventIds.length} items into a summary — smaller, and lossy.
        </p>
        <p className="mt-1 border-l border-[var(--color-muted)]/50 pl-2 font-mono text-[13px] leading-relaxed text-[var(--color-muted)] italic">
          {event.summary}
        </p>
      </div>
    );
  }
  if (event.type === "session_break") {
    return (
      <div className="mt-1.5 flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-hairline)]" />
        <span className="font-mono text-[11px] tracking-wide text-[var(--color-muted)] uppercase">
          {event.label} — new session, empty window
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-hairline)]" />
      </div>
    );
  }
  if (event.type === "memory_write") {
    return (
      <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-ink)]">
        Saved a durable note to <span className="text-[var(--color-tool)]">{event.path}</span> — it
        outlives this window.
      </p>
    );
  }
  if (event.type === "memory_read") {
    return (
      <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--color-ink)]">
        Read <span className="text-[var(--color-tool)]">{event.path}</span> back into the window — the
        notes are context again.
      </p>
    );
  }
  // Multi-agent (v1.4): a spawn is the brief the lead hands over — it becomes the
  // helper's whole starting context. A result is the one condensed summary the
  // helper hands back — lossy, so it reads like a compaction digest.
  if (event.type === "agent_spawn") {
    return (
      <div className="mt-1.5">
        <p className="font-mono text-[11px] text-[var(--color-muted)]">
          The brief — the helper&rsquo;s window starts empty except for this.
        </p>
        <p className="mt-1 border-l border-[var(--color-tool)]/40 pl-2 font-mono text-[13px] leading-relaxed text-[var(--color-ink)]">
          {event.task}
        </p>
      </div>
    );
  }
  if (event.type === "agent_result") {
    return (
      <div className="mt-1.5">
        <p className="font-mono text-[11px] text-[var(--color-muted)]">
          Reports back — the lead receives this summary, not the work behind it.
        </p>
        <p className="mt-1 border-l border-[var(--color-muted)]/50 pl-2 font-mono text-[13px] leading-relaxed text-[var(--color-muted)] italic">
          {event.summary}
        </p>
      </div>
    );
  }
  const body = eventBody(event);
  const isVoice = event.type !== "tool_call" && event.type !== "context_evicted";
  return (
    <p
      className={`mt-1.5 font-mono text-[13px] leading-relaxed ${
        isVoice ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"
      }`}
    >
      {body}
    </p>
  );
}

/** Sparse authorial voice-over (v1.1 annotation) — set apart from the log. */
function Annotation({ text }: { text: string }) {
  return (
    <p className="mt-2 flex gap-1.5 border-l border-[var(--color-thinking)]/50 pl-2 font-mono text-[11px] leading-relaxed text-[var(--color-muted)] italic">
      <span aria-hidden="true" className="not-italic text-[var(--color-thinking)]">
        ▸
      </span>
      {text}
    </p>
  );
}
