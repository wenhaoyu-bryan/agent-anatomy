import { Suspense, lazy, useEffect, useState } from "react";
import { supportsWebGL, useGlStore } from "./glStore";

// three.js and friends stay out of the initial bundle; the canvas mounts
// after hydration, and the page is fully usable while (or if never) loading.
const TrackedCanvas = lazy(() => import("./TrackedCanvas"));

/**
 * Decides webgl vs fallback once on the client (SSR renders neither), then
 * lazy-mounts the single tracked canvas — but only once the main thread is
 * idle, so parsing three.js never blocks first interaction (§8 perf).
 * Fallback = the DOM variants: 2D context meter, static hero grid (PLAN §7).
 */
export function GlRoot() {
  const mode = useGlStore((s) => s.mode);
  const setMode = useGlStore((s) => s.setMode);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(!reduced && supportsWebGL() ? "webgl" : "fallback");
  }, [setMode]);

  useEffect(() => {
    if (mode !== "webgl") return;
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setIdle(true), 1200);
    return () => clearTimeout(id);
  }, [mode]);

  if (mode !== "webgl" || !idle) return null;
  return (
    <Suspense fallback={null}>
      <TrackedCanvas />
    </Suspense>
  );
}
