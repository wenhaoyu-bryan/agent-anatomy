import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import type { StoreApi } from "zustand";
import type { ReplayStore } from "../episode/replay/store";
import type { Trace } from "../trace/schema";
import { CATEGORY_HEX, GL_COLORS, categoryOf } from "../episode/gl/palette";
import { mulberry32 } from "../episode/gl/demoStream";

/**
 * F2 — the eviction scene (PLAN §7, Episode 1.5 centerpiece). One token = one
 * particle. The window fills to the brim as the agent reads file after file;
 * then, at the `context_evicted` event, the oldest particles — the original
 * request and the first reads — glow, detach, and rain out the bottom while the
 * survivors sink to fill the drained space. Early memory dissolving while the
 * agent keeps working: the 15-second clip.
 *
 * Deterministic and scrub-safe: positions are seeded, eviction progress eases
 * toward a target derived from the cursor, and rewinding snaps cleanly.
 *
 * Assumes the evicted events are the oldest contiguous block (true for F2), so
 * the survivors can sink by a single drained height instead of reflowing.
 */

const BOX = { w: 5.6, h: 4.0, d: 2.0 };
const APPEAR_DUR = 0.5; // fly/fade-in per particle
const EVICT_DUR = 2.2; // how long the eviction ejection takes
const EVICT_STAGGER = 0.35; // bottom-most evicted leave first — a falling cascade

interface Particle {
  color: THREE.Color;
  evicted: boolean;
  /** Event index at which this particle enters the window. */
  arriveFrame: number;
}

interface ParticleModel {
  particles: Particle[];
  cap: number;
  evictedCount: number;
  evictFrame: number;
  /** arrivedAt[f + 1] = particles present by cursor f (index -1 → 0). */
  arrivedAt: number[];
}

function buildModel(trace: Trace): ParticleModel {
  const evictedIds = new Set<string>();
  for (const event of trace.events) {
    if (event.type === "context_evicted") {
      for (const id of event.evictedEventIds) evictedIds.add(id);
    }
  }

  const particles: Particle[] = [];
  let evictFrame = trace.events.length;
  trace.events.forEach((event, index) => {
    if (event.type === "context_evicted") {
      if (evictFrame === trace.events.length) evictFrame = index;
      return;
    }
    const color = new THREE.Color(CATEGORY_HEX[categoryOf(event.type)]);
    const evicted = evictedIds.has(event.id);
    for (let t = 0; t < event.tokens; t++) {
      particles.push({ color, evicted, arriveFrame: index });
    }
  });

  const cap = particles.length;
  const evictedCount = particles.filter((p) => p.evicted).length;

  // Cumulative arrivals, indexed by cursor + 1 (cursor -1 → 0 present).
  const arrivedAt: number[] = new Array(trace.events.length + 1).fill(0);
  for (let f = 0; f < trace.events.length; f++) {
    arrivedAt[f + 1] = particles.filter((p) => p.arriveFrame <= f).length;
  }

  return { particles, cap, evictedCount, evictFrame, arrivedAt };
}

