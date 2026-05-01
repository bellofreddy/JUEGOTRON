// RealPortal.jsx — SPACE → REAL
// PARCHE: dispara preload de RealWorldLandscape antes de que el portal sea visible.
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../useGameStore";

export const REAL_PORTAL_THRESHOLD = 600;
const PRELOAD_THRESHOLD = 540; // ~60 puntos antes del portal visible
const PORTAL_SPAWN_Z    = -500;

const RING_COLOR = "#ff9900";
const CORE_COLOR = "#ffe0a0";
const GLOW_COLOR = "#ffcc44";

export default function RealPortal() {
  const portalRef = useRef();

  const score               = useGameStore((s) => s.score);
  const dimension           = useGameStore((s) => s.dimension);
  const speed               = useGameStore((s) => s.speed);
  const realPortalActive    = useGameStore((s) => s.realPortalActive);
  const realPortalCollected = useGameStore((s) => s.realPortalCollected);
  const setRealPortalActive = useGameStore((s) => s.setRealPortalActive);
  const setDimension        = useGameStore((s) => s.setDimension);
  const triggerRealPreload  = useGameStore((s) => s.triggerRealPreload);

  // 1. Dispara preload silencioso del RealWorldLandscape
  useEffect(() => {
    if (score >= PRELOAD_THRESHOLD && dimension === "SPACE" && !realPortalCollected) {
      triggerRealPreload();
    }
  }, [score, dimension, realPortalCollected, triggerRealPreload]);

  // 2. Activa el portal visible
  useEffect(() => {
    if (
      score >= REAL_PORTAL_THRESHOLD &&
      !realPortalActive &&
      !realPortalCollected &&
      dimension === "SPACE"
    ) {
      setRealPortalActive(true);
    }
  }, [score, realPortalActive, realPortalCollected, dimension, setRealPortalActive]);

  useFrame((state, delta) => {
    if (!realPortalActive || dimension !== "SPACE" || realPortalCollected) return;
    if (!portalRef.current) return;

    portalRef.current.position.z += speed * delta;

    const dist = Math.abs(portalRef.current.position.z);
    const pulse = dist < 30
      ? 60 + Math.sin(state.clock.elapsedTime * 6) * 15
      : 40;

    portalRef.current.rotation.z += delta * 0.3;

    const ring = portalRef.current.children[0];
    if (ring?.material) ring.material.emissiveIntensity = pulse;

    if (portalRef.current.position.z > 1) {
      setDimension("REAL");
    }
  });

  if (!realPortalActive || dimension !== "SPACE" || realPortalCollected) return null;

  return (
    <group ref={portalRef} position={[0, 0, PORTAL_SPAWN_Z]}>
      {/* Anillo principal — segmentos reducidos de 160 → 64 */}
      <mesh>
        <torusGeometry args={[6, 0.3, 24, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={RING_COLOR}
          emissiveIntensity={40}
          toneMapped={false}
        />
      </mesh>
      {/* Anillo exterior difuso */}
      <mesh>
        <torusGeometry args={[7.4, 0.8, 8, 64]} />
        <meshStandardMaterial
          color={GLOW_COLOR}
          emissive={GLOW_COLOR}
          emissiveIntensity={8}
          transparent
          opacity={0.15}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Anillo interior */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[4.5, 0.12, 12, 64]} />
        <meshStandardMaterial
          color={CORE_COLOR}
          emissive={CORE_COLOR}
          emissiveIntensity={30}
          toneMapped={false}
        />
      </mesh>
      {/* Centro */}
      <mesh>
        <circleGeometry args={[5.8, 32]} />
        <meshStandardMaterial
          color={CORE_COLOR}
          emissive={GLOW_COLOR}
          emissiveIntensity={6}
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={GLOW_COLOR} intensity={8} distance={40} decay={2} />
    </group>
  );
}