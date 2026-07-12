import { describe, expect, it } from "vitest";
import { traceSchema } from "./schema";
import fixBrokenPage from "../../traces/fix-broken-page.trace.json";
import exampleMinimal from "../../traces/example-minimal.trace.json";

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
