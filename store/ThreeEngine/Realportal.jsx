// RealPortal.jsx — Portal SPACE → REAL
// Misma lógica que Portal.jsx pero:
//   · Se activa en dimensión "SPACE" al llegar a REAL_PORTAL_THRESHOLD
//   · Aspecto: anillo cálido naranja/blanco que contrasta con el neón frío del espacio
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../useGameStore";

// Score dentro de SPACE en el que aparece el portal al mundo real.
// El score total del jugador al llegar a SPACE ya es ~300+, así que
// ponemos 300 adicionales de recorrido en SPACE → threshold total ≈ 600
export const REAL_PORTAL_THRESHOLD = 600;

const PORTAL_SPAWN_Z = -500;

// Colores del portal "mundo real" — cálidos, opuestos al cyan del primer portal
const RING_COLOR  = "#ff9900";
const CORE_COLOR  = "#ffe0a0";
const GLOW_COLOR  = "#ffcc44";

export default function RealPortal() {
  const portalRef = useRef();

  const {
    score,
    dimension,
    speed,
    setDimension,
    // Reutilizamos los campos realPortalActive / realPortalCollected del store
    realPortalActive,
    setRealPortalActive,
    realPortalCollected,
  } = useGameStore();

  // Activar cuando el score llega al umbral y estamos en SPACE
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

    // El portal viaja hacia el jugador
    portalRef.current.position.z += speed * delta;

    // Pulso de brillo al acercarse
    const dist = Math.abs(portalRef.current.position.z);
    const pulse = dist < 30
      ? 60 + Math.sin(state.clock.elapsedTime * 6) * 15
      : 40;

    // Rotar lentamente para un look místico / distinto al portal original
    portalRef.current.rotation.z += delta * 0.3;

    // Actualizar brillo del anillo principal
    const ring = portalRef.current.children[0];
    if (ring?.material) ring.material.emissiveIntensity = pulse;

    // Colisión → cambiar a mundo real
    if (portalRef.current.position.z > 1) {
      setDimension("REAL");
    }
  });

  if (!realPortalActive || dimension !== "SPACE" || realPortalCollected) return null;

  return (
    <group ref={portalRef} position={[0, 0, PORTAL_SPAWN_Z]}>

      {/* Anillo principal — naranja cálido */}
      <mesh>
        <torusGeometry args={[6, 0.3, 24, 160]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={RING_COLOR}
          emissiveIntensity={40}
          toneMapped={false}
        />
      </mesh>

      {/* Anillo exterior difuso — halo cálido */}
      <mesh>
        <torusGeometry args={[7.4, 0.8, 8, 160]} />
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

      {/* Segundo anillo interior giratorio */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[4.5, 0.12, 12, 120]} />
        <meshStandardMaterial
          color={CORE_COLOR}
          emissive={CORE_COLOR}
          emissiveIntensity={30}
          toneMapped={false}
        />
      </mesh>

      {/* Centro — destello de luz cálida (simula el sol del mundo real) */}
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

      {/* Punto de luz que ilumina la moto al pasar cerca */}
      <pointLight
        color={GLOW_COLOR}
        intensity={8}
        distance={40}
        decay={2}
      />
    </group>
  );
}