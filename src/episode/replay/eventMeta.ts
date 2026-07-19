import type { TraceEvent } from "../../trace/schema";

/**
 * Telemetry category colors per event type (PLAN §6): amber = thinking,
 * cyan = tool activity, green = the agent's answer, coral = the user.
 */
export const EVENT_META: Record<TraceEvent["type"], { label: string; color: string }> = {
  system_prompt: { label: "SYS", color: "var(--color-muted)" },
  user_message: { label: "USER", color: "var(--color-user)" },
  thinking: { label: "THINK", color: "var(--color-thinking)" },
  tool_call: { label: "CALL", color: "var(--color-tool)" },
  tool_result: { label: "RESULT", color: "var(--color-tool)" },
  assistant_message: { label: "REPLY", color: "var(--color-success)" },
  context_evicted: { label: "EVICT", color: "var(--color-muted)" },
  search: { label: "SEARCH", color: "var(--color-tool)" },
  fetch: { label: "FETCH", color: "var(--color-tool)" },
  compaction: { label: "COMPACT", color: "var(--color-muted)" },
  session_break: { label: "SESSION", color: "var(--color-muted)" },
  memory_write: { label: "WRITE", color: "var(--color-tool)" },
  memory_read: { label: "READ", color: "var(--color-tool)" },
  agent_spawn: { label: "SPAWN", color: "var(--color-tool)" },
  agent_result: { label: "REPORT", color: "var(--color-muted)" },
};

export function eventBody(event: TraceEvent): string {
  switch (event.type) {
    case "system_prompt":
      return event.summary;
    case "user_message":
    case "thinking":
    case "assistant_message":
      return event.text;
    case "tool_call":
      return `${event.tool}(${formatInput(event.input)})`;
    case "tool_result":
      return event.output;
    case "context_evicted": {
      const n = event.evictedEventIds.length;
      return `Dropped ${n} earlier ${n === 1 ? "item" : "items"} from the window to free space.`;
    }
    case "search": {
      const n = event.results.length;
      return `Searched "${event.query}" — ${n} ${n === 1 ? "result" : "results"}.`;
    }
    case "fetch":
      return event.status === "unreadable"
        ? `Couldn't read ${event.url} — the page returned no readable text.`
        : (event.extracted ?? `Read ${event.url}.`);
    case "compaction":
      return event.summary;
    case "session_break":
      return event.label;
    case "memory_write":
      return `Saved a durable note to ${event.path}.`;
    case "memory_read":
      return `Read ${event.path} back into the window.`;
    case "agent_spawn":
      return event.task;
    case "agent_result":
      return event.summary;
  }
}

function formatInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
}
