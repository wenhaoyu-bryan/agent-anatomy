import { Suspense, lazy, useEffect } from "react";
import { supportsWebGL, useGlStore } from "./glStore";

// three.js and friends stay out of the initial bundle; the canvas mounts
// after hydration, and the page is fully usable while (or if never) loading.
const TrackedCanvas = lazy(() => import("./TrackedCanvas"));

/**
 * Decides webgl vs fallback once on the client (SSR renders neither), then
 * lazy-mounts the single tracked canvas. Fallback = the DOM variants: 2D
 * context meter, static hero grid (PLAN §7).
 */
export function GlRoot() {
  const mode = useGlStore((s) => s.mode);
  const setMode = useGlStore((s) => s.setMode);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(!reduced && supportsWebGL() ? "webgl" : "fallback");
  }, [setMode]);

  if (mode !== "webgl") return null;
  return (
    <Suspense fallback={null}>
      <TrackedCanvas />
    </Suspense>
  );
}
