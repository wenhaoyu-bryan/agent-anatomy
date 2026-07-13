/**
 * Resolves once the main thread has gone idle (with a fallback timeout).
 * Heavy chunks (three.js, gsap, lenis) load behind this so parsing them
 * never blocks first paint or first interaction (PLAN §8 perf budget).
 */
export function whenIdle(timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => resolve(), { timeout: timeoutMs });
    } else {
      setTimeout(resolve, Math.min(timeoutMs, 1200));
    }
  });
}
