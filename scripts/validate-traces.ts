import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { traceSchema } from "../src/trace/schema";
import { createReplay, LEAD_AGENT_ID } from "../src/trace/replay";

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
    // Peak per-lane usage, read straight off the engine's derived frames — the
    // number that must fit each window. For a single-agent trace this is just
    // the lead lane, unchanged from before 1.4.
    const replay = createReplay(result.data);
    const peaks = new Map<string, { peak: number; window: number; name: string }>();
    for (let i = 0; i < replay.length; i++) {
      for (const lane of replay.stateAt(i).lanes) {
        const entry = peaks.get(lane.agentId) ?? { peak: 0, window: lane.window, name: lane.name };
        entry.peak = Math.max(entry.peak, lane.tokensUsed);
        peaks.set(lane.agentId, entry);
      }
    }
    const lead = peaks.get(LEAD_AGENT_ID)!;
    let line = `✓ ${file} — ${result.data.events.length} events, lead peak ${lead.peak}/${lead.window}`;
    const helpers = [...peaks].filter(([id]) => id !== LEAD_AGENT_ID);
    if (helpers.length > 0) {
      const tightest = helpers.reduce((a, b) =>
        b[1].peak / b[1].window > a[1].peak / a[1].window ? b : a,
      );
      line += ` · ${helpers.length} helpers, tightest ${tightest[1].name} ${tightest[1].peak}/${tightest[1].window}`;
    }
    console.log(line);
  } else {
    failed = true;
    console.error(`✗ ${file}`);
    for (const issue of result.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  }
}

process.exit(failed ? 1 : 0);
