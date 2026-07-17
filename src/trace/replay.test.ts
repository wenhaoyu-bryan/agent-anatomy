import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReplay } from "./replay";
import type { ArtifactState, Trace } from "./schema";
import tokyoTrip from "../../traces/tokyo-trip.trace.json";

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

const evictionTrace: Trace = {
  version: "1.1",
  meta: { id: "evict", title: "e", description: "e", contextWindowTokens: 100 },
  tools: [{ name: "noop", description: "noop" }],
  initialArtifact: worldBefore,
  events: [
    { id: "a", type: "system_prompt", summary: "sys", tokens: 30 },
    { id: "b", type: "user_message", text: "ask", tokens: 20 },
    { id: "c", type: "thinking", text: "hmm", tokens: 40 },
    { id: "d", type: "context_evicted", evictedEventIds: ["a", "b"], tokens: 50 },
    { id: "e", type: "assistant_message", text: "done", tokens: 25 },
  ],
};

describe("createReplay — context eviction (v1.1)", () => {
  it("subtracts reclaimed tokens and drops the evicted events from the window", () => {
    const replay = createReplay(evictionTrace);

    // Full window just before the eviction.
    expect(replay.stateAt(2).tokensUsed).toBe(90);
    expect(replay.stateAt(2).contextItems.map((event) => event.id)).toEqual(["a", "b", "c"]);

    // The eviction frame: tokens fall by 50, a and b leave, the marker itself
    // is not a window item.
    const evicted = replay.stateAt(3);
    expect(evicted.event?.type).toBe("context_evicted");
    expect(evicted.tokensUsed).toBe(40);
    expect(evicted.contextItems.map((event) => event.id)).toEqual(["c"]);

    // Life goes on: the next event adds itself on top of the reduced window.
    const after = replay.stateAt(4);
    expect(after.tokensUsed).toBe(65);
    expect(after.contextItems.map((event) => event.id)).toEqual(["c", "e"]);
  });

  it("scrubbing back before the eviction restores the full window", () => {
    const replay = createReplay(evictionTrace);
    replay.seek(4);
    expect(replay.stateAt(1).contextItems.map((event) => event.id)).toEqual(["a", "b"]);
    // And re-reading the eviction frame is still correct (no shared mutation).
    expect(replay.stateAt(3).contextItems.map((event) => event.id)).toEqual(["c"]);
  });
});

const retrievalTrace: Trace = {
  version: "1.2",
  meta: { id: "r", title: "r", description: "r", contextWindowTokens: 1000 },
  tools: [
    { name: "search_web", description: "search" },
    { name: "fetch_page", description: "fetch" },
  ],
  sources: [
    { sourceId: "s1", title: "S1", url: "s1", faviconHue: 10 },
    { sourceId: "s2", title: "S2", url: "s2", faviconHue: 20 },
  ],
  initialArtifact: worldBefore,
  events: [
    { id: "a", type: "user_message", text: "q", tokens: 5 },
    {
      id: "b",
      type: "search",
      query: "q",
      results: [
        { sourceId: "s1", title: "S1", url: "s1", snippet: "x" },
        { sourceId: "s2", title: "S2", url: "s2", snippet: "y" },
      ],
      tokens: 30,
    },
    { id: "c", type: "fetch", sourceId: "s1", url: "s1", status: "ok", extracted: "text", tokens: 100 },
    { id: "d", type: "fetch", sourceId: "s2", url: "s2", status: "unreadable", tokens: 10 },
    {
      id: "e",
      type: "assistant_message",
      text: "answer",
      tokens: 20,
      citations: [{ spanStart: 0, spanEnd: 6, sourceIds: ["s1"] }],
    },
  ],
};

describe("createReplay — web retrieval source states (v1.2)", () => {
  it("has no source states before the run and folds search/fetch tokens like any event", () => {
    const replay = createReplay(retrievalTrace);
    expect(replay.current().sourceStates).toEqual({});
    // search (+30) and fetch (+100, +10) accumulate exactly like other events.
    expect(replay.stateAt(1).tokensUsed).toBe(35);
    expect(replay.stateAt(2).tokensUsed).toBe(135);
    expect(replay.stateAt(4).tokensUsed).toBe(165);
  });

  it("moves each source through listed → read / unreadable", () => {
    const replay = createReplay(retrievalTrace);
    expect(replay.stateAt(1).sourceStates).toEqual({ s1: "listed", s2: "listed" });
    expect(replay.stateAt(2).sourceStates).toEqual({ s1: "read", s2: "listed" });
    expect(replay.stateAt(3).sourceStates).toEqual({ s1: "read", s2: "unreadable" });
    expect(replay.stateAt(4).sourceStates).toEqual({ s1: "read", s2: "unreadable" });
  });

  it("gives each frame a fresh source-state object — scrubbing back is unpolluted", () => {
    const replay = createReplay(retrievalTrace);
    replay.seek(4);
    expect(replay.stateAt(1).sourceStates).toEqual({ s1: "listed", s2: "listed" });
  });
});

describe("createReplay — source states are empty for pre-1.2 traces", () => {
  it("never populates sourceStates when there is no web retrieval", () => {
    const replay = createReplay(trace);
    for (let i = -1; i < replay.length; i++) {
      expect(replay.stateAt(i).sourceStates).toEqual({});
    }
  });
});

