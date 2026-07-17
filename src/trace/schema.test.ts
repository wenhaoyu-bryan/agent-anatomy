import { describe, expect, it } from "vitest";
import { traceSchema } from "./schema";
import fixBrokenPage from "../../traces/fix-broken-page.trace.json";
import exampleMinimal from "../../traces/example-minimal.trace.json";
import loopTrap from "../../traces/the-loop-trap.trace.json";
import contextOverflow from "../../traces/context-overflow.trace.json";
import badObservation from "../../traces/bad-observation-recovery.trace.json";
import reheatRice from "../../traces/reheat-rice.trace.json";
import tokyoTrip from "../../traces/tokyo-trip.trace.json";

describe("trace schema — shipped trace files", () => {
  it("validates fix-broken-page.trace.json", () => {
    const trace = traceSchema.parse(fixBrokenPage);
    expect(trace.meta.id).toBe("fix-broken-page");
    expect(trace.events.length).toBeGreaterThanOrEqual(18);
    expect(trace.events.length).toBeLessThanOrEqual(24);
  });

  it("validates example-minimal.trace.json", () => {
    const trace = traceSchema.parse(exampleMinimal);
    expect(trace.meta.id).toBe("example-minimal");
  });

  it("fix-broken-page covers every event type and heals the artifact", () => {
    const trace = traceSchema.parse(fixBrokenPage);
    const types = new Set(trace.events.map((event) => event.type));
    for (const required of [
      "system_prompt",
      "user_message",
      "thinking",
      "tool_call",
      "tool_result",
      "assistant_message",
    ]) {
      expect(types).toContain(required);
    }
    const snapshots = trace.events.flatMap((event) =>
      event.type === "tool_result" && event.artifact ? [event.artifact.renderId] : [],
    );
    expect(trace.initialArtifact.renderId).toBe("broken-both");
    expect(snapshots).toEqual(["image-fixed", "all-fixed"]);
  });
});

describe("trace schema — episode 1.5 failure traces (v1.1)", () => {
  const cases = [
    { name: "the-loop-trap", trace: loopTrap },
    { name: "context-overflow", trace: contextOverflow },
    { name: "bad-observation-recovery", trace: badObservation },
  ];

  it.each(cases)("validates $name as a v1.1 trace of 8–14 events", ({ name, trace }) => {
    const parsed = traceSchema.parse(trace);
    expect(parsed.version).toBe("1.1");
    expect(parsed.meta.id).toBe(name);
    expect(parsed.events.length).toBeGreaterThanOrEqual(8);
    expect(parsed.events.length).toBeLessThanOrEqual(14);
  });

  it("context-overflow evicts the original user request when the window fills", () => {
    const trace = traceSchema.parse(contextOverflow);
    const eviction = trace.events.find((event) => event.type === "context_evicted");
    expect(eviction).toBeDefined();
    // The user's request (e02) is among the dropped items — that's the lost plot.
    expect(eviction && eviction.type === "context_evicted" && eviction.evictedEventIds).toContain(
      "e02",
    );
  });

  it("v1.0 traces carry no v1.1-only features (backward-compatible)", () => {
    for (const trace of [fixBrokenPage, exampleMinimal]) {
      const parsed = traceSchema.parse(trace);
      expect(parsed.version).toBe("1.0");
      expect(parsed.events.some((event) => event.type === "context_evicted")).toBe(false);
      expect(parsed.events.some((event) => "annotation" in event)).toBe(false);
    }
  });
});

describe("trace schema — v1.1 rules", () => {
  const overflow = traceSchema.parse(contextOverflow);

  it("rejects context_evicted / annotation in a trace still declared 1.0", () => {
    const asV10 = { ...overflow, version: "1.0" };
    expect(traceSchema.safeParse(asV10).success).toBe(false);
  });

  it("rejects an eviction whose tokens don't match the reclaimed sum", () => {
    const events = overflow.events.map((event) =>
      event.type === "context_evicted" ? { ...event, tokens: event.tokens + 1 } : event,
    );
    expect(traceSchema.safeParse({ ...overflow, events }).success).toBe(false);
  });

  it("rejects evicting an event that isn't in the window", () => {
    const events = overflow.events.map((event) =>
      event.type === "context_evicted"
        ? { ...event, evictedEventIds: [...event.evictedEventIds, "does-not-exist"] }
        : event,
    );
    expect(traceSchema.safeParse({ ...overflow, events }).success).toBe(false);
  });

  it("accepts an annotation on a v1.1 event", () => {
    const events = overflow.events.map((event, i) =>
      i === overflow.events.length - 1 ? { ...event, annotation: "a note" } : event,
    );
    expect(traceSchema.safeParse({ ...overflow, events }).success).toBe(true);
  });
});

