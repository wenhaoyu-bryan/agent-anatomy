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
    const total = result.data.events.reduce((sum, event) => sum + event.tokens, 0);
    console.log(
      `✓ ${file} — ${result.data.events.length} events, ` +
        `${total}/${result.data.meta.contextWindowTokens} tokens`,
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
