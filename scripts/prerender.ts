import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Injects server-rendered markup into the built pages so view-source shows
 * the essay text (PLAN §8). Runs after `vite build` + the SSR bundle build;
 * see the `build` script in package.json.
 */
const entry = (await import(
  pathToFileURL("dist-ssr/entry-server.js").href
)) as typeof import("../src/prerender/entry-server");

inject("dist/index.html", entry.renderLanding());
inject("dist/episodes/how-an-agent-works/index.html", entry.renderEpisode());
inject("dist/episodes/where-agents-go-wrong/index.html", entry.renderEpisode15());

rmSync("dist-ssr", { recursive: true, force: true });

function inject(path: string, html: string): void {
  const marker = '<div id="root"></div>';
  const doc = readFileSync(path, "utf8");
  if (!doc.includes(marker)) {
    throw new Error(`Prerender: no ${marker} marker found in ${path}`);
  }
  writeFileSync(path, doc.replace(marker, `<div id="root">${html}</div>`));
  console.log(`Prerendered ${path}`);
}