describe("trace schema — episode 02 web retrieval (v1.2)", () => {
  it("validates reheat-rice as a v1.2 trace with a 5-source registry", () => {
    const trace = traceSchema.parse(reheatRice);
    expect(trace.version).toBe("1.2");
    expect(trace.meta.id).toBe("reheat-rice");
    expect(trace.sources).toHaveLength(5);
    expect(trace.events.length).toBeGreaterThanOrEqual(8);
  });

  it("searches once, reads two sources, and hits one unreadable page (the GEO beat)", () => {
    const trace = traceSchema.parse(reheatRice);
    const searches = trace.events.filter((event) => event.type === "search");
    expect(searches).toHaveLength(1);

    const fetches = trace.events.flatMap((event) => (event.type === "fetch" ? [event] : []));
    const ok = fetches.filter((event) => event.status === "ok").map((event) => event.sourceId);
    const unreadable = fetches
      .filter((event) => event.status === "unreadable")
      .map((event) => event.sourceId);
    expect(ok).toEqual(["nfsa", "kitchen-basics"]);
    expect(unreadable).toEqual(["quickbite-blog"]);
  });

  it("the answer cites only sources it actually read", () => {
    const trace = traceSchema.parse(reheatRice);
    const answer = trace.events.find((event) => event.type === "assistant_message");
    expect(answer && answer.type === "assistant_message" && answer.citations).toBeTruthy();
    const cited = new Set(
      answer && answer.type === "assistant_message"
        ? (answer.citations ?? []).flatMap((citation) => citation.sourceIds)
        : [],
    );
    // The unreadable blog and the unread forum are never cited.
    expect(cited).toEqual(new Set(["nfsa", "kitchen-basics"]));
  });

  it("all five shipped traces still validate under the 1.2 schema (backward compatible)", () => {
    for (const raw of [fixBrokenPage, exampleMinimal, loopTrap, contextOverflow, badObservation]) {
      expect(traceSchema.safeParse(raw).success).toBe(true);
    }
    // And their declared versions are unchanged — 1.2 didn't silently upgrade them.
    expect(traceSchema.parse(fixBrokenPage).version).toBe("1.0");
    expect(traceSchema.parse(contextOverflow).version).toBe("1.1");
  });
});

describe("trace schema — v1.2 rules", () => {
  const rice = traceSchema.parse(reheatRice);

  it("rejects search / fetch / sources / citations in a trace still declared 1.1", () => {
    expect(traceSchema.safeParse({ ...rice, version: "1.1" }).success).toBe(false);
  });

  it("rejects a fetch with status ok but no extracted fragment", () => {
    const events = rice.events.map((event) =>
      event.type === "fetch" && event.status === "ok"
        ? { ...event, extracted: undefined }
        : event,
    );
    expect(traceSchema.safeParse({ ...rice, events }).success).toBe(false);
  });

  it("rejects a fetch with status unreadable that still carries an extract", () => {
    const events = rice.events.map((event) =>
      event.type === "fetch" && event.status === "unreadable"
        ? { ...event, extracted: "sneaky text" }
        : event,
    );
    expect(traceSchema.safeParse({ ...rice, events }).success).toBe(false);
  });

  it("rejects a search result referencing a source not in the registry", () => {
    const events = rice.events.map((event) =>
      event.type === "search"
        ? {
            ...event,
            results: [
              ...event.results,
              { sourceId: "ghost", title: "x", url: "x", snippet: "x" },
            ],
          }
        : event,
    );
    expect(traceSchema.safeParse({ ...rice, events }).success).toBe(false);
  });

  it("rejects citing a source that was never fetched ok (a page that can't be read can't be cited)", () => {
    // quickbite-blog came back unreadable; citing it must fail.
    const events = rice.events.map((event) =>
      event.type === "assistant_message" && event.citations
        ? {
            ...event,
            citations: event.citations.map((citation, i) =>
              i === 0 ? { ...citation, sourceIds: ["quickbite-blog"] } : citation,
            ),
          }
        : event,
    );
    expect(traceSchema.safeParse({ ...rice, events }).success).toBe(false);
  });

  it("rejects a citation span that runs past the answer text", () => {
    const events = rice.events.map((event) =>
      event.type === "assistant_message" && event.citations
        ? {
            ...event,
            citations: event.citations.map((citation, i) =>
              i === 0 ? { ...citation, spanEnd: event.text.length + 50 } : citation,
            ),
          }
        : event,
    );
    expect(traceSchema.safeParse({ ...rice, events }).success).toBe(false);
  });

  it("rejects a duplicate source id in the registry", () => {
    const sources = [...(rice.sources ?? []), rice.sources![0]!];
    expect(traceSchema.safeParse({ ...rice, sources }).success).toBe(false);
  });
});

