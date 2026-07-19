import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { traceSchema } from "../src/trace/schema";

const DIR = "traces";
const files = readdirSync(DIR)
  .filter((file) => file.endsWith(".trace.json"))
  .sort();

if (files.length === 0) {
  console.error(`No *.trace.json files found in ${DIR}/`);
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const raw: unknown = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  const result = traceSchema.safeParse(raw);
  if (result.success) {
    // Peak live usage, folding the same way the engine does: +tokens per event,
    // −tokens per eviction. This is the number that must fit the window.
    let running = 0;
    let peak = 0;
    for (const event of result.data.events) {
      if (event.type === "context_evicted") {
        running -= event.tokens;
      } else if (event.type === "compaction") {
        running += event.tokens - event.tokensBefore;
      } else if (event.type === "session_break") {
        running = 0;
      } else {
        running += event.tokens;
      }
      peak = Math.max(peak, running);
    }
    console.log(
      `✓ ${file} — ${result.data.events.length} events, ` +
        `peak ${peak}/${result.data.meta.contextWindowTokens} tokens`,
    );
  } else {
    failed = true;
    console.error(`✗ ${file}`);
    for (const issue of result.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  }
}

process.exit(failed ? 1 : 0);
