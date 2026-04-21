// GameObstacles.jsx
"use client";
import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";

// 1. CONFIGURACIÓN Y SINCRONIZACIÓN
const LANE_POSITIONS = { "-1": -5, 0: 0, 1: 5 };
const OBSTACLE_SPACING = 65; 
const POOL_SIZE = 6;         
const SPAWN_Z = -120;        
const RESET_THRESHOLD = 20;  

/** Genera una oleada lógica */
function generateWave(index, score = 0) {
  let z = SPAWN_Z - index * OBSTACLE_SPACING;
  // Dificultad progresiva: 1 muro al inicio, posibilidad de 2 después de 500m
  const blockCount = score < 500 ? 1 : (Math.random() > 0.7 ? 2 : 1);
  const lanes = [-1, 0, 1];
  const blocked = lanes.sort(() => Math.random() - 0.5).slice(0, blockCount);
  return { id: index, z, blocked };
}

/** Componente de Barrera (Modo GRID) */
function Barrier({ position }) {
  const NEON_ORANGE = "#ff6600";
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[4, 3, 0.4]} />
        <meshStandardMaterial
          color="#100800"
          emissive={NEON_ORANGE}
          emissiveIntensity={4}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(4, 3, 0.4)]} />
        <lineBasicMaterial color={NEON_ORANGE} linewidth={2} />
      </lineSegments>
    </group>
  );
}

/** Componente de Disco (Modo SPACE) */
function DiscObstacle({ position }) {
  const NEON_ORANGE = "#ff6600";
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[2, 2, 0.2, 32]} />
      <meshStandardMaterial
        color="#1a0a00"
        emissive={NEON_ORANGE}
        emissiveIntensity={20}
        transparent
        opacity={0.9}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function GameObstacles() {
  const groupRef = useRef();
  const { speed, lane, setGameOver, score, dimension, isPaused, isGameOver } = useGameStore();
  
  const [waves, setWaves] = useState(() => 
    Array.from({ length: POOL_SIZE }, (_, i) => generateWave(i, 0))
  );

  useFrame((state, delta) => {
    if (isPaused || isGameOver || !groupRef.current) return;

    // 1. MOVIMIENTO FÍSICO (Hacia el jugador)
    groupRef.current.position.z += speed * delta;
    const groupZ = groupRef.current.position.z;

    // 2. DETECCIÓN DE COLISIÓN (Lógica optimizada)
    let hitDetected = false;
    for (const wave of waves) {
      const worldZ = wave.z + groupZ;
      // Hitbox de 0.8 para que sea un reto justo
      if (worldZ > -0.8 && worldZ < 0.8) {
        if (wave.blocked.includes(lane)) {
          hitDetected = true;
          break;
        }
      }
    }

    if (hitDetected) {
      setGameOver();
      return;
    }

    // 3. RECICLAJE DE OBSTÁCULOS
    const needsReset = waves.some(wave => (wave.z + groupZ) > RESET_THRESHOLD);
    if (needsReset) {
      setWaves((prev) =>
        prev.map((wave) => {
          if ((wave.z + groupZ) > RESET_THRESHOLD) {
            return {
              ...generateWave(wave.id, score),
              z: wave.z - POOL_SIZE * OBSTACLE_SPACING,
            };
          }
          return wave;
        })
      );
    }
  });

  return (
    <group ref={groupRef}>
      {waves.map((wave) =>
        wave.blocked.map((blockedLane) =>
          dimension === "SPACE" ? (
            <DiscObstacle
              key={`${wave.id}-${blockedLane}`}
              position={[LANE_POSITIONS[blockedLane], 0.5, wave.z]}
            />
          ) : (
            <Barrier
              key={`${wave.id}-${blockedLane}`}
              position={[LANE_POSITIONS[blockedLane], 1.5, wave.z]}
            />
          )
        )
      )}
    </group>
  );
}