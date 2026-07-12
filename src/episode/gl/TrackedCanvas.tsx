import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { SceneA } from "./SceneA";
import { ContextScene } from "./ContextScene";
import { useGlStore } from "./glStore";

/**
 * The single WebGL canvas (PLAN §7). Fixed, pointer-transparent, overlaid
 * on whichever slot is currently visible; scenes are swapped by visibility
 * and the frameloop stops entirely when no slot is on screen (§8).
 */
export default function TrackedCanvas() {
  const activeSlot = useGlStore((s) => s.activeSlot);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Follow the active slot's rect every frame — the pinned S3 section and
  // normal scrolling both move slots continuously.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const wrapper = wrapperRef.current;
      const el = activeSlot ? useGlStore.getState().slotEls[activeSlot] : null;
      if (wrapper) {
        if (el) {
          const r = el.getBoundingClientRect();
          wrapper.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
          if (wrapper.style.width !== `${r.width}px`) wrapper.style.width = `${r.width}px`;
          if (wrapper.style.height !== `${r.height}px`) wrapper.style.height = `${r.height}px`;
          wrapper.style.opacity = "1";
        } else {
          wrapper.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeSlot]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[1]"
      style={{
        width: "100px",
        height: "100px",
        opacity: 0,
        transition: "opacity 220ms var(--ease-mechanical)",
      }}
    >
      <Canvas
        frameloop={activeSlot ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 45, near: 0.1, far: 60 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => {
            useGlStore.getState().setMode("fallback");
          });
        }}
      >
        {activeSlot === "hero" && <SceneA />}
        {activeSlot === "s3" && <ContextScene key="s3" mode="scroll" />}
        {activeSlot === "s4" && <ContextScene key="s4" mode="replay" />}
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1} intensity={0.75} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
