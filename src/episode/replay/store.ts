import { create, useStore, type StoreApi } from "zustand";
import { createContext, createElement, useContext, useRef, type ReactNode } from "react";
import { createReplay, type ReplayFrame } from "../../trace/replay";
import { traceSchema, type Trace } from "../../trace/schema";
import rawTrace from "../../../traces/fix-broken-page.trace.json";

export interface ReplayStore {
  /** The trace this store plays — components read events/meta straight from it. */
  trace: Trace;
  frame: ReplayFrame;
  playing: boolean;
  length: number;
  windowTokens: number;
  next: () => void;
  prev: () => void;
  seek: (index: number) => void;
  toStart: () => void;
  toEnd: () => void;
  togglePlay: () => void;
}

/**
 * Build an independent replay store bound to one trace. Episode 01 uses a
 * single shared instance; each Episode 1.5 vignette makes its own so their
 * playheads never interfere. Manual navigation pauses playback — grabbing the
 * controls means the user has taken over.
 */
export function makeReplayStore(trace: Trace): StoreApi<ReplayStore> {
  const replay = createReplay(trace);
  return create<ReplayStore>((set) => {
    replay.subscribe((frame, playing) => set({ frame, playing }));
    return {
      trace,
      frame: replay.current(),
      playing: false,
      length: replay.length,
      windowTokens: trace.meta.contextWindowTokens,
      next: () => {
        replay.pause();
        replay.next();
      },
      prev: () => {
        replay.pause();
        replay.prev();
      },
      seek: (index) => {
        replay.pause();
        replay.seek(index);
      },
      toStart: () => {
        replay.pause();
        replay.seek(-1);
      },
      toEnd: () => {
        replay.pause();
        replay.seek(replay.length - 1);
      },
      togglePlay: () => {
        if (replay.isPlaying()) {
          replay.pause();
        } else {
          replay.play();
        }
      },
    };
  });
}

/** The episode-1 trace, validated at load so a bad edit fails loudly in dev. */
export const episodeTrace = traceSchema.parse(rawTrace);

/**
 * Episode 01's replay store. Exported as a standalone StoreApi so the WebGL
 * ContextScene can read it via getState() outside React, and so it can serve
 * as the context default — Episode 01's components need no provider.
 */
export const useReplayStore = makeReplayStore(episodeTrace);

const ReplayStoreContext = createContext<StoreApi<ReplayStore>>(useReplayStore);

/** Bind a replay UI subtree to its own trace (used per Episode 1.5 vignette). */
export function ReplayProvider({ trace, children }: { trace: Trace; children: ReactNode }) {
  const ref = useRef<StoreApi<ReplayStore> | null>(null);
  const store = (ref.current ??= makeReplayStore(trace));
  return createElement(ReplayStoreContext.Provider, { value: store }, children);
}

/** Read the replay store bound by the nearest provider (or the Ep-01 singleton). */
export function useReplay<T>(selector: (state: ReplayStore) => T): T {
  return useStore(useContext(ReplayStoreContext), selector);
}

/**
 * The raw store API for the nearest provider. Lets an R3F scene read the frame
 * via getState() inside useFrame — the store crosses the Canvas reconciler
 * boundary as a value, so no React context bridging is needed.
 */
export function useReplayApi(): StoreApi<ReplayStore> {
  return useContext(ReplayStoreContext);
}