describe("trace schema — episode 03 memory (v1.3)", () => {
  it("validates tokyo-trip as a two-session v1.3 trace", () => {
    const trace = traceSchema.parse(tokyoTrip);
    expect(trace.version).toBe("1.3");
    expect(trace.meta.id).toBe("tokyo-trip");
    const types = new Set(trace.events.map((event) => event.type));
    for (const required of ["compaction", "session_break", "memory_write", "memory_read"]) {
      expect(types).toContain(required);
    }
    // Two sessions: exactly one hard reset of the window.
    expect(trace.events.filter((event) => event.type === "session_break")).toHaveLength(1);
  });

  it("the note written in session A is read back byte-identical in session B", () => {
    const trace = traceSchema.parse(tokyoTrip);
    const write = trace.events.find(
      (event) => event.type === "memory_write" && event.path === "notes/tokyo-trip.md",
    );
    const read = trace.events.find((event) => event.type === "memory_read");
    const writeContent = write && write.type === "memory_write" ? write.content : "W";
    const readContent = read && read.type === "memory_read" ? read.content : "R";
    expect(readContent).toBe(writeContent);
  });

  it("every prior trace still validates under 1.3 with its version untouched (backward compatible)", () => {
    for (const raw of [
      fixBrokenPage,
      exampleMinimal,
      loopTrap,
      contextOverflow,
      badObservation,
      reheatRice,
    ]) {
      expect(traceSchema.safeParse(raw).success).toBe(true);
    }
    expect(traceSchema.parse(fixBrokenPage).version).toBe("1.0");
    expect(traceSchema.parse(contextOverflow).version).toBe("1.1");
    expect(traceSchema.parse(reheatRice).version).toBe("1.2");
  });
});

describe("trace schema — v1.3 rules", () => {
  const tokyo = traceSchema.parse(tokyoTrip);

  const mapEvent = (type: string, fn: (event: Record<string, unknown>) => Record<string, unknown>) =>
    tokyo.events.map((event) => (event.type === type ? fn(event as Record<string, unknown>) : event));

  it("rejects compaction / session_break / memory events in a trace still declared 1.2", () => {
    expect(traceSchema.safeParse({ ...tokyo, version: "1.2" }).success).toBe(false);
  });

  it("rejects a compaction whose tokensBefore doesn't match the replaced items", () => {
    const events = mapEvent("compaction", (event) => ({
      ...event,
      tokensBefore: (event.tokensBefore as number) + 1,
    }));
    expect(traceSchema.safeParse({ ...tokyo, events }).success).toBe(false);
  });

  it("rejects a compaction that doesn't actually shrink the window", () => {
    const events = mapEvent("compaction", (event) => ({
      ...event,
      tokens: event.tokensBefore as number,
    }));
    expect(traceSchema.safeParse({ ...tokyo, events }).success).toBe(false);
  });

  it("rejects compacting an event that isn't in the window", () => {
    const events = mapEvent("compaction", (event) => ({
      ...event,
      replacesEventIds: [...(event.replacesEventIds as string[]), "does-not-exist"],
    }));
    expect(traceSchema.safeParse({ ...tokyo, events }).success).toBe(false);
  });

  it("rejects a session_break that claims a nonzero token cost", () => {
    const events = mapEvent("session_break", (event) => ({ ...event, tokens: 5 }));
    expect(traceSchema.safeParse({ ...tokyo, events }).success).toBe(false);
  });

  it("rejects a memory_read whose content differs from what was written", () => {
    const events = mapEvent("memory_read", (event) => ({
      ...event,
      content: `${event.content as string} (tampered)`,
    }));
    expect(traceSchema.safeParse({ ...tokyo, events }).success).toBe(false);
  });

  it("rejects reading a file that no earlier event wrote", () => {
    const events = mapEvent("memory_read", (event) => ({ ...event, path: "nope.md" }));
    expect(traceSchema.safeParse({ ...tokyo, events }).success).toBe(false);
  });
});

describe("trace schema — rejections", () => {
  const base = traceSchema.parse(exampleMinimal);

  it("rejects duplicate event ids", () => {
    const events = base.events.map((event) => ({ ...event, id: "same" }));
    expect(traceSchema.safeParse({ ...base, events }).success).toBe(false);
  });

  it("rejects tool events whose tool is not declared", () => {
    const bad = {
      ...base,
      events: [
        ...base.events,
        { id: "e99", type: "tool_call", tool: "launch_rocket", input: {}, tokens: 5 },
      ],
    };
    expect(traceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects traces whose events overflow the declared context window", () => {
    const bad = { ...base, meta: { ...base.meta, contextWindowTokens: 10 } };
    expect(traceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown keys (strict schema)", () => {
    const bad = { ...base, surprise: true };
    expect(traceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a wrong version literal", () => {
    const bad = { ...base, version: "2.0" };
    expect(traceSchema.safeParse(bad).success).toBe(false);
  });
});
