import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReplay } from "./replay";
import type { ArtifactState, Trace } from "./schema";

const worldBefore: ArtifactState = {
  kind: "webpage",
  files: { "page.html": "<h1>broken</h1>" },
  renderId: "before",
};
const worldAfter: ArtifactState = {
  kind: "webpage",
  files: { "page.html": "<h1>fixed</h1>" },
  renderId: "after",
};

const trace: Trace = {
  version: "1.0",
  meta: { id: "t", title: "t", description: "t", contextWindowTokens: 100 },
  tools: [{ name: "edit_file", description: "Edit a file." }],
  initialArtifact: worldBefore,
  events: [
    { id: "e1", type: "system_prompt", summary: "agent", tokens: 10 },
    { id: "e2", type: "user_message", text: "fix it", tokens: 5 },
    { id: "e3", type: "tool_call", tool: "edit_file", input: { path: "page.html" }, tokens: 3 },
    { id: "e4", type: "tool_result", tool: "edit_file", output: "ok", tokens: 7, artifact: worldAfter },
    { id: "e5", type: "assistant_message", text: "done", tokens: 5 },
  ],
};

describe("createReplay — state derivation", () => {
  it("starts before the run: no event, zero tokens, initial artifact", () => {
    const replay = createReplay(trace);
    const frame = replay.current();
    expect(frame.index).toBe(-1);
    expect(frame.event).toBeNull();
    expect(frame.contextItems).toEqual([]);
    expect(frame.tokensUsed).toBe(0);
    expect(frame.artifact).toBe(worldBefore);
  });

  it("accumulates tokens by folding over events", () => {
    const replay = createReplay(trace);
    const expected = [10, 15, 18, 25, 30];
    expected.forEach((tokens, i) => {
      expect(replay.stateAt(i).tokensUsed).toBe(tokens);
    });
  });

  it("grows contextItems one event at a time, in order", () => {
    const replay = createReplay(trace);
    for (let i = 0; i < replay.length; i++) {
      const frame = replay.stateAt(i);
      expect(frame.contextItems).toHaveLength(i + 1);
      expect(frame.contextItems[i]).toBe(trace.events[i]);
      expect(frame.event).toBe(trace.events[i]);
    }
  });

  it("resolves the artifact to the last snapshot at or before the index", () => {
    const replay = createReplay(trace);
    expect(replay.stateAt(0).artifact).toBe(worldBefore);
    expect(replay.stateAt(2).artifact).toBe(worldBefore);
    expect(replay.stateAt(3).artifact).toBe(worldAfter);
    expect(replay.stateAt(4).artifact).toBe(worldAfter);
  });

  it("stateAt does not move the cursor", () => {
    const replay = createReplay(trace);
    replay.stateAt(3);
    expect(replay.current().index).toBe(-1);
  });
});

describe("createReplay — navigation and bounds", () => {
  it("next/prev step the cursor and clamp at both ends", () => {
    const replay = createReplay(trace);
    expect(replay.next().index).toBe(0);
    expect(replay.prev().index).toBe(-1);
    expect(replay.prev().index).toBe(-1);
    replay.seek(replay.length - 1);
    expect(replay.next().index).toBe(replay.length - 1);
  });

  it("seek clamps out-of-range indices", () => {
    const replay = createReplay(trace);
    expect(replay.seek(999).index).toBe(4);
    expect(replay.seek(-999).index).toBe(-1);
    expect(replay.seek(2.7).index).toBe(2);
  });
});

describe("createReplay — playback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances one event per tick and auto-pauses at the end", () => {
    const replay = createReplay(trace);
    replay.play(100);
    expect(replay.isPlaying()).toBe(true);
    vi.advanceTimersByTime(300);
    expect(replay.current().index).toBe(2);
    vi.advanceTimersByTime(200);
    expect(replay.current().index).toBe(4);
    expect(replay.isPlaying()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(replay.current().index).toBe(4);
  });

  it("pause stops advancement", () => {
    const replay = createReplay(trace);
    replay.play(100);
    vi.advanceTimersByTime(200);
    replay.pause();
    vi.advanceTimersByTime(500);
    expect(replay.current().index).toBe(1);
    expect(replay.isPlaying()).toBe(false);
  });

  it("play at the end restarts from the beginning", () => {
    const replay = createReplay(trace);
    replay.seek(replay.length - 1);
    replay.play(100);
    expect(replay.current().index).toBe(-1);
    vi.advanceTimersByTime(100);
    expect(replay.current().index).toBe(0);
  });

  it("notifies subscribers on every change and honors unsubscribe", () => {
    const replay = createReplay(trace);
    const seen: Array<{ index: number; playing: boolean }> = [];
    const unsubscribe = replay.subscribe((frame, playing) => {
      seen.push({ index: frame.index, playing });
    });

    replay.next();
    replay.play(100);
    vi.advanceTimersByTime(100);
    replay.pause();
    expect(seen).toEqual([
      { index: 0, playing: false },
      { index: 0, playing: true },
      { index: 1, playing: true },
      { index: 1, playing: false },
    ]);

    unsubscribe();
    replay.next();
    expect(seen).toHaveLength(4);
  });

  it("does not notify when seeking to the current index", () => {
    const replay = createReplay(trace);
    const listener = vi.fn();
    replay.subscribe(listener);
    replay.seek(-1);
    expect(listener).not.toHaveBeenCalled();
  });
});
