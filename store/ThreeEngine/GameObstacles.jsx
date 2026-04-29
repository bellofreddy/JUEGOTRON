// GameObstacles.jsx
"use client";
import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";

const LANE_POSITIONS = { "-1": -5, 0: 0, 1: 5 };
const OBSTACLE_SPACING = 65;
const POOL_SIZE = 6;
const SPAWN_Z = -120;
const RESET_THRESHOLD = 20;
const REAL_VEHICLE_TYPES = ["car", "motorcycle", "truck", "taxi"];

// ✅ OPTIMIZACIÓN: Geometrías estáticas creadas UNA vez a nivel de módulo.
// Antes: "new THREE.BoxGeometry(4, 3, 0.4)" se ejecutaba en cada render de Barrier.
const BARRIER_EDGE_GEO = new THREE.BoxGeometry(4, 3, 0.4);

function generateWave(index, score = 0) {
  let z = SPAWN_Z - index * OBSTACLE_SPACING;
  const blockCount = score < 500 ? 1 : Math.random() > 0.7 ? 2 : 1;
  const lanes = [-1, 0, 1];
  const blocked = lanes.sort(() => Math.random() - 0.5).slice(0, blockCount);
  const vehicles = blocked.reduce((acc, blockedLane) => {
    acc[blockedLane] =
      REAL_VEHICLE_TYPES[Math.floor(Math.random() * REAL_VEHICLE_TYPES.length)];
    return acc;
  }, {});
  return { id: index, z, blocked, vehicles };
}

const NEON_ORANGE = "#ff6600";

/** Componente de Barrera (Modo GRID) */
function Barrier({ position }) {
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
      {/* ✅ Reutilizamos BARRIER_EDGE_GEO en lugar de crear una nueva cada render */}
      <lineSegments>
        <primitive object={BARRIER_EDGE_GEO} attach="geometry" />
        <lineBasicMaterial color={NEON_ORANGE} linewidth={2} />
      </lineSegments>
    </group>
  );
}

/** Componente de Disco (Modo SPACE) */
function DiscObstacle({ position }) {
  const obstacleRef = useRef();
  const coreRef = useRef();

  useFrame((state, delta) => {
    if (!obstacleRef.current) return;

    obstacleRef.current.rotation.z += delta * 1.5;
    obstacleRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2 + position[2]) * 0.25;

    if (coreRef.current?.material) {
      coreRef.current.material.emissiveIntensity =
        18 + Math.sin(state.clock.elapsedTime * 8 + position[2]) * 8;
    }
  });

  return (
    <group ref={obstacleRef} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
      {/* ✅ Segmentos reducidos de 32 a 16: visualmente igual, mitad de vértices */}
      <torusGeometry args={[1.85, 0.12, 8, 48]} />
      <meshStandardMaterial
        color="#1a0a00"
        emissive={NEON_ORANGE}
        emissiveIntensity={20}
        transparent
        opacity={0.9}
        toneMapped={false}
      />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.35, 0.07, 8, 40]} />
        <meshStandardMaterial
          color="#00d8ff"
          emissive="#00d8ff"
          emissiveIntensity={12}
          transparent
          opacity={0.75}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial
          color="#ffefe0"
          emissive={NEON_ORANGE}
          emissiveIntensity={22}
          transparent
          opacity={0.88}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={NEON_ORANGE} intensity={2.8} distance={10} decay={2} />
    </group>
  );
}

