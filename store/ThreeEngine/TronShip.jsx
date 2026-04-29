"use client";
import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../useGameStore";

const NEON_CYAN = "#00f7ff";
const NEON_ORANGE = "#ff6600";
const MOVE_LERP = 0.22;
const VERTICAL_LERP = 0.18;
const LANE_WIDTH = 4;
const MAX_ALTITUDE = 5;

export default function TronShip() {
  const shipRef = useRef();
  const coreRef = useRef();
  const shieldRef = useRef();
  const engineRefs = useRef([]);
  const trailRefs = useRef([]);
  const verticalRef = useRef(0);
  const { lane, isPaused, moveLeft, moveRight } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPaused) return;

      const key = e.key.toLowerCase();
      if (e.key === "ArrowUp" || key === "w") {
        verticalRef.current = Math.min(verticalRef.current + 1, MAX_ALTITUDE);
      }
      if (e.key === "ArrowDown" || key === "s") {
        verticalRef.current = Math.max(verticalRef.current - 1, -MAX_ALTITUDE);
      }
      if (e.key === "ArrowLeft" || key === "a") moveLeft();
      if (e.key === "ArrowRight" || key === "d") moveRight();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaused, moveLeft, moveRight]);

  useFrame((state) => {
    if (!shipRef.current || isPaused) return;

    const targetX = lane * LANE_WIDTH;
    const prevX = shipRef.current.position.x;
    const prevY = shipRef.current.position.y;

    shipRef.current.position.x = THREE.MathUtils.lerp(prevX, targetX, MOVE_LERP);
    shipRef.current.position.y = THREE.MathUtils.lerp(prevY, verticalRef.current, VERTICAL_LERP);

    const lateralDelta = shipRef.current.position.x - targetX;
    const verticalDelta = shipRef.current.position.y - verticalRef.current;
    shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, -lateralDelta * 0.18, 0.18);
    shipRef.current.rotation.x = THREE.MathUtils.lerp(shipRef.current.rotation.x, verticalDelta * 0.1, 0.18);
    shipRef.current.rotation.y = THREE.MathUtils.lerp(shipRef.current.rotation.y, lateralDelta * 0.035, 0.16);

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.18;

    if (coreRef.current?.material) {
      coreRef.current.material.emissiveIntensity = 10 + pulse * 7;
      coreRef.current.scale.setScalar(0.9 + pulse * 0.08);
    }

    if (shieldRef.current) {
      shieldRef.current.rotation.z += 0.018;
      shieldRef.current.material.opacity = 0.12 + Math.sin(state.clock.elapsedTime * 4) * 0.035;
    }

    engineRefs.current.forEach((engine, index) => {
      if (!engine?.material) return;
      engine.material.emissiveIntensity = 22 + Math.sin(state.clock.elapsedTime * 14 + index) * 8;
      engine.scale.z = 1 + Math.sin(state.clock.elapsedTime * 18 + index) * 0.22;
    });

    trailRefs.current.forEach((trail, index) => {
      if (!trail?.material) return;
      trail.material.opacity = 0.48 + Math.sin(state.clock.elapsedTime * 8 + index) * 0.12;
      trail.scale.z = 1 + Math.sin(state.clock.elapsedTime * 7 + index) * 0.08;
    });
  });

  return (
    <group ref={shipRef} position={[0, 0, 0]}>
      <mesh ref={shieldRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.25, 0.025, 8, 96]} />
        <meshStandardMaterial
          color={NEON_CYAN}
          emissive={NEON_CYAN}
          emissiveIntensity={5}
          transparent
          opacity={0.12}
          toneMapped={false}
        />
      </mesh>

      <mesh castShadow position={[0, 0, -0.15]} scale={[0.9, 0.34, 1.25]}>
        <boxGeometry args={[1.5, 1, 2.2]} />
        <meshStandardMaterial color="#05070c" metalness={0.9} roughness={0.18} emissive="#00142a" emissiveIntensity={2.4} />
      </mesh>

      <mesh castShadow position={[0, 0, -1.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.78, 1.5, 4]} />
        <meshStandardMaterial color="#0a0d14" metalness={0.95} roughness={0.14} emissive="#00142a" emissiveIntensity={3} />
      </mesh>

      <mesh ref={coreRef} position={[0, 0.2, -0.38]}>
        <sphereGeometry args={[0.42, 18, 18]} />
        <meshStandardMaterial color={NEON_CYAN} emissive={NEON_CYAN} emissiveIntensity={16} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0.48, -0.86]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.82, 0.26, 0.9]} />
        <meshStandardMaterial color="#06121b" metalness={0.8} roughness={0.08} emissive={NEON_CYAN} emissiveIntensity={1.8} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.05, -0.06, -0.08]} rotation={[0, side * -0.22, side * -0.32]}>
          <mesh castShadow>
            <boxGeometry args={[2.25, 0.12, 2.55]} />
            <meshStandardMaterial color="#040509" metalness={0.85} roughness={0.16} emissive="#140800" emissiveIntensity={2.3} />
          </mesh>
          <mesh position={[side * 0.82, 0.09, -0.12]}>
            <boxGeometry args={[0.08, 0.045, 2.65]} />
            <meshStandardMaterial color={NEON_ORANGE} emissive={NEON_ORANGE} emissiveIntensity={18} toneMapped={false} />
          </mesh>
          <mesh position={[side * 0.2, 0.11, -0.95]}>
            <boxGeometry args={[0.1, 0.045, 1.15]} />
            <meshStandardMaterial color={NEON_CYAN} emissive={NEON_CYAN} emissiveIntensity={14} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {[[-0.72, NEON_CYAN], [0.72, NEON_CYAN], [0, NEON_ORANGE]].map(([x, color], index) => (
        <group key={index} position={[x, -0.06, 1.0]}>
          <mesh ref={(el) => (engineRefs.current[index] = el)} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.32, 0.65, 18]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={24} toneMapped={false} />
          </mesh>
          <mesh ref={(el) => (trailRefs.current[index] = el)} position={[0, 0, 35]}>
            <boxGeometry args={[index === 2 ? 0.2 : 0.14, 0.045, 70]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={18}
              transparent
              opacity={0.5}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.95, 0.12, 0.58]} rotation={[0, side * 0.15, side * 0.45]}>
          <boxGeometry args={[0.18, 0.7, 0.95]} />
          <meshStandardMaterial color="#05070c" metalness={0.8} roughness={0.18} emissive={NEON_ORANGE} emissiveIntensity={2.4} />
        </mesh>
      ))}

      <pointLight color={NEON_CYAN} intensity={10} distance={22} decay={2} />
      <pointLight color={NEON_ORANGE} intensity={5} distance={18} decay={2} position={[0, -0.2, 1.2]} />
    </group>
  );
}
