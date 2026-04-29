// SpaceLandscape.jsx — Estructura de "Precipicio" Técnica (OPTIMIZADO)
"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";

const NEON_ORANGE = "#ff6600";
const NEON_BLUE = "#00d8ff";
const WIDTH = 20;
const LENGTH = 2000;
const BEACON_COUNT = 40; // Por lado
const BEACON_SPACING = 50;
const RING_COUNT = 28;
const RING_SPACING = 72;

// ✅ OPTIMIZACIÓN: Matrix4 reutilizable para el instancedMesh
const _beaconMatrix = new THREE.Matrix4();

export default function SpaceLandscape() {
  const groupRef = useRef();
  const ringRef = useRef();
  const lanePulseRef = useRef();

  // ✅ OPTIMIZACIÓN: instancedMesh para las 80 esferas (40 × 2 lados)
  // Antes: 80 <mesh> individuales = 80 draw calls por frame
  // Ahora: 1 instancedMesh = 1 draw call para todas las balizas
  const beaconsRef = useRef();

  const tunnelRings = useMemo(
    () =>
      Array.from({ length: RING_COUNT }, (_, i) => ({
        id: i,
        z: -i * RING_SPACING,
        scale: 0.92 + (i % 4) * 0.035,
        rotate: (i % 2 === 0 ? 1 : -1) * 0.08,
      })),
    []
  );

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

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.08;
    }

    if (lanePulseRef.current?.material) {
      lanePulseRef.current.material.opacity =
        0.35 + Math.sin(state.clock.elapsedTime * 5) * 0.12;
    }
  });

  return (
    <group ref={groupRef} position={[0, -10, 0]}>
      {/* 1. Cuerpo de la Pista */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WIDTH, LENGTH]} />
        <meshStandardMaterial color="#050505" metalness={1} roughness={0.1} />
      </mesh>

      <group ref={ringRef} position={[0, 10, 0]}>
        {tunnelRings.map((ring) => (
          <group
            key={ring.id}
            position={[0, 0, ring.z]}
            rotation={[0, 0, ring.rotate]}
            scale={[ring.scale, ring.scale, ring.scale]}
          >
            <mesh>
              <torusGeometry args={[12, 0.055, 8, 64]} />
              <meshStandardMaterial
                color="#1a0a00"
                emissive={NEON_ORANGE}
                emissiveIntensity={6}
                transparent
                opacity={0.45}
                toneMapped={false}
              />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[12, 0.025, 6, 64, Math.PI]} />
              <meshStandardMaterial
                color={NEON_BLUE}
                emissive={NEON_BLUE}
                emissiveIntensity={5}
                transparent
                opacity={0.25}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>

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

      {/* Guias de carril */}
      {[-4, 0, 4].map((x) => (
        <mesh
          key={x}
          ref={x === 0 ? lanePulseRef : undefined}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.08, 0]}
        >
          <planeGeometry args={[0.12, LENGTH]} />
          <meshStandardMaterial
            color={x === 0 ? NEON_BLUE : NEON_ORANGE}
            emissive={x === 0 ? NEON_BLUE : NEON_ORANGE}
            emissiveIntensity={x === 0 ? 8 : 4}
            transparent
            opacity={x === 0 ? 0.35 : 0.18}
            toneMapped={false}
          />
        </mesh>
      ))}

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
