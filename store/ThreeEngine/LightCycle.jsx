"use client";
import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD_GROUND_Y } from "./Grid";
import { useGameStore } from "../useGameStore";

const TILT_SPEED = 0.1;
const MOVE_LERP = 0.15;
const NEON_CIAN = "#00f7ff";
const GLOW_INTENSITY = 12;

export default function LightCycle() {
  const meshRef = useRef();
  const trailRef = useRef();

  const { lane, moveLeft, moveRight, isPaused } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPaused) return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") moveLeft();
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") moveRight();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveLeft, moveRight, isPaused]);

  useFrame((state, delta) => {
  if (!meshRef.current) return;
  
  // 1. Movimiento lateral suave
 const targetX = lane * 5;
  meshRef.current.position.x = THREE.MathUtils.lerp(
    meshRef.current.position.x,
    targetX,
    0.15
  );

  // 2. Inclinación (Banking)
  const tilt = (meshRef.current.position.x - targetX) * 0.1;
  meshRef.current.rotation.z = THREE.MathUtils.lerp(
    meshRef.current.rotation.z,
    tilt,
    0.1
  );

  // 3. ESTELA DINÁMICA
  if(trailRef.current) {
      // La estela sigue la inclinación de la nave
      trailRef.current.rotation.z = meshRef.current.rotation.z;
      
      // Efecto de pulso neón para el toque "Luxury"
      const pulse = 25 + Math.sin(state.clock.elapsedTime * 10) * 5;
      trailRef.current.material.emissiveIntensity = pulse;
  }
});

  return (
    <group ref={meshRef} position={[0, WORLD_GROUND_Y + 0.1, 0]}>
      {/* 1. EL CHASIS PRINCIPAL */}
      <mesh castShadow receiveShadow position={[0, 0.4, -0.3]}>
        <boxGeometry args={[0.7, 0.7, 2.8]} />
        <meshStandardMaterial color="#050505" metalness={1} roughness={0.1} />
      </mesh>

      {/* 2. RUEDAS DE ENERGÍA */}
      {[-1.2, 0.6].map((z, i) => (
        <group key={i} position={[0, 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <torusGeometry args={[0.4, 0.04, 8, 32]} />
            <meshStandardMaterial
              color={NEON_CIAN}
              emissive={NEON_CIAN}
              emissiveIntensity={GLOW_INTENSITY}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.35, 0.35, 0.1, 16]} />
            <meshStandardMaterial color="#000000" metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* 3. CABINA Y PANELES DE NEÓN (Cuerpo de la moto acortado) */}
      {[-0.37, 0.37].map((x, i) => (
        <group key={i} position={[x, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 0.3, 1.2]} />
            <meshStandardMaterial
              color={NEON_CIAN}
              emissive={NEON_CIAN}
              emissiveIntensity={GLOW_INTENSITY * 1.5}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* 4. EL PILOTO */}
      <group position={[0, 0.7, -0.1]} rotation={[-0.2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.4, 1.3]} />
          <meshStandardMaterial color="#000000" metalness={1} />
        </mesh>
        <mesh position={[0, 0.35, 0.3]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#000000" metalness={1} />
        </mesh>
      </group>

      {/* 5. EL RASTRO DE LUZ (Pared Recta hacia ATRÁS) */}
      {/* El centro de la caja está en Z positivo (+7.5).
        Como la caja mide 13 de largo, empieza en Z: +1 (justo detrás de la rueda trasera)
        y termina en Z: +14 (hacia la cámara).
      */}
      <mesh ref={trailRef} position={[0, 0.4, 7.5]}>
        <boxGeometry args={[0.2, 0.8, 13]} />
        <meshStandardMaterial
          color={NEON_CIAN}
          emissive={NEON_CIAN}
          emissiveIntensity={25}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}
