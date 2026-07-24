import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end browser tests (added post-launch alongside the scroll-restoration
 * fix). These exercise real layout/scroll/WebGL behavior the vitest unit tests
 * (pure replay/schema logic) can't reach.
 *
 * Server: the dev server must be served with the pinned Node toolchain
 * (`fnm exec --using 22.20.0 pnpm dev`) — default Node hangs the build (see
 * NOTES.md). `reuseExistingServer` means an already-running dev server is used
 * as-is; otherwise Playwright starts one with `pnpm dev` (start it yourself with
 * the pinned Node if that stalls).
 */
export default defineConfig({
  testDir: "./e2e",
  // Write artifacts under node_modules/.cache — the dev server (reused for the
  // run) watches the project root for HMR, and files appearing in a root-level
  // test-results/ would trigger a full page reload mid-test. node_modules is
  // never watched, so results land out of Vite's sight.
  outputDir: "node_modules/.cache/playwright-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: "http://localhost:5173/agent-anatomy/",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173/agent-anatomy/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
