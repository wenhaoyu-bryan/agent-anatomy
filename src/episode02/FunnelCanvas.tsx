import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { GL_COLORS } from "../episode/gl/palette";
import { mulberry32 } from "../episode/gl/demoStream";

/**
 * S3 — the funnel (Episode 02). Scroll-scrubbed narrowing: a wide field of
 * faint page-glyphs (the web) → ten light up (search results) → three are
 * drawn down (selected) → fragments stream out of them and settle into the
 * familiar bounded context window at the bottom. Same particle language as
 * Episode 01's context scene, so the two systems visibly connect.
 *
 * Deterministic and scrub-safe: everything is a pure function of `progress`
 * (0→1), read from a ref each frame, so any scroll position renders correctly
 * and rewinding just re-evaluates.
 */

const PAGES = 72;
const RESULTS = 10;
const SELECTED = 3;
const FRAGMENTS = 900;

const BOX = { w: 5.0, h: 3.0, d: 1.6, cy: -2.9 };
const MOUTH_Y = -1.5;
const MOUTH_X = [-1.4, 0, 1.4];

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeOut = (x: number): number => 1 - Math.pow(1 - x, 3);

interface Model {
  base: Float32Array; // page field positions
  isResult: boolean[];
  selectedRank: number[]; // -1, or 0..2 for the three selected
  settle: Float32Array; // fragment settle slots inside the box
  fragOrigin: number[]; // which selected page (0..2) each fragment leaves from
  threshold: Float32Array; // per-fragment stagger 0..1
}

