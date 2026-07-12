import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { CATEGORY_HEX, GL_COLORS, categoryOf, type Category } from "./palette";
import { S3_DEMO_ITEMS, S3_DEMO_TOTAL, mulberry32 } from "./demoStream";
import { useGlStore } from "./glStore";
import { useReplayStore, episodeTrace } from "../replay/store";

/**
 * Scene B — the context window (PLAN §7). One token = one instanced
 * particle. Particles stream in along bezier paths from category sources,
 * glow while flying (HDR color > 1 → caught by the bloom pass), and settle
 * into loosely packed strata. In "scroll" mode the fill level is driven by
 * the pinned S3 section's scrub progress over seeded demo data; in "replay"
 * mode the same scene is fed by real replay events. Rewinds are instant —
 * settle positions are deterministic, so scrubbing never desyncs.
 */

const CAP = 4096;
const BOX = { w: 6.4, h: 4.2, d: 2.2 };
const PER_LAYER = 170;
const FLIGHT_DUR = 0.85;

const SOURCE_POS: Record<Category, [number, number, number]> = {
  system: [-4.7, 2.5, 0],
  user: [-5.1, 1.3, 0],
  thinking: [-5.2, 0.1, 0],
  tool: [-5.0, -1.2, 0],
  assistant: [-4.7, -2.3, 0],
};

interface Flight {
  i: number;
  t0: number;
  from: THREE.Vector3;
  ctrl: THREE.Vector3;
  to: THREE.Vector3;
  color: THREE.Color;
}

interface StreamItem {
  category: Category;
  tokens: number;
}

const REPLAY_ITEMS: StreamItem[] = episodeTrace.events.map((event) => ({
  category: categoryOf(event.type),
  tokens: event.tokens,
}));

interface FlatStream {
  colors: THREE.Color[];
  categories: Category[];
}

/** Per-token category + color, flattened from a stream of items. */
function flattenStream(items: StreamItem[]): FlatStream {
  const byCategory = Object.fromEntries(
    Object.entries(CATEGORY_HEX).map(([k, hex]) => [k, new THREE.Color(hex)]),
  ) as Record<Category, THREE.Color>;
  const colors: THREE.Color[] = [];
  const categories: Category[] = [];
  for (const item of items) {
    for (let t = 0; t < item.tokens && colors.length < CAP; t++) {
      colors.push(byCategory[item.category]);
      categories.push(item.category);
    }
  }
  return { colors, categories };
}

