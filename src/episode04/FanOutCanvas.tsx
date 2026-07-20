import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { CATEGORY_HEX, GL_COLORS, type Category } from "../episode/gl/palette";
import { mulberry32 } from "../episode/gl/demoStream";

/**
 * S3 — the fan-out clip (Episode 04's distribution asset). A self-contained,
 * scroll-scrubbed telling of the episode's signature moment: one window's task
 * splits into three briefs, three fresh windows bloom beside it, and they fill
 * in parallel — each with its own rhythm, all in the fixed §6 palette. End
 * state: three healthy part-full windows where one drowning window would have
 * been. Composed for a clean ~15-second recording.
 *
 *   task (0 → 0.18): three briefs sit clustered in the lead window, bright.
 *   split (0.18 → 0.40): they fly apart to three helper windows, which bloom in.
 *   fill (0.40 → 1): each helper window fills bottom-up, staggered per lane —
 *   venue fastest and fullest, invites lightest, mirroring the trace's lanes.
 *
 * Everything is a pure function of `progress` (read from a ref each frame), so
 * any scroll position renders correctly and scrubbing back just re-evaluates.
 */

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const smooth = (a: number, b: number, x: number) => easeInOut(clamp01((x - a) / (b - a)));

const SPLIT_START = 0.18;
const SPLIT_END = 0.4;
const APPEAR = 0.16; // per-particle fly-in fraction, within a lane's fill span

const LEAD = { cx: -2.75, cy: 0, w: 2.5, h: 3.2, d: 1.6 };

interface Lane {
  cx: number;
  cy: number;
  w: number;
  h: number;
  d: number;
  count: number;
  fillStart: number;
  fillEnd: number;
}

// Distinct rhythms + fills per lane, echoing the trace (VENUE 730 > FOOD 630 >
// INVITES 230): venue starts first and fills fullest, invites last and lightest.
const LANES: Lane[] = [
  { cx: 2.6, cy: 1.9, w: 2.1, h: 1.55, d: 1.2, count: 92, fillStart: 0.4, fillEnd: 0.86 },
  { cx: 2.6, cy: 0.0, w: 2.1, h: 1.55, d: 1.2, count: 78, fillStart: 0.46, fillEnd: 0.94 },
  { cx: 2.6, cy: -1.9, w: 2.1, h: 1.55, d: 1.2, count: 48, fillStart: 0.52, fillEnd: 1.0 },
];

// Helpers do search / fetch / thinking — tool cyan mostly, some amber thinking.
const MIX: Category[] = ["tool", "tool", "tool", "thinking", "tool", "thinking"];

interface Model {
  seedStart: Float32Array; // 3 briefs, clustered in the lead window
  seedEnd: Float32Array; // where each brief lands (its helper window floor)
  fill: Float32Array; // world settle slot per fill particle
  laneOf: Uint8Array; // which lane each fill particle belongs to
  order: Float32Array; // 0..1 arrival order within its lane (bottom-up)
  colors: THREE.Color[]; // fill particle colors
  offset: number[]; // instance offset where each lane's fill begins
}

function buildModel(): Model {
  const rnd = mulberry32(0x04_fa_11);
  const total = LANES.reduce((n, l) => n + l.count, 0);

  const seedStart = new Float32Array(9);
  const seedEnd = new Float32Array(9);
  for (let h = 0; h < 3; h++) {
    // Clustered near the lead centre, lightly separated so three reads apart.
    seedStart[h * 3] = LEAD.cx + (rnd() - 0.5) * 0.4;
    seedStart[h * 3 + 1] = LEAD.cy + (h - 1) * 0.42 + (rnd() - 0.5) * 0.15;
    seedStart[h * 3 + 2] = (rnd() - 0.5) * 0.3;
    const lane = LANES[h]!;
    seedEnd[h * 3] = lane.cx;
    seedEnd[h * 3 + 1] = lane.cy - lane.h / 2 + 0.28;
    seedEnd[h * 3 + 2] = 0;
  }

  const fill = new Float32Array(total * 3);
  const laneOf = new Uint8Array(total);
  const order = new Float32Array(total);
  const colors: THREE.Color[] = [];
  const offset: number[] = [];

  let k = 0;
  LANES.forEach((lane, h) => {
    offset.push(k);
    const usableH = lane.h - 0.4;
    const perLayer = Math.max(1, Math.ceil(lane.count / 9));
    const layers = lane.count / perLayer;
    for (let i = 0; i < lane.count; i++) {
      fill[k * 3] = lane.cx + (rnd() * 2 - 1) * (lane.w / 2 - 0.16);
      fill[k * 3 + 1] =
        lane.cy - lane.h / 2 + 0.22 + (Math.floor(i / perLayer) / layers) * usableH + (rnd() - 0.5) * 0.06;
      fill[k * 3 + 2] = (rnd() * 2 - 1) * (lane.d / 2 - 0.12);
      laneOf[k] = h;
      order[k] = clamp01(i / lane.count + (rnd() - 0.5) * 0.08);
      colors.push(new THREE.Color(CATEGORY_HEX[MIX[Math.floor(rnd() * MIX.length)]!]));
      k++;
    }
  });

  return { seedStart, seedEnd, fill, laneOf, order, colors, offset };
}

