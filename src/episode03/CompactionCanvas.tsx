import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { CATEGORY_HEX, GL_COLORS, type Category } from "../episode/gl/palette";
import { mulberry32 } from "../episode/gl/demoStream";

/**
 * S3 — the compaction clip (Episode 03's distribution asset). A self-contained,
 * scroll-scrubbed telling of the episode's signature moment, sharing the box +
 * particle grammar of the replay's condensation scene (CondensationCanvas) but
 * driven purely by scroll `progress` so it produces a clean 15-second recording:
 *
 *   fill (0 → ~0.45): the research burst pours into the window, bottom-up, until
 *   it is crowded and colorful. Then condense (~0.5 → 1): those reads draw down,
 *   flare once, and collapse into a single dense block — smaller AND rendered
 *   dim + desaturated grey, the visual grammar for lossy compression.
 *
 * Everything is a pure function of `progress` (read from a ref each frame), so
 * any scroll position renders correctly and scrubbing back just re-evaluates —
 * no persistent animation state, no flares to replay.
 */

const READS = 520; // colorful research particles that fill the window
const SUMMARY = 132; // the dense grey block they collapse into (~4× smaller)

const BOX = { w: 5.6, h: 4.0, d: 2.0 };
// The dense summary sits low and center — small on purpose.
const BLOCK = { cx: 0, cy: -BOX.h / 2 + 0.85, cz: 0, rx: 0.85, ry: 0.5, rz: 0.45 };

const FILL_END = 0.42; // reads have all arrived by here
const APPEAR_W = 0.14; // per-particle fly-in window
const CONDENSE_START = 0.5; // crowded window holds through here, then collapses

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Distribution echoing the Tokyo research burst: mostly tool reads (cyan),
// some thinking (amber), the opening request (coral), a little assistant (green).
const READ_MIX: Category[] = ["tool", "tool", "tool", "tool", "thinking", "user", "assistant"];

interface Model {
  settle: Float32Array; // resting slot for each read, bottom-up
  target: Float32Array; // block point each read collapses toward
  threshold: Float32Array; // per-read fly-in stagger 0..1
  colors: THREE.Color[]; // read colors
  block: Float32Array; // summary particle positions (grey block)
}

function buildModel(): Model {
  const rnd = mulberry32(0x03_c0_de);
  const usableH = BOX.h - 0.6;
  const perLayer = Math.max(1, Math.ceil(READS / 20));
  const layers = READS / perLayer;

  const blockPoint = (): [number, number, number] => {
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

  const settle = new Float32Array(READS * 3);
  const target = new Float32Array(READS * 3);
  const threshold = new Float32Array(READS);
  const colors: THREE.Color[] = [];
  for (let i = 0; i < READS; i++) {
    settle[i * 3] = (rnd() * 2 - 1) * (BOX.w / 2 - 0.22);
    settle[i * 3 + 1] = -BOX.h / 2 + 0.3 + (Math.floor(i / perLayer) / layers) * usableH + (rnd() - 0.5) * 0.1;
    settle[i * 3 + 2] = (rnd() * 2 - 1) * (BOX.d / 2 - 0.2);
    const [tx, ty, tz] = blockPoint();
    target[i * 3] = tx;
    target[i * 3 + 1] = ty;
    target[i * 3 + 2] = tz;
    // Lower strata arrive first, so the fill visibly stacks upward.
    threshold[i] = clamp01(i / READS + (rnd() - 0.5) * 0.12);
    const cat = READ_MIX[Math.floor(rnd() * READ_MIX.length)]!;
    colors.push(new THREE.Color(CATEGORY_HEX[cat]));
  }

  const block = new Float32Array(SUMMARY * 3);
  for (let i = 0; i < SUMMARY; i++) {
    const [bx, by, bz] = blockPoint();
    block[i * 3] = bx;
    block[i * 3 + 1] = by;
    block[i * 3 + 2] = bz;
  }

  return { settle, target, threshold, colors, block };
}

function CompactionScene({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const model = useMemo(() => buildModel(), []);
  const cap = READS + SUMMARY;

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fitZ = (BOX.w / 2 + 1.0) / (Math.tan((45 / 2) * (Math.PI / 180)) * aspect);
    camera.position.set(0.2, 0.65, Math.max(9.0, fitZ));
    camera.lookAt(0, -0.35, 0);
  }, [camera, size]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const grey = useMemo(() => new THREE.Color(CATEGORY_HEX.system), []);

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

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const p = clamp01(progressRef.current);
    const tau = easeInOut(clamp01((p - CONDENSE_START) / (1 - CONDENSE_START)));

    // Reads: fill in over [0, FILL_END], hold, then collapse over the condense span.
    for (let i = 0; i < READS; i++) {
      const px = model.settle[i * 3]!;
      const py = model.settle[i * 3 + 1]!;
      const pz = model.settle[i * 3 + 2]!;

      if (tau <= 0) {
        const arrive = model.threshold[i]! * (FILL_END - APPEAR_W);
        const a = clamp01((p - arrive) / APPEAR_W);
        if (a <= 0.001) {
          hide(i);
          continue;
        }
        const glow = 1 + 2.0 * (1 - a); // HDR arrival spike → bloom
        tmp.copy(model.colors[i]!).multiplyScalar(glow);
        place(i, px, py - (1 - a) * 0.4, pz, a, tmp);
        continue;
      }

      if (tau >= 1) {
        hide(i);
        continue;
      }
      // Converge on the block, flare once, shrink away.
      let scale = 1 - 0.5 * tau;
      if (tau > 0.75) scale *= 1 - (tau - 0.75) / 0.25;
      if (scale <= 0.02) {
        hide(i);
        continue;
      }
      const flare = 1 + 1.5 * Math.sin(tau * Math.PI);
      tmp.copy(model.colors[i]!).multiplyScalar(flare);
      place(
        i,
        lerp(px, model.target[i * 3]!, tau),
        lerp(py, model.target[i * 3 + 1]!, tau),
        lerp(pz, model.target[i * 3 + 2]!, tau),
        scale,
        tmp,
      );
    }

    // Summary: absent until the collapse, then grows in — dim + desaturated grey.
    for (let j = 0; j < SUMMARY; j++) {
      const idx = READS + j;
      if (tau <= 0.02) {
        hide(idx);
        continue;
      }
      const scale = 0.15 + 0.85 * tau;
      tmp.copy(grey).multiplyScalar(0.55 + 0.15 * Math.sin(tau * Math.PI));
      place(idx, model.block[j * 3]!, model.block[j * 3 + 1]!, model.block[j * 3 + 2]!, scale, tmp);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Bounded window: translucent volume, hairline edges (§6). */}
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

/** The scroll-scrubbed compaction canvas (lazy, client-only). */
export default function CompactionCanvas({
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
      <CompactionScene progressRef={progressRef} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