export function ContextScene({ mode }: { mode: "scroll" | "replay" }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  // In the pinned S3 the box sits right of the copy column; in the narrow
  // S4 panel (and on phones) the camera backs off so the box fits the aspect.
  const groupX = mode === "scroll" ? 2.1 : 0;
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fitZ = (BOX.w / 2 + 0.8) / (Math.tan((45 / 2) * (Math.PI / 180)) * aspect);
    camera.position.set(0.4 + groupX * 0.5, 0.55, Math.max(9.6, fitZ));
    camera.lookAt(groupX * 0.5, -0.1, 0);
  }, [camera, size, groupX]);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Deterministic settle positions: strata fill bottom-up; bursts of one
  // category land together, so colored layers emerge from arrival order.
  const settle = useMemo(() => {
    const rnd = mulberry32(42);
    const arr = new Float32Array(CAP * 3);
    const usableH = BOX.h - 0.5;
    const layers = CAP / PER_LAYER;
    for (let i = 0; i < CAP; i++) {
      arr[i * 3] = (rnd() * 2 - 1) * (BOX.w / 2 - 0.25);
      arr[i * 3 + 1] =
        -BOX.h / 2 + 0.25 + (Math.floor(i / PER_LAYER) / layers) * usableH + (rnd() - 0.5) * 0.1;
      arr[i * 3 + 2] = (rnd() * 2 - 1) * (BOX.d / 2 - 0.22);
    }
    return arr;
  }, []);

  const flat = useMemo(
    () => flattenStream(mode === "scroll" ? S3_DEMO_ITEMS : REPLAY_ITEMS),
    [mode],
  );

  const sim = useRef({ placed: 0, flights: [] as Flight[], initialized: false });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const targetNow = () => {
    if (mode === "scroll") {
      return Math.min(
        flat.colors.length,
        Math.round(useGlStore.getState().s3Progress * S3_DEMO_TOTAL),
      );
    }
    return Math.min(flat.colors.length, useReplayStore.getState().frame.tokensUsed);
  };

  const settleVec = (i: number) =>
    new THREE.Vector3(settle[i * 3]!, settle[i * 3 + 1]!, settle[i * 3 + 2]!);

  const writeSettled = (i: number) => {
    const mesh = meshRef.current!;
    dummy.position.set(settle[i * 3]!, settle[i * 3 + 1]!, settle[i * 3 + 2]!);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, flat.colors[i]!);
  };

  const writeHidden = (i: number) => {
    const mesh = meshRef.current!;
    dummy.position.set(0, 0, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = clock.elapsedTime;
    const s = sim.current;

    // First frame: hide everything, then land the current state instantly
    // (a mid-scrub S4 mount must not replay the whole fill).
    if (!s.initialized) {
      for (let i = 0; i < CAP; i++) writeHidden(i);
      const target = targetNow();
      for (let i = 0; i < target; i++) writeSettled(i);
      s.placed = target;
      s.initialized = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      return;
    }

    const target = targetNow();
    let dirtyMatrix = false;
    let dirtyColor = false;

    if (target < s.placed) {
      // Rewind: instant. Deterministic positions make this exact.
      for (let i = target; i < s.placed; i++) writeHidden(i);
      s.flights = s.flights.filter((f) => f.i < target);
      s.placed = target;
      dirtyMatrix = true;
    } else if (target > s.placed) {
      const diff = target - s.placed;
      const spacing = Math.min(0.05, Math.max(0.0035, 1.15 / diff));
      const rnd = mulberry32(s.placed * 7919 + 13);
      for (let k = 0; k < diff; k++) {
        const i = s.placed + k;
        const from = new THREE.Vector3(...SOURCE_POS[flat.categories[i] ?? "tool"]).add(
          new THREE.Vector3((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5),
        );
        const to = settleVec(i);
        const ctrl = from
          .clone()
          .lerp(to, 0.45)
          .add(new THREE.Vector3(0, 1.6 + rnd() * 0.8, (rnd() - 0.5) * 0.6));
        s.flights.push({ i, t0: now + k * spacing, from, ctrl, to, color: flat.colors[i]! });
      }
      s.placed = target;
    }

    if (s.flights.length > 0) {
      const survivors: Flight[] = [];
      for (const f of s.flights) {
        const t = (now - f.t0) / FLIGHT_DUR;
        if (t < 0) {
          survivors.push(f);
          continue;
        }
        if (t >= 1) {
          dummy.position.copy(f.to);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          mesh.setMatrixAt(f.i, dummy.matrix);
          mesh.setColorAt(f.i, f.color);
        } else {
          // Quadratic bezier from source into the volume.
          const u = 1 - t;
          dummy.position
            .set(0, 0, 0)
            .addScaledVector(f.from, u * u)
            .addScaledVector(f.ctrl, 2 * u * t)
            .addScaledVector(f.to, t * t);
          dummy.scale.setScalar(0.4 + 0.6 * Math.min(1, t * 1.7));
          dummy.updateMatrix();
          mesh.setMatrixAt(f.i, dummy.matrix);
          // HDR glow while flying; fades as it settles → selective bloom.
          tmpColor.copy(f.color).multiplyScalar(1 + 2.3 * (1 - t));
          mesh.setColorAt(f.i, tmpColor);
          survivors.push(f);
        }
      }
      s.flights = survivors;
      dirtyMatrix = true;
      dirtyColor = true;
    }

    if (dirtyMatrix) mesh.instanceMatrix.needsUpdate = true;
    if (dirtyColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[groupX, 0, 0]} scale={mode === "scroll" ? 0.92 : 1}>
      {/* The bounded volume: translucent, hairline edges (§6 — no glow abuse). */}
      <mesh>
        <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
        <meshBasicMaterial
          color={GL_COLORS.tool}
          transparent
          opacity={0.022}
          depthWrite={false}
        />
        <Edges color={GL_COLORS.hairline} />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, CAP]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.048, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
