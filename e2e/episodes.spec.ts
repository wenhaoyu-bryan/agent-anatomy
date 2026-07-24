import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * Episode-level browser tests.
 *
 * The headline case is the post-launch scroll-restoration fix: the pinned WebGL
 * scenes grow from a short fallback to ~340vh once `useGlReady` fires, and the
 * browser's default "auto" scroll restoration used to dump a reloading reader
 * ~2000px past the very animation they were watching. `MotionRoot` now sets
 * `history.scrollRestoration = "manual"`, so every load starts at the top.
 */

const EPISODES = [
  { slug: "how-an-agent-works", ep: "01", title: /how an ai agent works/i },
  { slug: "where-agents-go-wrong", ep: "1.5", title: /where agents go wrong/i },
  { slug: "how-ai-reads-the-web", ep: "02", title: /reads the web/i },
  { slug: "how-agents-remember", ep: "03", title: /remember/i },
  { slug: "how-agents-work-together", ep: "04", title: /work together/i },
] as const;

// The three scroll-scrubbed pinned scenes (each grows to a tall pinned section).
const PINNED = [
  { slug: "how-ai-reads-the-web", sectionId: "funnel" },
  { slug: "how-agents-remember", sectionId: "compaction" },
  { slug: "how-agents-work-together", sectionId: "fan-out" },
] as const;

/** Console messages that are known-harmless noise, not app errors. */
function isBenign(msg: ConsoleMessage): boolean {
  const t = msg.text();
  return (
    t.includes("goatcounter") || // analytics declines to count on localhost
    t.includes("THREE.Clock") // three.js internal deprecation from r3f
  );
}

/** Collect real console errors + uncaught page exceptions for the whole test. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !isBenign(msg)) errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

/** Scroll top→bottom in steps so every IntersectionObserver / scrub fires. */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += Math.round(window.innerHeight * 0.5)) {
      window.scrollTo(0, y);
      await sleep(120);
    }
    window.scrollTo(0, h);
    await sleep(250);
  });
}

test.describe("episode smoke", () => {
  for (const { slug, ep, title } of EPISODES) {
    test(`Ep ${ep} loads clean, manual restoration, no stuck reveals`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(`episodes/${slug}/`);

      await expect(page).toHaveTitle(title);

      // The fix: episodes opt out of automatic scroll restoration.
      expect(await page.evaluate(() => history.scrollRestoration)).toBe("manual");

      await scrollThrough(page);

      // No `.reveal` block is left permanently invisible (opacity 0 with layout).
      const stuck = await page.evaluate(
        () =>
          [...document.querySelectorAll(".reveal")].filter((el) => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return parseFloat(cs.opacity) < 0.05 && r.height > 0;
          }).length,
      );
      expect(stuck, "reveal blocks stuck hidden").toBe(0);

      expect(errors, `console errors on Ep ${ep}`).toEqual([]);
    });
  }
});

test.describe("scroll-restoration regression (pinned scenes)", () => {
  for (const { slug, sectionId } of PINNED) {
    test(`reloading inside #${sectionId} returns to the top, not past it`, async ({
      page,
    }) => {
      await page.goto(`episodes/${slug}/`);

      // Wait for the scene to grow into its tall pinned form (>= 2 viewports).
      const sectionHeight = () =>
        page.evaluate(
          (id) => document.getElementById(id)?.getBoundingClientRect().height ?? 0,
          sectionId,
        );
      await expect
        .poll(sectionHeight, { timeout: 10_000 })
        .toBeGreaterThan(2 * 818);

      // Scroll deep into the pinned scene, then reload.
      await page.evaluate((id) => {
        const top = document.getElementById(id)!.offsetTop;
        window.scrollTo(0, top + 900);
      }, sectionId);
      await page.reload();

      // After reload: manual restoration lands us at the top, so the scene is
      // reached by scrolling down — never skipped past.
      await page.waitForTimeout(400);
      const scrollY = await page.evaluate(() => Math.round(window.scrollY));
      expect(scrollY, "reload should land at the top").toBeLessThan(10);
    });

    test(`#${sectionId} canvas renders when scrolled into view`, async ({ page }) => {
      await page.goto(`episodes/${slug}/`);
      await expect
        .poll(
          () =>
            page.evaluate(
              (id) => document.getElementById(id)?.getBoundingClientRect().height ?? 0,
              sectionId,
            ),
          { timeout: 10_000 },
        )
        .toBeGreaterThan(2 * 818);

      await page.evaluate((id) => {
        const top = document.getElementById(id)!.offsetTop;
        window.scrollTo(0, top + 900);
      }, sectionId);

      const canvas = page.locator(`#${sectionId} canvas`);
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(0);
      expect(box?.height ?? 0).toBeGreaterThan(0);
    });
  }
});

test.describe("deep links and interaction", () => {
  // NB: load-time hash deep-links (e.g. `…/how-ai-reads-the-web/#debrief`) can't
  // be validated against the dev server — dev ships an empty `#root`, so the
  // browser's fragment scroll finds no target before React hydrates and never
  // retries. Production ships prerendered HTML where the target exists on load,
  // so this is a dev-only artifact, not app behavior. See NOTES.md.

  test("series footer nav links to the next episode (BASE_URL routing)", async ({
    page,
  }) => {
    await page.goto("episodes/how-an-agent-works/");
    const nav = page.getByRole("navigation", { name: "Episode navigation" });
    await nav.scrollIntoViewIfNeeded();
    await nav.getByRole("link", { name: /Next/ }).click();
    await expect(page).toHaveURL(/\/episodes\/where-agents-go-wrong\/$/);
    await expect(page).toHaveTitle(/where agents go wrong/i);
  });

  test("replay engine: jump-to-end reaches the end (Ep 01)", async ({ page }) => {
    await page.goto("episodes/how-an-agent-works/");
    await page.getByRole("group", { name: "Replay controls" }).scrollIntoViewIfNeeded();
    const controls = page.getByRole("group", { name: "Replay controls" });
    await expect(controls).toBeVisible();

    const jumpEnd = controls.getByRole("button", { name: "Jump to end" });
    const jumpStart = controls.getByRole("button", { name: "Jump to start" });

    await expect(jumpStart).toBeDisabled(); // starts at the beginning
    await jumpEnd.click();
    await expect(jumpEnd).toBeDisabled(); // now at the end
    await expect(jumpStart).toBeEnabled();
  });
});

test.describe("responsive", () => {
  test("no horizontal overflow at mobile width (Ep 02)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("episodes/how-ai-reads-the-web/");
    await scrollThrough(page);
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return de.scrollWidth - de.clientWidth;
    });
    expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
  });
});
