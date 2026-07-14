import { describe, expect, it } from "vitest";
import { traceSchema } from "./schema";
import fixBrokenPage from "../../traces/fix-broken-page.trace.json";
import exampleMinimal from "../../traces/example-minimal.trace.json";
import loopTrap from "../../traces/the-loop-trap.trace.json";
import contextOverflow from "../../traces/context-overflow.trace.json";
import badObservation from "../../traces/bad-observation-recovery.trace.json";

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
