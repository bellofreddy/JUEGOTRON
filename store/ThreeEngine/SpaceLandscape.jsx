// SpaceLandscape.jsx — Estructura de "Precipicio" Técnica (OPTIMIZADO)
"use client";
import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";

const NEON_ORANGE = "#ff6600";
const WIDTH = 20;
const LENGTH = 2000;
const BEACON_COUNT = 40; // Por lado
const BEACON_SPACING = 50;

// ✅ OPTIMIZACIÓN: Matrix4 reutilizable para el instancedMesh
const _beaconMatrix = new THREE.Matrix4();

export default function SpaceLandscape() {
  const groupRef = useRef();

  // ✅ OPTIMIZACIÓN: instancedMesh para las 80 esferas (40 × 2 lados)
  // Antes: 80 <mesh> individuales = 80 draw calls por frame
  // Ahora: 1 instancedMesh = 1 draw call para todas las balizas
  const beaconsRef = useRef();

  useEffect(() => {
    if (!beaconsRef.current) return;

    let instanceIdx = 0;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < BEACON_COUNT; i++) {
        _beaconMatrix.setPosition(side * (WIDTH / 2), 0.2, -i * BEACON_SPACING);
        beaconsRef.current.setMatrixAt(instanceIdx, _beaconMatrix);
        instanceIdx++;
      }
    }
    beaconsRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, delta) => {
    const { speed, isPaused } = useGameStore.getState();
    if (isPaused) return;

    if (groupRef.current) {
      groupRef.current.position.z += speed * delta;
      if (groupRef.current.position.z > 500) {
        groupRef.current.position.z = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -10, 0]}>
      {/* 1. Cuerpo de la Pista */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WIDTH, LENGTH]} />
        <meshStandardMaterial color="#050505" metalness={1} roughness={0.1} />
      </mesh>

      {/* 2. Bordes Naranja */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * (WIDTH / 2), 0.1, 0]}
        >
          <planeGeometry args={[0.5, LENGTH]} />
          <meshStandardMaterial
            color={NEON_ORANGE}
            emissive={NEON_ORANGE}
            emissiveIntensity={15}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* 3. Balizas laterales — 1 draw call en vez de 80 */}
      <instancedMesh
        ref={beaconsRef}
        args={[null, null, BEACON_COUNT * 2]}
      >
        {/* ✅ Segmentos reducidos de 16×16 a 8×8: más que suficiente para esferas pequeñas */}
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial
          color={NEON_ORANGE}
          emissive={NEON_ORANGE}
          emissiveIntensity={30}
          toneMapped={false}
        />
      </instancedMesh>

      {/* 4. Rejilla Técnica Naranja */}
      <gridHelper
        args={[WIDTH, 20, NEON_ORANGE, NEON_ORANGE]}
        rotation={[0, 0, 0]}
        position={[0, 0.05, -LENGTH / 2]}
        onUpdate={(self) => {
          self.material.transparent = true;
          self.material.opacity = 0.2;
        }}
      />
    </group>
  );
}