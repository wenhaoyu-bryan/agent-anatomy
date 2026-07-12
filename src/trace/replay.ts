import type { ArtifactState, Trace, TraceEvent } from "./schema";

/**
 * Headless replay engine. Pure module — zero React imports; the UI binds to
 * it via zustand. All per-index state is precomputed at creation (snapshots
 * are full states, not diffs), so scrubbing is O(1).
 */

export interface ReplayFrame {
  /** Index into trace.events; -1 = before the run starts. */
  index: number;
  /** The event at this index, or null before the run starts. */
  event: TraceEvent | null;
  /** Everything that has entered the context window so far, in order. */
  contextItems: TraceEvent[];
  /** Cumulative token estimate — fold of `tokens` over contextItems. */
  tokensUsed: number;
  /** The world as of this index (last snapshot at or before it). */
  artifact: ArtifactState;
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
    { index: -1, event: null, contextItems: [], tokensUsed: 0, artifact: initialArtifact },
  ];
  let tokensUsed = 0;
  let artifact = initialArtifact;
  events.forEach((event, i) => {
    tokensUsed += event.tokens;
    if (event.type === "tool_result" && event.artifact) {
      artifact = event.artifact;
    }
    frames.push({
      index: i,
      event,
      contextItems: events.slice(0, i + 1),
      tokensUsed,
      artifact,
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
