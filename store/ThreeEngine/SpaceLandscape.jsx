// SpaceLandscape.jsx — Estructura de "Precipicio" Técnica
"use client";
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";

const NEON_ORANGE = "#ff6600";
const WIDTH = 20; 
const LENGTH = 2000; // Muy largo para que parezca una megaestructura

export default function SpaceLandscape() {
  const groupRef = useRef();

  useFrame((state, delta) => {
    const { speed, isPaused } = useGameStore.getState();
    if (isPaused) return;

    if (groupRef.current) {
      // Movimiento hacia atrás para dar sensación de avance
      groupRef.current.position.z += speed * delta;
      if (groupRef.current.position.z > 500) {
        groupRef.current.position.z = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -10, 0]}> {/* Bajamos la pista para crear el "Precipicio" */}
      
      {/* 1. Cuerpo de la Pista (Look metálico oscuro como la imagen) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WIDTH, LENGTH]} />
        <meshStandardMaterial color="#050505" metalness={1} roughness={0.1} />
      </mesh>

      {/* 2. Bordes Naranja (Las líneas de la imagen) */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (WIDTH / 2), 0.1, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, LENGTH]} />
            <meshStandardMaterial 
              color={NEON_ORANGE} 
              emissive={NEON_ORANGE} 
              emissiveIntensity={15} 
              toneMapped={false} 
            />
          </mesh>
          
          {/* Luces de baliza laterales (puntos brillantes) */}
          {Array.from({ length: 40 }).map((_, i) => (
            <mesh key={i} position={[0, 0.1, -i * 50]}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial 
                color={NEON_ORANGE} 
                emissive={NEON_ORANGE} 
                emissiveIntensity={30} 
                toneMapped={false} 
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* 3. Rejilla Técnica Naranja (Efecto de la imagen) */}
      <gridHelper 
        args={[WIDTH, 20, NEON_ORANGE, NEON_ORANGE]} 
        rotation={[0, 0, 0]} 
        position={[0, 0.05, -LENGTH/2]}
        onUpdate={(self) => {
          self.material.transparent = true;
          self.material.opacity = 0.2;
        }}
      />
    </group>
  );
}