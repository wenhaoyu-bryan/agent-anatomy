import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GL_COLORS } from "./palette";
import { mulberry32 } from "./demoStream";

const COUNT = 640;
const RING = 48; // particles forming the quiet loop motif
const FIELD = { w: 22, h: 11, d: 5 };
const LINK_DIST = 1.9;

/**
 * Scene A — hero ambient (PLAN §7). A sparse drifting field with faint
 * connecting lines; a pulse occasionally travels the loop motif. Quiet on
 * purpose: the hero's job is the question, not fireworks.
 */
export function SceneA() {
  const camera = useThree((s) => s.camera);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);

  const { base, colors, linePositions, phases } = useMemo(() => {
    const rnd = mulberry32(20260712);
    const base = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT);
    // Drifting field
    for (let i = RING; i < COUNT; i++) {
      base[i * 3] = (rnd() * 2 - 1) * (FIELD.w / 2);
      base[i * 3 + 1] = (rnd() * 2 - 1) * (FIELD.h / 2);
      base[i * 3 + 2] = (rnd() * 2 - 1) * (FIELD.d / 2);
      phases[i] = rnd() * Math.PI * 2;
    }
    // The loop motif — a slightly imperfect ring, right of center
    for (let i = 0; i < RING; i++) {
      const angle = (i / RING) * Math.PI * 2;
      base[i * 3] = 3.2 + Math.cos(angle) * 2.6 + (rnd() - 0.5) * 0.12;
      base[i * 3 + 1] = 0.4 + Math.sin(angle) * 2.6 + (rnd() - 0.5) * 0.12;
      base[i * 3 + 2] = (rnd() - 0.5) * 0.4;
      phases[i] = rnd() * Math.PI * 2;
    }
    const colors = new Float32Array(COUNT * 3);
    const dim = new THREE.Color(GL_COLORS.muted).multiplyScalar(0.55);
    for (let i = 0; i < COUNT; i++) {
      colors[i * 3] = dim.r;
      colors[i * 3 + 1] = dim.g;
      colors[i * 3 + 2] = dim.b;
    }
    // Faint connecting lines between near field neighbours (ring excluded —
    // linking ring points to everything turns the motif into a tangle).
    const segments: number[] = [];
    for (let i = RING; i < COUNT && segments.length < 6 * 220; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = base[i * 3]! - base[j * 3]!;
        const dy = base[i * 3 + 1]! - base[j * 3 + 1]!;
        const dz = base[i * 3 + 2]! - base[j * 3 + 2]!;
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
          segments.push(
            base[i * 3]!, base[i * 3 + 1]!, base[i * 3 + 2]!,
            base[j * 3]!, base[j * 3 + 1]!, base[j * 3 + 2]!,
          );
        }
      }
    }
    // The loop itself: one faint closed outline through the ring points.
    for (let i = 0; i < RING; i++) {
      const j = (i + 1) % RING;
      segments.push(
        base[i * 3]!, base[i * 3 + 1]!, base[i * 3 + 2]!,
        base[j * 3]!, base[j * 3 + 1]!, base[j * 3 + 2]!,
      );
    }
    return { base, colors, linePositions: new Float32Array(segments), phases };
  }, []);

  const pointsRef = useRef<THREE.Points>(null);
  const pulseColor = useMemo(() => new THREE.Color(GL_COLORS.tool), []);
  const dimColor = useMemo(() => new THREE.Color(GL_COLORS.muted).multiplyScalar(0.55), []);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points) return;
    const t = clock.elapsedTime;
    const pos = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      pos.setXYZ(
        i,
        base[i * 3]! + Math.sin(t * 0.11 + phases[i]!) * 0.22,
        base[i * 3 + 1]! + Math.cos(t * 0.13 + phases[i]! * 1.3) * 0.18,
        base[i * 3 + 2]!,
      );
    }
    pos.needsUpdate = true;

    // Pulse: every ~9s a bright front travels the ring once over ~3s.
    const cycle = (t % 9) / 3; // 0..3, active while < 1
    const col = points.geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < RING; i++) {
      const along = i / RING;
      const d = cycle >= 0 && cycle <= 1 ? Math.abs(along - cycle) : 1;
      const glow = Math.max(0, 1 - d * 9);
      const r = dimColor.r + (pulseColor.r * 1.35 - dimColor.r) * glow;
      const g = dimColor.g + (pulseColor.g * 1.35 - dimColor.g) * glow;
      const b = dimColor.b + (pulseColor.b * 1.35 - dimColor.b) * glow;
      col.setXYZ(i, r, g, b);
    }
    col.needsUpdate = true;
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[base.slice(), 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.9}
          toneMapped={false}
          depthWrite={false}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={GL_COLORS.hairline}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
