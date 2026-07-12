import { mkdirSync, writeFileSync } from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { traceSchema } from "../src/trace/schema";

const OUT = "docs/trace.schema.json";

const jsonSchema = zodToJsonSchema(traceSchema, {
  name: "Trace",
  $refStrategy: "none",
});

mkdirSync("docs", { recursive: true });
writeFileSync(OUT, `${JSON.stringify(jsonSchema, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