/** Vehiculos del mundo REAL: autos, motos y camionetas sobre la carretera. */
function RealVehicle({ position, type = "car", direction = "same" }) {
  const isMotorcycle = type === "motorcycle";
  const isTruck = type === "truck";
  const isTaxi = type === "taxi";

  const bodyColor = isTruck ? "#7b8794" : isTaxi ? "#f2c230" : "#b31f2a";
  const cabinColor = isTruck ? "#d8e0e8" : "#20242a";
  const bodySize = isMotorcycle
    ? [0.85, 0.35, 2.6]
    : isTruck
      ? [3.2, 1.0, 5.2]
      : [2.7, 0.75, 4.2];
  const bodyY = isMotorcycle ? 0.55 : 0.65;
  const wheelZ = isMotorcycle ? [-0.95, 0.95] : [-1.55, 1.55];
  const wheelX = isMotorcycle ? [0] : [-bodySize[0] * 0.42, bodySize[0] * 0.42];

  return (
    <group position={position} rotation={[0, direction === "same" ? Math.PI : 0, 0]}>
      <mesh castShadow receiveShadow position={[0, bodyY, 0]}>
        <boxGeometry args={bodySize} />
        <meshStandardMaterial color={bodyColor} roughness={0.45} metalness={0.25} />
      </mesh>

      {isMotorcycle ? (
        <>
          <mesh castShadow position={[0, 0.9, -0.25]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.45, 0.45, 1.0]} />
            <meshStandardMaterial color="#111318" roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.98, 0.55]}>
            <boxGeometry args={[0.7, 0.08, 0.18]} />
            <meshStandardMaterial color="#222" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.62, 1.36]}>
            <boxGeometry args={[0.22, 0.14, 0.08]} />
            <meshStandardMaterial color="#fff2c2" emissive="#fff2c2" emissiveIntensity={1.1} />
          </mesh>
          <mesh position={[0, 0.58, -1.36]}>
            <boxGeometry args={[0.2, 0.12, 0.08]} />
            <meshStandardMaterial color="#b00018" emissive="#b00018" emissiveIntensity={0.75} />
          </mesh>
        </>
      ) : (
        <>
          <mesh castShadow position={[0, isTruck ? 1.35 : 1.08, isTruck ? -0.65 : -0.35]}>
            <boxGeometry args={isTruck ? [2.5, 0.95, 1.8] : [1.8, 0.75, 1.45]} />
            <meshStandardMaterial color={cabinColor} roughness={0.25} metalness={0.15} />
          </mesh>
          {isTaxi && (
            <mesh position={[0, 1.52, -0.35]}>
              <boxGeometry args={[0.9, 0.18, 0.42]} />
              <meshStandardMaterial color="#1b1b1b" emissive="#ffd84a" emissiveIntensity={0.7} />
            </mesh>
          )}
        </>
      )}

      {wheelX.flatMap((x) =>
        wheelZ.map((z) => (
          <mesh key={`${x}-${z}`} castShadow position={[x, 0.28, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.33, 0.33, isMotorcycle ? 0.16 : 0.34, 16]} />
            <meshStandardMaterial color="#111" roughness={0.6} metalness={0.2} />
          </mesh>
        ))
      )}

      {!isMotorcycle && (
        <>
          {[-0.55, 0.55].map((x) => (
            <mesh key={x} position={[x, 0.75, 2.13]}>
              <boxGeometry args={[0.32, 0.18, 0.08]} />
              <meshStandardMaterial color="#fff2c2" emissive="#fff2c2" emissiveIntensity={1.3} />
            </mesh>
          ))}
          {[-0.55, 0.55].map((x) => (
            <mesh key={`tail-${x}`} position={[x, 0.68, -2.13]}>
              <boxGeometry args={[0.28, 0.16, 0.08]} />
              <meshStandardMaterial color="#b00018" emissive="#b00018" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

export default function GameObstacles() {
  const groupRef = useRef();
  const { speed, lane, setGameOver, score, dimension, isPaused, isGameOver } =
    useGameStore();

  const [waves, setWaves] = useState(() =>
    Array.from({ length: POOL_SIZE }, (_, i) => generateWave(i, 0))
  );

  useFrame((state, delta) => {
    if (isPaused || isGameOver || !groupRef.current) return;

    groupRef.current.position.z += speed * delta;
    const groupZ = groupRef.current.position.z;

    let hitDetected = false;
    for (const wave of waves) {
      const worldZ = wave.z + groupZ;
      const hitHalfDepth = dimension === "REAL" ? 2.8 : 0.8;
      if (worldZ > -hitHalfDepth && worldZ < hitHalfDepth) {
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

    const needsReset = waves.some((wave) => wave.z + groupZ > RESET_THRESHOLD);
    if (needsReset) {
      setWaves((prev) =>
        prev.map((wave) => {
          if (wave.z + groupZ > RESET_THRESHOLD) {
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
          ) : dimension === "REAL" ? (
            <RealVehicle
              key={`${wave.id}-${blockedLane}`}
              position={[LANE_POSITIONS[blockedLane], 0, wave.z]}
              type={wave.vehicles?.[blockedLane]}
              direction={LANE_POSITIONS[blockedLane] < 0 ? "oncoming" : "same"}
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