function arc(
  sx: number,
  sy: number,
  sz: number,
  ex: number,
  ey: number,
  ez: number,
  t: number,
): [number, number, number] {
  // Quadratic bezier with the control point lifted for a gentle hand-off arc.
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2 + 0.9;
  const mz = (sz + ez) / 2;
  const u = 1 - t;
  return [
    u * u * sx + 2 * u * t * mx + t * t * ex,
    u * u * sy + 2 * u * t * my + t * t * ey,
    u * u * sz + 2 * u * t * mz + t * t * ez,
  ];
}

function FanOutScene({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const model = useMemo(() => buildModel(), []);
  const cap = 3 + model.colors.length;

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const halfW = 4.0;
    const halfH = 2.9;
    const fov = 45;
    const fitH = halfH / Math.tan((fov / 2) * (Math.PI / 180));
    const fitW = halfW / (Math.tan((fov / 2) * (Math.PI / 180)) * aspect);
    camera.position.set(0, 0, Math.max(9.5, fitH, fitW));
    camera.lookAt(0, 0, 0);
  }, [camera, size]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const laneGroups = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const seedColor = useMemo(() => new THREE.Color(CATEGORY_HEX.tool), []);

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
    dummy.position.set(0, -60, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const p = clamp01(progressRef.current);

    // Helper windows bloom in as their brief arrives (staggered per lane).
    LANES.forEach((_, h) => {
      const g = laneGroups[h]!.current;
      if (g) g.scale.setScalar(smooth(SPLIT_START + h * 0.05, SPLIT_END, p));
    });

    // Three briefs: clustered task → fly out → land on each window's floor.
    for (let h = 0; h < 3; h++) {
      const sx = model.seedStart[h * 3]!;
      const sy = model.seedStart[h * 3 + 1]!;
      const sz = model.seedStart[h * 3 + 2]!;
      const ex = model.seedEnd[h * 3]!;
      const ey = model.seedEnd[h * 3 + 1]!;
      const ez = model.seedEnd[h * 3 + 2]!;
      if (p < SPLIT_START) {
        const pulse = 1.5 + 0.5 * Math.sin(p * 30 + h);
        place(h, sx, sy, sz, 0.95, tmp.copy(seedColor).multiplyScalar(pulse));
      } else if (p < SPLIT_END) {
        const t = smooth(SPLIT_START + h * 0.05, SPLIT_END, p);
        const [x, y, z] = arc(sx, sy, sz, ex, ey, ez, t);
        const flare = 1 + 1.6 * Math.sin(t * Math.PI);
        place(h, x, y, z, 0.95 - 0.35 * t, tmp.copy(seedColor).multiplyScalar(flare));
      } else {
        // Landed: a settled first item on the window floor, calm.
        place(h, ex, ey, ez, 0.6, tmp.copy(seedColor).multiplyScalar(0.9));
      }
    }

    // Fill particles: each lane fills bottom-up across its own span.
    for (let j = 0; j < model.colors.length; j++) {
      const idx = 3 + j;
      const lane = LANES[model.laneOf[j]!]!;
      const local = clamp01((p - lane.fillStart) / (lane.fillEnd - lane.fillStart));
      const arriveAt = model.order[j]! * (1 - APPEAR);
      const a = clamp01((local - arriveAt) / APPEAR);
      if (a <= 0.001) {
        hide(idx);
        continue;
      }
      const glow = 1 + 2.0 * (1 - a); // HDR arrival spike → bloom
      tmp.copy(model.colors[j]!).multiplyScalar(glow);
      place(
        idx,
        model.fill[j * 3]!,
        model.fill[j * 3 + 1]! - (1 - a) * 0.35,
        model.fill[j * 3 + 2]!,
        a,
        tmp,
      );
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* The lead window: always present, a calm bounded volume (§6). */}
      <mesh position={[LEAD.cx, LEAD.cy, 0]}>
        <boxGeometry args={[LEAD.w, LEAD.h, LEAD.d]} />
        <meshBasicMaterial color={GL_COLORS.tool} transparent opacity={0.02} depthWrite={false} />
        <Edges color={GL_COLORS.hairline} />
      </mesh>

      {/* Three helper windows that bloom in from nothing. */}
      {LANES.map((lane, h) => (
        <group key={h} ref={laneGroups[h]} position={[lane.cx, lane.cy, 0]} scale={0}>
          <mesh>
            <boxGeometry args={[lane.w, lane.h, lane.d]} />
            <meshBasicMaterial color={GL_COLORS.tool} transparent opacity={0.02} depthWrite={false} />
            <Edges color={GL_COLORS.hairline} />
          </mesh>
        </group>
      ))}

      <instancedMesh ref={meshRef} args={[undefined, undefined, cap]} frustumCulled={false}>
        <icosahedronGeometry args={[0.055, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** The scroll-scrubbed fan-out canvas (lazy, client-only). */
export default function FanOutCanvas({
  progressRef,
  frameloop,
}: {
  progressRef: MutableRefObject<number>;
  frameloop: "always" | "never";
}) {
  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
      }}
    >
      <FanOutScene progressRef={progressRef} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
