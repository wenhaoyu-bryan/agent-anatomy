import type { ArtifactState, Trace, TraceEvent } from "./schema";

/**
 * Headless replay engine. Pure module — zero React imports; the UI binds to
 * it via zustand. All per-index state is precomputed at creation (snapshots
 * are full states, not diffs), so scrubbing is O(1).
 */

/**
 * How far a source has progressed by a given frame (v1.2):
 * - "listed": it appeared in a search result but hasn't been fetched.
 * - "read": it was fetched successfully — its chip lights, it can be cited.
 * - "unreadable": the fetch came back empty (the GEO beat).
 * Monotonic: a read source stays read even if its fragment is later evicted —
 * the answer that cited it still points there.
 */
export type SourceStatus = "listed" | "read" | "unreadable";

/** The reserved id of the implicit lead agent (v1.4). */
export const LEAD_AGENT_ID = "lead";

/**
 * One agent's context window at a given frame (v1.4). Every trace has at least
 * the lead lane; a multi-agent trace adds one lane per declared helper. Lanes
 * are a presentational projection of the single flat event timeline.
 */
export interface LaneState {
  agentId: string;
  /** Display name, e.g. "Lead" or "VENUE". */
  name: string;
  /** This lane's own context budget. */
  window: number;
  /** Token estimate of what's live in this lane at this frame. */
  tokensUsed: number;
  /** What is live in this lane's window at this frame, in arrival order. */
  contextItems: TraceEvent[];
}

export interface ReplayFrame {
  /** Index into trace.events; -1 = before the run starts. */
  index: number;
  /** The event at this index, or null before the run starts. */
  event: TraceEvent | null;
  /**
   * What is LIVE in the LEAD's context window at this index, in arrival order
   * (v1.4: for a single-agent trace this is the whole window, unchanged). A
   * `context_evicted` event removes the events it names (and is not itself a
   * window item); every other lead event adds itself.
   */
  contextItems: TraceEvent[];
  /** Token estimate of what's live in the LEAD's window at this index. */
  tokensUsed: number;
  /** The world as of this index (last snapshot at or before it). */
  artifact: ArtifactState;
  /**
   * Per-source status at this index, keyed by sourceId (v1.2). Only holds
   * sources that have surfaced (via search) or been fetched by now — empty
   * for traces that never search. Fresh object per frame, safe to scrub.
   */
  sourceStates: Record<string, SourceStatus>;
  /**
   * Every agent's window at this index (v1.4), lead first, then declared
   * helpers in registry order. Stable set across the whole run (helpers appear
   * empty before they're spawned). A single-agent trace has just the lead lane.
   */
  lanes: LaneState[];
  /**
   * The lane whose window changed at this event — the one to highlight. A spawn
   * touches the helper it seeds; a result touches the lead that receives it;
   * every other event touches its own agent. Defaults to the lead.
   */
  activeAgentId: string;
}

export type ReplayListener = (frame: ReplayFrame, playing: boolean) => void;

export interface Replay {
  readonly trace: Trace;
  /** Number of events in the trace. Valid indices: -1 .. length - 1. */
  readonly length: number;
  /** State at any index, without moving the cursor. Index is clamped. */
  stateAt(index: number): ReplayFrame;
  current(): ReplayFrame;
  next(): ReplayFrame;
  prev(): ReplayFrame;
  seek(index: number): ReplayFrame;
  /**
   * Advance one event per `speedMs` until the end, then auto-pause.
   * Calling play at the end restarts from the beginning (share-clip loop).
   */
  play(speedMs?: number): void;
  pause(): void;
  isPlaying(): boolean;
  /** Notified on every cursor or playback change. Returns unsubscribe. */
  subscribe(listener: ReplayListener): () => void;
}

const DEFAULT_SPEED_MS = 800;

