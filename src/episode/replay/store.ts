import { create } from "zustand";
import { createReplay, type ReplayFrame } from "../../trace/replay";
import { traceSchema } from "../../trace/schema";
import rawTrace from "../../../traces/fix-broken-page.trace.json";

/** The episode-1 trace, validated at load so a bad edit fails loudly in dev. */
export const episodeTrace = traceSchema.parse(rawTrace);

const replay = createReplay(episodeTrace);

interface ReplayStore {
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
 * React binding for the headless engine. Manual navigation pauses playback —
 * grabbing the controls means the user has taken over.
 */
export const useReplayStore = create<ReplayStore>((set) => {
  replay.subscribe((frame, playing) => set({ frame, playing }));
  return {
    frame: replay.current(),
    playing: false,
    length: replay.length,
    windowTokens: episodeTrace.meta.contextWindowTokens,
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
