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

export interface ReplayFrame {
  /** Index into trace.events; -1 = before the run starts. */
  index: number;
  /** The event at this index, or null before the run starts. */
  event: TraceEvent | null;
  /**
   * What is LIVE in the context window at this index, in arrival order.
   * A `context_evicted` event removes the events it names (and is not itself
   * a window item); every other event adds itself. For a trace with no
   * eviction this is simply every event so far.
   */
  contextItems: TraceEvent[];
  /** Token estimate of what's live — folds +tokens per event, −tokens per eviction. */
  tokensUsed: number;
  /** The world as of this index (last snapshot at or before it). */
  artifact: ArtifactState;
  /**
   * Per-source status at this index, keyed by sourceId (v1.2). Only holds
   * sources that have surfaced (via search) or been fetched by now — empty
   * for traces that never search. Fresh object per frame, safe to scrub.
   */
  sourceStates: Record<string, SourceStatus>;
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
  const { events, initialArtifact } = trace;

  // frames[i + 1] is the state at event index i; frames[0] is index -1.
  const frames: ReplayFrame[] = [
    {
      index: -1,
      event: null,
      contextItems: [],
      tokensUsed: 0,
      artifact: initialArtifact,
      sourceStates: {},
    },
  ];
  let tokensUsed = 0;
  let artifact = initialArtifact;
  // Live window contents, rebuilt into a fresh array per frame so scrubbing to
  // any index is safe and shares no mutable state.
  let live: TraceEvent[] = [];
  // Running source progress; cloned into each frame so scrubbing is safe.
  const sources: Record<string, SourceStatus> = {};
  events.forEach((event, i) => {
    if (event.type === "context_evicted") {
      const evicted = new Set(event.evictedEventIds);
      live = live.filter((item) => !evicted.has(item.id));
      tokensUsed -= event.tokens;
    } else if (event.type === "compaction") {
      // The replaced items collapse into one summary item (this event). Its
      // `tokens` is the AFTER size, so the window drops by tokensBefore − tokens.
      const replaced = new Set(event.replacesEventIds);
      live = [...live.filter((item) => !replaced.has(item.id)), event];
      tokensUsed += event.tokens - event.tokensBefore;
    } else if (event.type === "session_break") {
      // The window empties completely. Files in the artifact layer persist —
      // that's the whole point of writing memory down.
      live = [];
      tokensUsed = 0;
    } else {
      live = [...live, event];
      tokensUsed += event.tokens;
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
    }
    frames.push({
      index: i,
      event,
      contextItems: live,
      tokensUsed,
      artifact,
      sourceStates: { ...sources },
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
