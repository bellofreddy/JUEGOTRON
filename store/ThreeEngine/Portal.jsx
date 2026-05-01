// Portal.jsx — GRID → SPACE
// PARCHE: dispara preload de SpaceLandscape 5 segundos antes de activar
// el portal visible, para que React lo monte sin spike de CPU.
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../useGameStore";

export default function Portal() {
  const portalRef = useRef();

  const score          = useGameStore((s) => s.score);
  const dimension      = useGameStore((s) => s.dimension);
  const speed          = useGameStore((s) => s.speed);
  const portalActive   = useGameStore((s) => s.portalActive);
  const portalCollected= useGameStore((s) => s.portalCollected);
  const setPortalActive       = useGameStore((s) => s.setPortalActive);
  const setDimension          = useGameStore((s) => s.setDimension);
  const triggerSpacePreload   = useGameStore((s) => s.triggerSpacePreload);

  // Score en el cual aparece el portal
  const PORTAL_SCORE_THRESHOLD  = 300;
  // Preload: activamos el SpaceLandscape silencioso ~50 puntos antes del portal
  const PRELOAD_THRESHOLD       = 250;
  const PORTAL_SPAWN_Z          = -500;

  // 1. Dispara preload silencioso antes de que el portal aparezca
  useEffect(() => {
    if (score >= PRELOAD_THRESHOLD && dimension === "GRID" && !portalCollected) {
      triggerSpacePreload();
    }
  }, [score, dimension, portalCollected, triggerSpacePreload]);

  // 2. Activa el portal visible
  useEffect(() => {
    if (score >= PORTAL_SCORE_THRESHOLD && !portalActive && !portalCollected && dimension === "GRID") {
      setPortalActive(true);
    }
  }, [score, portalActive, portalCollected, dimension, setPortalActive]);

  useFrame((state, delta) => {
    if (!portalActive || dimension !== "GRID" || portalCollected) return;
    if (!portalRef.current) return;

    portalRef.current.position.z += speed * delta;

    const distanceToPlayer = Math.abs(portalRef.current.position.z);
    const pulseIntensity = distanceToPlayer < 30
      ? 50 + Math.sin(state.clock.elapsedTime * 5) * 10
      : 50;
    
    const torusChild = portalRef.current.children[0];
    if (torusChild?.material) {
      torusChild.material.emissiveIntensity = pulseIntensity;
    }

    if (portalRef.current.position.z > 1) {
      setDimension("SPACE");
    }
  });

  if (!portalActive || dimension !== "GRID" || portalCollected) return null;

  return (
    <group ref={portalRef} position={[0, 0, PORTAL_SPAWN_Z]}>
      {/* Anillo principal — segmentos reducidos de 200 → 64 (invisible a esta distancia) */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[6, 0.25, 24, 64]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#00f7ff" 
          emissiveIntensity={80} 
          toneMapped={false} 
        />
      </mesh>
      {/* Anillo exterior difuso */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[7.2, 0.6, 8, 64]} />
        <meshStandardMaterial
          color={"#00f7ff"}
          emissive={"#00f7ff"}
          emissiveIntensity={12}
          transparent
          opacity={0.12}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Centro del portal */}
      <mesh>
        <circleGeometry args={[5.8, 32]} />
        <meshStandardMaterial 
          color="#00f7ff" 
          transparent 
          opacity={0.3} 
          emissive="#00f7ff" 
          emissiveIntensity={10}
        />
      </mesh>
    </group>
  );
}