const memoryTrace: Trace = {
  version: "1.3",
  meta: { id: "m", title: "m", description: "m", contextWindowTokens: 1000 },
  tools: [{ name: "noop", description: "noop" }],
  initialArtifact: worldBefore,
  events: [
    { id: "a", type: "user_message", text: "plan it", tokens: 20 },
    { id: "b", type: "memory_write", path: "notes.md", content: "hello", tokens: 40 },
    { id: "c", type: "thinking", text: "lots of research", tokens: 100 },
    {
      id: "d",
      type: "compaction",
      replacesEventIds: ["a", "c"],
      summary: "digest",
      tokensBefore: 120,
      tokens: 30,
    },
    { id: "e", type: "session_break", label: "the next day", tokens: 0 },
    { id: "f", type: "memory_read", path: "notes.md", content: "hello", tokens: 40 },
    { id: "g", type: "assistant_message", text: "done", tokens: 10 },
  ],
};

describe("createReplay — compaction (v1.3)", () => {
  it("replaces the compacted items with one summary and drops the window by before − after", () => {
    const replay = createReplay(memoryTrace);
    // Full window just before compaction: a(20) + b(40) + c(100) = 160.
    expect(replay.stateAt(2).tokensUsed).toBe(160);
    expect(replay.stateAt(2).contextItems.map((event) => event.id)).toEqual(["a", "b", "c"]);

    // Compaction: a and c collapse into the summary (this event). 160 − 120 + 30 = 70.
    const compacted = replay.stateAt(3);
    expect(compacted.event?.type).toBe("compaction");
    expect(compacted.tokensUsed).toBe(70);
    // b survives; the summary item (d) is now a live window item in its place.
    expect(compacted.contextItems.map((event) => event.id)).toEqual(["b", "d"]);
  });

  it("scrubbing back before compaction restores the full window (no shared mutation)", () => {
    const replay = createReplay(memoryTrace);
    replay.seek(6);
    expect(replay.stateAt(2).contextItems.map((event) => event.id)).toEqual(["a", "b", "c"]);
    expect(replay.stateAt(3).contextItems.map((event) => event.id)).toEqual(["b", "d"]);
  });
});

describe("createReplay — session break and memory files (v1.3)", () => {
  it("a memory_write records the note as an artifact file", () => {
    const replay = createReplay(memoryTrace);
    expect(replay.stateAt(0).artifact.files["notes.md"]).toBeUndefined();
    expect(replay.stateAt(1).artifact.files["notes.md"]).toBe("hello");
  });

  it("session_break empties the window but leaves the memory files intact", () => {
    const replay = createReplay(memoryTrace);
    const broken = replay.stateAt(4);
    expect(broken.event?.type).toBe("session_break");
    expect(broken.tokensUsed).toBe(0);
    expect(broken.contextItems).toEqual([]);
    // The whole point: the note written last session survives the empty window.
    expect(broken.artifact.files["notes.md"]).toBe("hello");
  });

  it("a fresh session reads the note back into an otherwise empty window", () => {
    const replay = createReplay(memoryTrace);
    const read = replay.stateAt(5);
    expect(read.event?.type).toBe("memory_read");
    // Only the read note is live — the window started empty this session.
    expect(read.contextItems.map((event) => event.id)).toEqual(["f"]);
    expect(read.tokensUsed).toBe(40);
  });
});

describe("createReplay — Tokyo two-session trace (v1.3 integration)", () => {
  it("fills, compacts, empties at the break, and rebuilds from notes", () => {
    const replay = createReplay(tokyoTrip as unknown as Trace);
    const at = (id: string) => {
      const i = replay.trace.events.findIndex((event) => event.id === id);
      return replay.stateAt(i);
    };

    // Session A fills to a near-full window just before compaction.
    expect(at("e12").tokensUsed).toBe(2225);
    // Compaction drops it sharply (2225 − 1730 + 430 = 925).
    expect(at("e13").tokensUsed).toBe(925);
    expect(at("e13").event?.type).toBe("compaction");
    // The notes file exists after the write.
    expect(at("e14").artifact.files["notes/tokyo-trip.md"]).toContain("Open questions");

    // The session break empties the window; the notes file survives it.
    const broken = at("e16");
    expect(broken.tokensUsed).toBe(0);
    expect(broken.contextItems).toEqual([]);
    expect(broken.artifact.files["notes/tokyo-trip.md"]).toContain("Open questions");

    // Session B: the read pulls the same note back into the fresh window.
    const read = at("e19");
    expect(read.event?.type).toBe("memory_read");
    expect(read.contextItems.map((event) => event.id)).toEqual(["e17", "e18", "e19"]);

    // The run ends with the itinerary written and the note still present.
    const end = replay.stateAt(replay.length - 1);
    expect(end.artifact.files["itinerary.md"]).toContain("Day 1");
    expect(end.artifact.files["notes/tokyo-trip.md"]).toContain("Open questions");
  });

  it("the memory_read content is byte-identical to what was written", () => {
    const replay = createReplay(tokyoTrip as unknown as Trace);
    const write = replay.trace.events.find(
      (event) => event.type === "memory_write" && event.path === "notes/tokyo-trip.md",
    );
    const read = replay.trace.events.find((event) => event.type === "memory_read");
    expect(write && write.type === "memory_write" && write.content).toBe(
      read && read.type === "memory_read" ? read.content : null,
    );
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
