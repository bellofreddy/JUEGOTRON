"use client";
import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../useGameStore";

const NEON_CIAN = "#00f7ff";
const MOVE_LERP = 0.28;
const VERTICAL_SPEED = 0.32;

export default function TronShip() {
  const shipRef = useRef();
  const verticalRef = useRef(0); // Posición vertical (-5 a 5)
  const { lane, isPaused, moveLeft, moveRight } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPaused) return;
      // W/ArrowUp para subir
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        verticalRef.current = Math.min(verticalRef.current + 1, 5);
      }
      // S/ArrowDown para bajar
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        verticalRef.current = Math.max(verticalRef.current - 1, -5);
      }
      // Izquierda/Derecha para cambiar de carril
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") moveLeft();
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") moveRight();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaused, moveLeft, moveRight]);

  useFrame((state, delta) => {
    if (!shipRef.current) return;

    // Movimiento lateral (X) suave
    const targetX = lane * 4;
    shipRef.current.position.x = THREE.MathUtils.lerp(
      shipRef.current.position.x,
      targetX,
      MOVE_LERP
    );

    // Movimiento vertical (Y) suave
    shipRef.current.position.y = THREE.MathUtils.lerp(
      shipRef.current.position.y,
      verticalRef.current,
      VERTICAL_SPEED
    );

    // Rotación según el movimiento
    shipRef.current.rotation.z = (verticalRef.current / 5) * 0.3;
    shipRef.current.rotation.x = (shipRef.current.position.x - targetX) * 0.15;
  });
return (
    <group ref={shipRef} position={[0, 0, 0]}>
      {/* Cuerpo Central (Triangular/Aerodinámico) */}
      <mesh castShadow>
        <coneGeometry args={[1.2, 3.5, 3]} />
        <meshStandardMaterial 
          color="#020202" 
          metalness={1} 
          roughness={0.05}
          emissive="#001a2e"
          emissiveIntensity={5}
        />
      </mesh>

      {/* Alas laterales con líneas de neón */}
      {[ -1, 1 ].map((side, i) => (
        <group key={i} position={[side * 1.8, 0, -0.5]}>
          <mesh rotation={[0, 0, side * 0.5]} castShadow>
            <boxGeometry args={[2.2, 0.15, 2.8]} />
            <meshStandardMaterial 
              color="#020202"
              emissive="#001a2e"
              emissiveIntensity={3}
            />
          </mesh>
          
          {/* Borde de Neón en las alas - PRINCIPAL */}
          <mesh position={[side * 0.6, 0.08, 0]}>
            <boxGeometry args={[0.15, 0.03, 2.9]} />
            <meshStandardMaterial 
              color={NEON_CIAN} 
              emissive={NEON_CIAN} 
              emissiveIntensity={25} 
              toneMapped={false}
            />
          </mesh>

          {/* Borde lateral superior */}
          <mesh position={[side * 1.1, 0.08, 0]}>
            <boxGeometry args={[0.08, 0.02, 2.9]} />
            <meshStandardMaterial 
              color={NEON_CIAN} 
              emissive={NEON_CIAN} 
              emissiveIntensity={15} 
              toneMapped={false}
            />
          </mesh>

          {/* Borde lateral inferior */}
          <mesh position={[side * 1.1, -0.08, 0]}>
            <boxGeometry args={[0.08, 0.02, 2.9]} />
            <meshStandardMaterial 
              color={NEON_CIAN} 
              emissive={NEON_CIAN} 
              emissiveIntensity={15} 
              toneMapped={false}
            />
          </mesh>

          {/* --- NUEVA: PUNTA TRASERA DE LUZ (Alerón de energía) --- */}
          <mesh position={[side * 0.4, 0, -1.6]}>
            <boxGeometry args={[0.1, 0.05, 1.2]} />
            <meshStandardMaterial 
              color={NEON_CIAN} 
              emissive={NEON_CIAN} 
              emissiveIntensity={30} 
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Cabina superior brillante */}
      <mesh position={[0, 0.5, 0.3]} castShadow>
        <sphereGeometry args={[0.5, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#000" 
          metalness={1} 
          roughness={0}
          emissive="#00f7ff"
          emissiveIntensity={8}
        />
      </mesh>

      {/* Borde frontal del cuerpo - líneas neón */}
      {[ -0.3, 0.3 ].map((x, i) => (
        <mesh key={`border-${i}`} position={[x, 0.4, 1.2]}>
          <boxGeometry args={[0.05, 0.5, 0.1]} />
          <meshStandardMaterial 
            color={NEON_CIAN}
            emissive={NEON_CIAN}
            emissiveIntensity={20}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Generador de energía central */}
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial 
          color={NEON_CIAN}
          emissive={NEON_CIAN}
          emissiveIntensity={25}
          toneMapped={false}
        />
      </mesh>

      {/* Luces de propulsión (Traseras) */}
      {[ -0.8, 0.8 ].map((x, i) => (
        <mesh key={i} position={[x, -0.3, -1.5]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color={NEON_CIAN}
            emissive={NEON_CIAN}
            emissiveIntensity={30}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* --- NUEVA: LÍNEA DE CORTE TRASERA (Escape de motor) --- */}
      <mesh position={[0, -0.1, -1.75]}>
        <boxGeometry args={[1.6, 0.05, 0.1]} />
        <meshStandardMaterial 
          color={NEON_CIAN} 
          emissive={NEON_CIAN} 
          emissiveIntensity={35} 
          toneMapped={false} 
        />
      </mesh>

      {/* Luces de guía lateral */}
      {[ -1.2, 1.2 ].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.1, 0.3, 1.5]} />
          <meshStandardMaterial 
            color={NEON_CIAN}
            emissive={NEON_CIAN}
            emissiveIntensity={25}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Luz point dinámica */}
      <pointLight
        color={NEON_CIAN}
        intensity={12}
        distance={25}
        decay={2}
        castShadow
      />
   
      {[ -1, 1 ].map((side, i) => (
        <group key={i} position={[side * 1.8, 0, -0.5]}>
          {/* Geometría de la aleta que ya tenías */}
          <mesh rotation={[0, 0, side * 0.5]} castShadow>
            <boxGeometry args={[2.2, 0.15, 2.8]} />
            <meshStandardMaterial color="#020202" emissive="#001a2e" emissiveIntensity={3} />
          </mesh>

          {/* --- ESTELA DE LUZ INFINITA (Hacia la pantalla) --- */}
          {/* 1. La posicionamos en el extremo de la aleta (side * 1.1)
              2. La mandamos hacia atrás (Z positivo, ya que el grupo avanza en Z negativo)
              3. Le damos un largo inmenso (ej: 500 unidades)
          */}
          <mesh position={[side * 1.1, 0, 250]}> 
            <boxGeometry args={[0.08, 0.02, 500]} /> 
            <meshStandardMaterial 
              color={NEON_CIAN} 
              emissive={NEON_CIAN} 
              emissiveIntensity={40} 
              transparent
              opacity={0.7}
              toneMapped={false}
            />
          </mesh>

          {/* El borde neón corto de la aleta para que la conexión se vea sólida */}
          <mesh position={[side * 0.6, 0.08, 0]}>
            <boxGeometry args={[0.15, 0.03, 2.9]} />
            <meshStandardMaterial color={NEON_CIAN} emissive={NEON_CIAN} emissiveIntensity={25} toneMapped={false} />
          </mesh>
        </group>
      ))}
      
    </group>
  );
}