function buildModel(): Model {
  const rnd = mulberry32(7_16_2026);
  const base = new Float32Array(PAGES * 3);
  for (let i = 0; i < PAGES; i++) {
    base[i * 3] = (rnd() * 2 - 1) * 6.4;
    base[i * 3 + 1] = 1.6 + rnd() * 3.2;
    base[i * 3 + 2] = (rnd() * 2 - 1) * 1.1;
  }
  // Seed-shuffle page indices; first RESULTS become results, first SELECTED of
  // those are selected.
  const order = [...Array(PAGES).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const isResult = new Array(PAGES).fill(false);
  const selectedRank = new Array(PAGES).fill(-1);
  for (let r = 0; r < RESULTS; r++) isResult[order[r]!] = true;
  for (let s = 0; s < SELECTED; s++) selectedRank[order[s]!] = s;

  const settle = new Float32Array(FRAGMENTS * 3);
  const fragOrigin: number[] = [];
  const threshold = new Float32Array(FRAGMENTS);
  const bottom = BOX.cy - BOX.h / 2 + 0.2;
  // Fragments pack into the lower ~62% of the window — a visible partial fill,
  // bottom-up, not a brim-full box.
  const fillH = (BOX.h - 0.4) * 0.62;
  for (let i = 0; i < FRAGMENTS; i++) {
    settle[i * 3] = (rnd() * 2 - 1) * (BOX.w / 2 - 0.28);
    settle[i * 3 + 1] = bottom + (i / FRAGMENTS) * fillH + (rnd() - 0.5) * 0.14;
    settle[i * 3 + 2] = (rnd() * 2 - 1) * (BOX.d / 2 - 0.28);
    fragOrigin.push(i % SELECTED);
    threshold[i] = rnd();
  }
  return { base, isResult, selectedRank, settle, fragOrigin, threshold };
}

function FunnelScene({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const model = useMemo(buildModel, []);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    // Frame the full vertical span (top pages to window floor); pull back on
    // narrow/portrait viewports so nothing clips.
    const z = aspect < 1 ? 17 : 13.2;
    camera.position.set(0, 0.4, z);
    camera.lookAt(0, 0.2, 0);
  }, [camera, size]);

  const pagesRef = useRef<THREE.InstancedMesh>(null);
  const fragRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const muted = useMemo(() => new THREE.Color(GL_COLORS.muted), []);
  const cyan = useMemo(() => new THREE.Color(GL_COLORS.tool), []);

  useFrame(() => {
    const pages = pagesRef.current;
    const frag = fragRef.current;
    if (!pages || !frag) return;
    const p = progressRef.current;

    // The web field is present from the start (no blank first pinned frame);
    // the narrowing is carried by brightness and motion, not a fade-in.
    const resultGlow = clamp01((p - 0.18) / 0.16);
    const selectMove = easeOut(clamp01((p - 0.4) / 0.18));
    // After selection, the results the agent didn't pick recede.
    const recede = clamp01((p - 0.52) / 0.16);
    const selFade = clamp01((p - 0.74) / 0.18);
    const extract = clamp01((p - 0.58) / 0.42);

    for (let i = 0; i < PAGES; i++) {
      const bx = model.base[i * 3]!;
      const by = model.base[i * 3 + 1]!;
      const bz = model.base[i * 3 + 2]!;
      const result = model.isResult[i]!;
      const rank = model.selectedRank[i]!;
      let x = bx;
      let y = by;
      let scale = 0.9;

      if (rank >= 0) {
        // Selected: drawn down to the window mouth, then emptied (its fragments
        // leave) and fully gone.
        x = bx + (MOUTH_X[rank]! - bx) * selectMove;
        y = by + (MOUTH_Y - by) * selectMove;
        scale *= 1 + 0.25 * resultGlow;
        scale *= 1 - selFade;
        col.copy(cyan);
      } else if (result) {
        // An unselected result: brightens with the rest, then dims back down.
        const g = resultGlow * (1 - 0.8 * recede);
        scale *= 1 + 0.32 * g;
        col.copy(muted).lerp(cyan, g);
      } else {
        // Unselected pages dim as attention narrows to the results.
        col.copy(muted).multiplyScalar(0.55 - 0.3 * resultGlow);
      }

      dummy.position.set(x, y, bz);
      dummy.scale.setScalar(Math.max(0.0001, scale));
      dummy.updateMatrix();
      pages.setMatrixAt(i, dummy.matrix);
      pages.setColorAt(i, col);
    }
    pages.instanceMatrix.needsUpdate = true;
    if (pages.instanceColor) pages.instanceColor.needsUpdate = true;

    for (let i = 0; i < FRAGMENTS; i++) {
      const local = clamp01((extract - model.threshold[i]! * 0.7) / 0.3);
      if (local <= 0) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        frag.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const k = model.fragOrigin[i]!;
      const ox = MOUTH_X[k]!;
      const oy = MOUTH_Y + 0.1;
      const e = easeOut(local);
      const x = ox + (model.settle[i * 3]! - ox) * e;
      const y = oy + (model.settle[i * 3 + 1]! - oy) * e;
      const z = model.settle[i * 3 + 2]! * e;
      // HDR spike mid-flight → caught by bloom; calm (×1) once settled.
      const flare = 1 + 1.7 * Math.sin(local * Math.PI);
      col.copy(cyan).multiplyScalar(flare);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.08 * (0.55 + 0.45 * local));
      dummy.updateMatrix();
      frag.setMatrixAt(i, dummy.matrix);
      frag.setColorAt(i, col);
    }
    frag.instanceMatrix.needsUpdate = true;
    if (frag.instanceColor) frag.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={pagesRef} args={[undefined, undefined, PAGES]} frustumCulled={false}>
        <planeGeometry args={[0.42, 0.54]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.92} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* The context window — the same bounded, hairline-edged volume as Ep 01. */}
      <mesh position={[0, BOX.cy, 0]}>
        <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
        <meshBasicMaterial color={GL_COLORS.tool} transparent opacity={0.02} depthWrite={false} />
        <Edges color={GL_COLORS.hairline} />
      </mesh>

      <instancedMesh ref={fragRef} args={[undefined, undefined, FRAGMENTS]} frustumCulled={false}>
        <icosahedronGeometry args={[0.05, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** The funnel canvas (lazy, client-only). Sized to its sticky container. */
export default function FunnelCanvas({
  progressRef,
  frameloop = "always",
}: {
  progressRef: MutableRefObject<number>;
  frameloop?: "always" | "never";
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
      <FunnelScene progressRef={progressRef} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
