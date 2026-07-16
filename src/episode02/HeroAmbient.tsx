import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { SceneA } from "../episode/gl/SceneA";
import { useGlReady } from "./useGlReady";

/**
 * Hero ambient (S1) — the same quiet drifting field + loop motif as Episode 01,
 * so the series reads as one identity. Its own in-flow canvas (not Ep 01's
 * tracked-overlay slot machinery), client-only after idle; SSR and reduced
 * motion show just the telemetry grid behind it. Frameloop pauses once the hero
 * scrolls off-screen (§8 — no rendering offscreen scenes).
 */
export function HeroAmbient() {
  const ready = useGlReady();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  if (!ready) return null;
  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden="true">
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 45, near: 0.1, far: 60 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
        }}
      >
        <SceneA />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1} intensity={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