export function createReplay(trace: Trace): Replay {
  const { events, initialArtifact, meta } = trace;

  // Per-agent metadata + the stable lane order (lead first, then helpers as
  // declared). The lead is implicit — it always exists even with no registry.
  const agentMeta = new Map<string, { name: string; window: number }>([
    [LEAD_AGENT_ID, { name: "Lead", window: meta.contextWindowTokens }],
  ]);
  for (const agent of trace.agents ?? []) {
    agentMeta.set(agent.agentId, { name: agent.name, window: agent.contextWindowTokens });
  }
  const laneOrder = [LEAD_AGENT_ID, ...(trace.agents ?? []).map((agent) => agent.agentId)];

  // Each lane's live contents + running total. Arrays are always reassigned
  // (never mutated in place), so a frame can safely hold a reference to the
  // array as it was at that index — scrubbing shares no mutable state.
  const laneState = new Map<string, { live: TraceEvent[]; tokens: number }>();
  const getLane = (id: string): { live: TraceEvent[]; tokens: number } => {
    let lane = laneState.get(id);
    if (!lane) {
      lane = { live: [], tokens: 0 };
      laneState.set(id, lane);
    }
    return lane;
  };
  // Materialise every declared lane up front so `frame.lanes` is a stable set.
  for (const id of laneOrder) getLane(id);

  const snapshotLanes = (): LaneState[] =>
    laneOrder.map((id) => {
      const lane = getLane(id);
      const info = agentMeta.get(id)!;
      return {
        agentId: id,
        name: info.name,
        window: info.window,
        tokensUsed: lane.tokens,
        contextItems: lane.live,
      };
    });

  let artifact = initialArtifact;
  // Running source progress; cloned into each frame so scrubbing is safe.
  const sources: Record<string, SourceStatus> = {};

  // frames[i + 1] is the state at event index i; frames[0] is index -1.
  const frames: ReplayFrame[] = [
    {
      index: -1,
      event: null,
      // Same array the lead lane exposes, so contextItems === lanes[lead] always.
      contextItems: getLane(LEAD_AGENT_ID).live,
      tokensUsed: 0,
      artifact: initialArtifact,
      sourceStates: {},
      lanes: snapshotLanes(),
      activeAgentId: LEAD_AGENT_ID,
    },
  ];

  events.forEach((event, i) => {
    // Fold this event into the lane whose window it changes. A spawn seeds the
    // helper's window (a fresh reset); a result lands in the lead's window; every
    // other event lands in its own agent's window (default lead).
    let touched: string;
    if (event.type === "agent_spawn") {
      const lane = getLane(event.spawnedAgentId);
      lane.live = [event];
      lane.tokens = event.tokens;
      touched = event.spawnedAgentId;
    } else if (event.type === "agent_result") {
      const lane = getLane(LEAD_AGENT_ID);
      lane.live = [...lane.live, event];
      lane.tokens += event.tokens;
      touched = LEAD_AGENT_ID;
    } else {
      const owner = event.agentId ?? LEAD_AGENT_ID;
      const lane = getLane(owner);
      touched = owner;
      if (event.type === "context_evicted") {
        const evicted = new Set(event.evictedEventIds);
        lane.live = lane.live.filter((item) => !evicted.has(item.id));
        lane.tokens -= event.tokens;
      } else if (event.type === "compaction") {
        // The replaced items collapse into one summary item (this event). Its
        // `tokens` is the AFTER size, so the window drops by tokensBefore − tokens.
        const replaced = new Set(event.replacesEventIds);
        lane.live = [...lane.live.filter((item) => !replaced.has(item.id)), event];
        lane.tokens += event.tokens - event.tokensBefore;
      } else if (event.type === "session_break") {
        // The window empties completely. Files in the artifact layer persist —
        // that's the whole point of writing memory down.
        lane.live = [];
        lane.tokens = 0;
      } else {
        lane.live = [...lane.live, event];
        lane.tokens += event.tokens;
      }
    }

    // World state is shared across agents: the artifact (files) and source
    // registry are one world, whichever agent touched them.
    if (event.type === "tool_result" && event.artifact) {
      artifact = event.artifact;
    }
    if (event.type === "memory_write") {
      // A note is a file; derive the new artifact snapshot by patching it in.
      artifact = { ...artifact, files: { ...artifact.files, [event.path]: event.content } };
    }
    if (event.type === "search") {
      for (const result of event.results) {
        // A later search never demotes a source we've already read.
        if (sources[result.sourceId] === undefined) sources[result.sourceId] = "listed";
      }
    }
    if (event.type === "fetch") {
      sources[event.sourceId] = event.status === "ok" ? "read" : "unreadable";
    }

    const leadLane = getLane(LEAD_AGENT_ID);
    frames.push({
      index: i,
      event,
      contextItems: leadLane.live,
      tokensUsed: leadLane.tokens,
      artifact,
      sourceStates: { ...sources },
      lanes: snapshotLanes(),
      activeAgentId: touched,
    });
  });

  let cursor = -1;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<ReplayListener>();

  const clamp = (index: number): number =>
    Math.max(-1, Math.min(events.length - 1, Math.trunc(index)));

  const stateAt = (index: number): ReplayFrame => frames[clamp(index) + 1]!;

  const notify = (): void => {
    const frame = stateAt(cursor);
    const playing = timer !== null;
    for (const listener of listeners) {
      listener(frame, playing);
    }
  };

  const seek = (index: number): ReplayFrame => {
    const next = clamp(index);
    if (next !== cursor) {
      cursor = next;
      notify();
    }
    return stateAt(cursor);
  };

  const stopTimer = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    trace,
    length: events.length,
    stateAt,
    current: () => stateAt(cursor),
    next: () => seek(cursor + 1),
    prev: () => seek(cursor - 1),
    seek,
    play(speedMs = DEFAULT_SPEED_MS) {
      stopTimer();
      if (cursor >= events.length - 1) {
        cursor = -1;
      }
      timer = setInterval(() => {
        cursor = clamp(cursor + 1);
        if (cursor >= events.length - 1) {
          stopTimer();
        }
        notify();
      }, speedMs);
      notify();
    },
    pause() {
      if (timer !== null) {
        stopTimer();
        notify();
      }
    },
    isPlaying: () => timer !== null,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
