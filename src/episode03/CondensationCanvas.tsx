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
 * S3 + S5 — the condensation scene (Episode 03 centerpiece). One token = one
 * particle, filling a bounded window bottom-up. Two beats carry the episode:
 *
 *  - Compaction: the six research reads (1,730 tokens) that the agent chose to
 *    compress detach from their strata, converge on the floor, flare once, and
 *    collapse into a small, dim, DESATURATED grey block — the summary. Smaller
 *    and lossier than what it replaced: the point of the whole episode.
 *
 *  - Session break: the next day, the window VISIBLY EMPTIES. Every surviving
 *    particle rises and fades to nothing. (The memory file that outlives it is
 *    the DOM panel's job — this canvas only shows the window.) Then session B
 *    refills the drained box from scratch.
 *
 * Deterministic and scrub-safe, like F2's eviction scene: settle positions are
 * seeded; the condense and empty transitions ease toward a target derived from
 * the cursor; rewinding snaps cleanly instead of replaying every flare.
 */

const BOX = { w: 5.6, h: 4.0, d: 2.0 };
const APPEAR_DUR = 0.5; // fly/fade-in per particle
const CONDENSE_DUR = 2.0; // how long the compaction collapse takes
const EMPTY_DUR = 1.6; // how long the window takes to drain at the session break

// The dense summary block sits low and center — small on purpose.
const BLOCK = { cx: 0, cy: -BOX.h / 2 + 0.85, cz: 0, rx: 0.85, ry: 0.5, rz: 0.45 };

interface Particle {
  color: THREE.Color;
  /** Event index at which this particle enters the window. */
  arriveFrame: number;
  /** For a compacted read: the compaction event's index; else null. */
  compactFrame: number | null;
  /** For a particle a later session_break clears: that break's index; else null. */
  clearFrame: number | null;
  /** True for the summary particles the compaction produces. */
  isSummary: boolean;
  /** Session group (0-based), used to stratify each fill independently. */
  group: number;
}

interface Model {
  particles: Particle[];
  cap: number;
  compactFrame: number | null;
  breakFrame: number | null;
}

function buildModel(trace: Trace): Model {
  const events = trace.events;
  const breakIndices: number[] = [];
  events.forEach((e, i) => {
    if (e.type === "session_break") breakIndices.push(i);
  });
  const nextBreak = (i: number): number | null =>
    breakIndices.find((b) => b > i) ?? null;
  const sessionOf = (i: number): number => breakIndices.filter((b) => b < i).length;

  // eventId → the compaction index that replaces it.
  const compactedBy = new Map<string, number>();
  events.forEach((e, i) => {
    if (e.type === "compaction") {
      for (const id of e.replacesEventIds) compactedBy.set(id, i);
    }
  });

  const particles: Particle[] = [];
  let compactFrame: number | null = null;
  let breakFrame: number | null = breakIndices[0] ?? null;

  events.forEach((event, index) => {
    if (event.type === "session_break" || event.type === "context_evicted") return;
    if (event.type === "compaction") {
      if (compactFrame === null) compactFrame = index;
      const color = new THREE.Color(CATEGORY_HEX.system);
      for (let t = 0; t < event.tokens; t++) {
        particles.push({
          color,
          arriveFrame: index,
          compactFrame: index,
          clearFrame: nextBreak(index),
          isSummary: true,
          group: sessionOf(index),
        });
      }
      return;
    }
    const color = new THREE.Color(CATEGORY_HEX[categoryOf(event.type)]);
    const compacted = compactedBy.get(event.id) ?? null;
    for (let t = 0; t < event.tokens; t++) {
      particles.push({
        color,
        arriveFrame: index,
        compactFrame: compacted,
        clearFrame: compacted === null ? nextBreak(index) : null,
        isSummary: false,
        group: sessionOf(index),
      });
    }
  });

  return { particles, cap: particles.length, compactFrame, breakFrame };
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function CondensationScene({ storeApi }: { storeApi: StoreApi<ReplayStore> }) {
  const trace = storeApi.getState().trace;
  const model = useMemo(() => buildModel(trace), [trace]);
  const { particles, cap, compactFrame, breakFrame } = model;

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fitZ = (BOX.w / 2 + 1.0) / (Math.tan((45 / 2) * (Math.PI / 180)) * aspect);
    camera.position.set(0.2, 0.65, Math.max(9.0, fitZ));
    camera.lookAt(0, -0.35, 0);
  }, [camera, size]);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Deterministic geometry: settle position (strata per session), the block
  // target a compacted particle collapses toward, exit drift, and fly-in jitter.
  const geom = useMemo(() => {
    const rnd = mulberry32(4211);
    const usableH = BOX.h - 0.6;
    // Count non-summary particles per group so each session fills bottom-up.
    const groupCount = new Map<number, number>();
    for (const p of particles) {
      if (!p.isSummary) groupCount.set(p.group, (groupCount.get(p.group) ?? 0) + 1);
    }
    const groupRank = new Map<number, number>();

    const blockPoint = (): [number, number, number] => {
      // Roughly uniform point in the summary ellipsoid.
      const u = rnd() * 2 - 1;
      const v = rnd() * 2 - 1;
      const w = rnd() * 2 - 1;
      const r = Math.cbrt(rnd());
      const n = Math.max(1e-3, Math.hypot(u, v, w));
      return [
        BLOCK.cx + (u / n) * r * BLOCK.rx,
        BLOCK.cy + (v / n) * r * BLOCK.ry,
        BLOCK.cz + (w / n) * r * BLOCK.rz,
      ];
    };

    const pos = new Float32Array(cap * 3);
    const target = new Float32Array(cap * 3);
    const drift = new Float32Array(cap); // upward distance on session-break exit
    const driftX = new Float32Array(cap); // sideways drift on exit
    const jitter = new Float32Array(cap); // fly-in stagger

    for (let i = 0; i < cap; i++) {
      const p = particles[i]!;
      if (p.isSummary) {
        const [bx, by, bz] = blockPoint();
        pos[i * 3] = bx;
        pos[i * 3 + 1] = by;
        pos[i * 3 + 2] = bz;
      } else {
        const count = groupCount.get(p.group) ?? 1;
        const rank = groupRank.get(p.group) ?? 0;
        groupRank.set(p.group, rank + 1);
        const perLayer = Math.max(1, Math.ceil(count / 20));
        const layers = count / perLayer;
        pos[i * 3] = (rnd() * 2 - 1) * (BOX.w / 2 - 0.22);
        pos[i * 3 + 1] =
          -BOX.h / 2 + 0.3 + (Math.floor(rank / perLayer) / layers) * usableH + (rnd() - 0.5) * 0.1;
        pos[i * 3 + 2] = (rnd() * 2 - 1) * (BOX.d / 2 - 0.2);
      }
      const [tx, ty, tz] = blockPoint();
      target[i * 3] = tx;
      target[i * 3 + 1] = ty;
      target[i * 3 + 2] = tz;
      drift[i] = 1.0 + rnd() * 0.8;
      driftX[i] = (rnd() - 0.5) * 0.9;
      jitter[i] = rnd() * 0.4;
    }
    return { pos, target, drift, driftX, jitter };
  }, [cap, particles]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const sim = useRef({
    init: false,
    tauC: 0,
    tauB: 0,
    arrived: new Uint8Array(cap),
    appearT0: new Float32Array(cap),
  });

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
    const cursor = storeApi.getState().frame.index;

    const tauCTarget = compactFrame !== null && cursor >= compactFrame ? 1 : 0;
    const tauBTarget = breakFrame !== null && cursor >= breakFrame ? 1 : 0;

    // First frame: land the current state instantly (a mid-scrub mount must not
    // replay the whole fill, the collapse, or the drain).
    if (!s.init) {
      s.tauC = tauCTarget;
      s.tauB = tauBTarget;
      for (let i = 0; i < cap; i++) {
        s.arrived[i] = cursor >= particles[i]!.arriveFrame ? 1 : 0;
        s.appearT0[i] = -APPEAR_DUR;
      }
      s.init = true;
    }

    // Forward: ease. Rewind: snap (never replay hundreds of flares at once).
    const stepC = 1 / (CONDENSE_DUR * 60);
    s.tauC = s.tauC < tauCTarget ? Math.min(tauCTarget, s.tauC + stepC) : tauCTarget;
    const stepB = 1 / (EMPTY_DUR * 60);
    s.tauB = s.tauB < tauBTarget ? Math.min(tauBTarget, s.tauB + stepB) : tauBTarget;

    const tauC = easeInOut(s.tauC);
    const tauB = easeInOut(s.tauB);

    for (let i = 0; i < cap; i++) {
      const p = particles[i]!;
      const shouldArrive = cursor >= p.arriveFrame;
      if (shouldArrive && !s.arrived[i]) {
        s.appearT0[i] = now + geom.jitter[i]!;
        s.arrived[i] = 1;
      } else if (!shouldArrive && s.arrived[i]) {
        s.arrived[i] = 0;
      }
      if (!shouldArrive) {
        hide(i);
        continue;
      }

      const px = geom.pos[i * 3]!;
      const py = geom.pos[i * 3 + 1]!;
      const pz = geom.pos[i * 3 + 2]!;

      // Session break drains everything that lived in this session: rise + fade.
      if (p.clearFrame !== null && cursor >= p.clearFrame) {
        if (tauB >= 1) {
          hide(i);
          continue;
        }
        const scale = 1 - tauB;
        if (scale <= 0.02) {
          hide(i);
          continue;
        }
        tmp.copy(p.color).multiplyScalar(1 - 0.35 * tauB);
        place(
          i,
          px + geom.driftX[i]! * tauB * 0.7,
          py + tauB * (1.1 + geom.drift[i]! * 0.6),
          pz,
          scale,
          tmp,
        );
        continue;
      }

      // The summary block: grows in as the collapse completes, dim + desaturated
      // (grey) — smaller and lossier than the reads it stands in for.
      if (p.isSummary) {
        const scale = 0.15 + 0.85 * tauC;
        tmp.copy(p.color).multiplyScalar(0.6 + 0.15 * Math.sin(tauC * Math.PI));
        place(i, px, py, pz, scale, tmp);
        continue;
      }

      // A compacted read: converge on the block, flare once, then vanish.
      if (p.compactFrame !== null && cursor >= p.compactFrame) {
        if (tauC >= 1) {
          hide(i);
          continue;
        }
        let scale = 1 - tauC * 0.55;
        if (s.tauC > 0.8) scale *= 1 - (s.tauC - 0.8) / 0.2;
        if (scale <= 0.02) {
          hide(i);
          continue;
        }
        const flare = 1 + 1.5 * Math.sin(tauC * Math.PI);
        tmp.copy(p.color).multiplyScalar(flare);
        place(
          i,
          lerp(px, geom.target[i * 3]!, tauC),
          lerp(py, geom.target[i * 3 + 1]!, tauC),
          lerp(pz, geom.target[i * 3 + 2]!, tauC),
          scale,
          tmp,
        );
        continue;
      }

      // Settled, with a fly / fade-in (HDR glow while arriving → caught by bloom).
      let y = py;
      let scale = 1;
      let glow = 1;
      const ap = Math.min(1, Math.max(0, (now - s.appearT0[i]!) / APPEAR_DUR));
      if (ap < 1) {
        y -= (1 - ap) * 0.4;
        scale = ap;
        glow = 1 + 2.0 * (1 - ap);
      }
      tmp.copy(p.color).multiplyScalar(glow);
      place(i, px, y, pz, scale, tmp);
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

/** The condensation canvas (lazy, client-only). Sized to its container. */
export default function CondensationCanvas({ storeApi }: { storeApi: StoreApi<ReplayStore> }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
      }}
    >
      <CondensationScene storeApi={storeApi} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
