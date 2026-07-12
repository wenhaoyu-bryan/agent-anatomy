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
  }
}

function formatInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
}
