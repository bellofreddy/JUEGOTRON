import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../useGameStore";

export default function Portal() {
  const portalRef = useRef();
  const { score, setDimension, dimension, speed, portalActive, setPortalActive, portalCollected } = useGameStore();
  
  // Score en el cual aparece el portal (700 = ~70 segundos)
  const PORTAL_SCORE_THRESHOLD = 300;
  // Distancia en Z donde aparece inicialmente (más lejos para dar tiempo)
  const PORTAL_SPAWN_Z = -500;

  // Cuando el score llega a 750, activamos el portal
  useEffect(() => {
    if (score >= PORTAL_SCORE_THRESHOLD && !portalActive && !portalCollected && dimension === "GRID") {
      setPortalActive(true);
    }
  }, [score, portalActive, portalCollected, dimension, setPortalActive]);

  useFrame((state, delta) => {
    // Si no está activo, no hacer nada
    if (!portalActive || dimension !== "GRID" || portalCollected) return;

    if (portalRef.current) {
      // El portal se acerca hacia el jugador a la misma velocidad del juego
      portalRef.current.position.z += speed * delta;

      // Parpadeo suave: cuando está cerca, el portal brilla más
      const distanceToPlayer = Math.abs(portalRef.current.position.z);
      const pulseIntensity = distanceToPlayer < 30 ? 50 + Math.sin(state.clock.elapsedTime * 5) * 10 : 50;
      
      const torusChild = portalRef.current.children[0];
      if (torusChild?.material) {
        torusChild.material.emissiveIntensity = pulseIntensity;
      }

      // Colisión: Si el portal llega a z > 0 (jugador lo alcanza)
      if (portalRef.current.position.z > 1) {
        setDimension("SPACE");
      }
    }
  });

  // Solo renderizar si el portal está activo
  if (!portalActive || dimension !== "GRID" || portalCollected) return null;

  return (
    <group ref={portalRef} position={[0, 0, PORTAL_SPAWN_Z]}>
      {/* Anillo de energía brillante */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[6, 0.25, 24, 200]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#00f7ff" 
          emissiveIntensity={80} 
          toneMapped={false} 
        />
      </mesh>
      {/* Anillo exterior difuso para glow */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[7.2, 0.6, 8, 200]} />
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
      {/* Centro del portal (distorsión) */}
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