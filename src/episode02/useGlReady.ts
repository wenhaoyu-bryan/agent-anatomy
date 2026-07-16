import { useEffect, useState } from "react";
import { supportsWebGL } from "../episode/gl/glStore";

/**
 * True once it's safe to mount a WebGL canvas: the client supports WebGL, the
 * user hasn't asked for reduced motion, and the main thread has gone idle so
 * parsing three.js never blocks first interaction (mirrors GlRoot, §8). SSR
 * renders nothing, so scenes fall back to their DOM variants there.
 */
export function useGlReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !supportsWebGL()) return;

    let cancelled = false;
    const arm = () => {
      if (!cancelled) setReady(true);
    };
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(arm, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const id = setTimeout(arm, 1200);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  return ready;
}
