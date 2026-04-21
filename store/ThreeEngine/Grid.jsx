// Grid.jsx
"use client";
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";

export const WORLD_GROUND_Y = 0;

export default function Grid() {
  const gridRef = useRef();
  
  useFrame((state, delta) => {
    const { speed, isPaused } = useGameStore.getState();
    if (isPaused) return;

    if (gridRef.current) {
      // Movimiento infinito
      gridRef.current.position.z += speed * delta;
      if (gridRef.current.position.z > 20) { // Ajustado según el tamaño del cuadro
        gridRef.current.position.z = 0;
      }
    }
  });

return (
    <group ref={gridRef} position={[0, WORLD_GROUND_Y, 0]}>
      {/* 1. LA REJILLA (Las líneas neón) */}
      <gridHelper 
        args={[500, 50, "#00f7ff", "#00f7ff"]} 
        onUpdate={(self) => {
          self.material.transparent = true;
          self.material.opacity = 0.5;
        }}
      />

      {/* 2. EL BLOQUEADOR DE ESTRELLAS */}
      {/* Ponemos un plano negro sólido justo debajo de la rejilla */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial color="#000000" /> 
        {/* Usamos meshBasicMaterial para que sea negro absoluto y no le afecten las luces */}
      </mesh>
    </group>
  );
}