function EvictionScene({ storeApi }: { storeApi: StoreApi<ReplayStore> }) {
  const trace = storeApi.getState().trace;
  const model = useMemo(() => buildModel(trace), [trace]);
  const { particles, cap, evictedCount, evictFrame, arrivedAt } = model;

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fitZ = (BOX.w / 2 + 1.0) / (Math.tan((45 / 2) * (Math.PI / 180)) * aspect);
    camera.position.set(0.2, 0.65, Math.max(9.0, fitZ));
    camera.lookAt(0, -0.35, 0);
  }, [camera, size]);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Deterministic settle positions: strata fill bottom-up. usableH maps the
  // full particle count to the box, so the brim is ~full at peak.
  const geom = useMemo(() => {
    const rnd = mulberry32(1337);
    const usableH = BOX.h - 0.5;
    const perLayer = Math.max(1, Math.ceil(cap / 22));
    const layers = cap / perLayer;
    const pos = new Float32Array(cap * 3);
    const drop = new Float32Array(cap); // extra fall distance for evicted exits
    const drift = new Float32Array(cap); // sideways drift on exit
    for (let i = 0; i < cap; i++) {
      pos[i * 3] = (rnd() * 2 - 1) * (BOX.w / 2 - 0.22);
      pos[i * 3 + 1] =
        -BOX.h / 2 + 0.25 + (Math.floor(i / perLayer) / layers) * usableH + (rnd() - 0.5) * 0.1;
      pos[i * 3 + 2] = (rnd() * 2 - 1) * (BOX.d / 2 - 0.2);
      drop[i] = 1.4 + rnd() * 0.9;
      drift[i] = (rnd() - 0.5) * 0.8;
    }
    const drainY = (evictedCount / cap) * usableH;
    return { pos, drop, drift, drainY };
  }, [cap, evictedCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const sim = useRef({ placed: 0, appearT0: new Float32Array(cap), tau: 0, init: false });

  const cursorNow = () => storeApi.getState().frame.index;
  const arrivedNow = () => arrivedAt[Math.max(0, Math.min(arrivedAt.length - 1, cursorNow() + 1))]!;

  const place = (i: number, x: number, y: number, z: number, scale: number, color: THREE.Color) => {
    const mesh = meshRef.current!;
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color);
  };

  const hide = (i: number) => {
    const mesh = meshRef.current!;
    dummy.position.set(0, -50, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = clock.elapsedTime;
    const s = sim.current;
    const arrived = arrivedNow();
    const cursor = cursorNow();
    const tauTarget = cursor >= evictFrame ? 1 : 0;

    // First frame: land the current state instantly (a mid-scrub mount must not
    // replay the whole fill or eviction).
    if (!s.init) {
      s.tau = tauTarget;
      s.placed = arrived;
      for (let i = 0; i < cap; i++) s.appearT0[i] = -APPEAR_DUR; // already settled
      s.init = true;
    }

    // Forward: ease the eviction in. Rewind: snap instantly (like the fill),
    // so scrubbing back never replays 1,408 flares at once and blows out bloom.
    const step = 1 / (EVICT_DUR * 60);
    if (s.tau < tauTarget) s.tau = Math.min(tauTarget, s.tau + step);
    else if (s.tau > tauTarget) s.tau = tauTarget;
    const tau = s.tau;

    // Arrival bookkeeping: stagger fly-ins for newly arrived particles; hide on
    // rewind. Bursts of hundreds get a short spread so the fill reads as motion.
    if (arrived > s.placed) {
      const diff = arrived - s.placed;
      const spread = Math.min(0.6, Math.max(0.15, 90 / diff));
      for (let k = 0; k < diff; k++) s.appearT0[s.placed + k] = now + (k / diff) * spread;
      s.placed = arrived;
    } else if (arrived < s.placed) {
      s.placed = arrived;
    }

    for (let i = 0; i < cap; i++) {
      if (i >= arrived) {
        hide(i);
        continue;
      }
      const p = particles[i]!;
      let x = geom.pos[i * 3]!;
      let y = geom.pos[i * 3 + 1]!;
      const z = geom.pos[i * 3 + 2]!;
      let scale = 1;

      if (p.evicted) {
        // Staggered exit: bottom-most (lower i) leave a touch earlier.
        const local = Math.min(
          1,
          Math.max(0, tau * (1 + EVICT_STAGGER) - (i / evictedCount) * EVICT_STAGGER),
        );
        if (local >= 1) {
          hide(i);
          continue;
        }
        // Sinks toward the floor while fading and flaring (HDR → bloom) in its
        // own colour — brightest at the instant of leaving, then it dissolves
        // downward and is gone. Early memory fading out the bottom of the window.
        y -= local * (0.8 + geom.drop[i]! * 0.35);
        x += local * geom.drift[i]! * 0.5;
        scale = 1 - local * 0.95;
        // 1.0 at rest (local 0), glows through the exit, back to ~1 as it goes —
        // so nothing flares until eviction actually starts.
        const flare = 1 + 1.4 * Math.sin(local * Math.PI);
        tmp.copy(p.color).multiplyScalar(flare);
        place(i, x, y, z, scale, tmp);
        continue;
      }

      // Survivors sink into the drained space as the bottom dissolves.
      y -= tau * geom.drainY;

      // Fly / fade-in.
      const ap = Math.min(1, Math.max(0, (now - s.appearT0[i]!) / APPEAR_DUR));
      let glow = 1;
      if (ap < 1) {
        y -= (1 - ap) * 0.45;
        scale *= ap;
        glow = 1 + 2.1 * (1 - ap); // HDR while arriving → caught by bloom
      }

      tmp.copy(p.color).multiplyScalar(glow);
      place(i, x, y, z, scale, tmp);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Bounded volume: translucent, hairline edges (§6 — no glow abuse). */}
      <mesh>
        <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
        <meshBasicMaterial color={GL_COLORS.tool} transparent opacity={0.02} depthWrite={false} />
        <Edges color={GL_COLORS.hairline} />
      </mesh>
      <instancedMesh ref={meshRef} args={[undefined, undefined, cap]} frustumCulled={false}>
        <icosahedronGeometry args={[0.05, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** The F2 canvas (lazy, client-only). Sized to its container. */
export default function EvictionCanvas({ storeApi }: { storeApi: StoreApi<ReplayStore> }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
      }}
    >
      <EvictionScene storeApi={storeApi} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
