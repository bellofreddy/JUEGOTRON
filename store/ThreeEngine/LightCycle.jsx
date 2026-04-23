"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD_GROUND_Y } from "./Grid";
import { useGameStore } from "../useGameStore";

const NEON_CIAN = "#00f7ff";
const TRAIL_LENGTH = 150; // Más puntos para una estela más larga y fluida
const TRAIL_HEIGHT = 1.2; // Altura tipo "pared de luz"
const SPEED = 50;         // Ajusta esto para que coincida con la velocidad de tu Grid

export default function LightCycle() {
  const meshRef = useRef();
  const trailRef = useRef();
  const matRef = useRef();
  const { lane, moveLeft, moveRight, isPaused } = useGameStore();

  // Guardamos el historial de posiciones mundo
  const history = useRef([]);

  // Inicializamos la geometría de la cinta una sola vez
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAIL_LENGTH * 2 * 3);
    const uvs = new Float32Array(TRAIL_LENGTH * 2 * 2);
    const indices = new Uint16Array((TRAIL_LENGTH - 1) * 6);

    for (let i = 0; i < TRAIL_LENGTH - 1; i++) {
      const b = i * 2;
      indices[i * 6 + 0] = b; indices[i * 6 + 1] = b + 1; indices[i * 6 + 2] = b + 2;
      indices[i * 6 + 3] = b + 1; indices[i * 6 + 4] = b + 3; indices[i * 6 + 5] = b + 2;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, []);

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
    if (!meshRef.current || isPaused) return;

    // 1. Movimiento lateral suave de la moto
    const targetX = lane * 5;
    meshRef.current.position.x = THREE.MathUtils.lerp(
      meshRef.current.position.x, 
      targetX, 
      0.12
    );

    // 2. Inclinación visual (Banking)
    const tilt = (meshRef.current.position.x - targetX) * 0.15;
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, tilt, 0.1);

    // 3. Lógica de la Estela Dinámica
    const posAttr = trailGeo.attributes.position;
    const uvAttr = trailGeo.attributes.uv;

    // Añadimos la posición actual de la rueda trasera al inicio del historial
    history.current.unshift({ x: meshRef.current.position.x, z: 1.2 });

    if (history.current.length > TRAIL_LENGTH) history.current.pop();

    history.current.forEach((point, i) => {
      const t = i / (TRAIL_LENGTH - 1);
      const baseIdx = i * 2;

      // Desplazamos cada punto hacia atrás basándonos en el tiempo y la velocidad
      // Esto hace que la curva se quede "anclada" al suelo que retrocede
      const zOffset = point.z + (i * (SPEED * delta));

      // Vértice superior
      posAttr.setXYZ(baseIdx, point.x, WORLD_GROUND_Y + TRAIL_HEIGHT, zOffset);
      // Vértice inferior
      posAttr.setXYZ(baseIdx + 1, point.x, WORLD_GROUND_Y, zOffset);

      // UVs para el Shader de desvanecimiento
      uvAttr.setXY(baseIdx, t, 0);
      uvAttr.setXY(baseIdx + 1, t, 1);
    });

    posAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;

    // Efecto de pulso en el brillo
    if (matRef.current) {
      matRef.current.emissiveIntensity = 12 + Math.sin(state.clock.elapsedTime * 10) * 4;
    }
  });

  return (
    <>
      {/* RENDER DE LA ESTELA */}
      <mesh ref={trailRef} geometry={trailGeo}>
        <meshStandardMaterial
          ref={matRef}
          color={NEON_CIAN}
          emissive={NEON_CIAN}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
              `gl_FragColor = vec4( outgoingLight, diffuseColor.a * (1.0 - vUv.x) );`
            );
          }}
        />
      </mesh>

      {/* RENDER DE LA MOTO */}
      <group ref={meshRef} position={[0, WORLD_GROUND_Y + 0.1, 0]}>
        {/* Chasis principal */}
        <mesh castShadow position={[0, 0.4, -0.3]}>
          <boxGeometry args={[0.7, 0.7, 2.8]} />
          <meshStandardMaterial color="#080808" metalness={1} roughness={0.2} />
        </mesh>

        {/* Ruedas de Neón */}
        {[-1.2, 0.6].map((z, i) => (
          <group key={i} position={[0, 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
            <mesh>
              <torusGeometry args={[0.4, 0.05, 12, 32]} />
              <meshStandardMaterial 
                color={NEON_CIAN} 
                emissive={NEON_CIAN} 
                emissiveIntensity={15} 
                toneMapped={false} 
              />
            </mesh>
          </group>
        ))}

        {/* Paneles laterales */}
        {[-0.37, 0.37].map((x, i) => (
          <mesh key={i} position={[x, 0.4, 0]}>
            <boxGeometry args={[0.05, 0.3, 1.5]} />
            <meshStandardMaterial 
              color={NEON_CIAN} 
              emissive={NEON_CIAN} 
              emissiveIntensity={10} 
              toneMapped={false} 
            />
          </mesh>
        ))}

        {/* Piloto simplificado */}
        <mesh position={[0, 0.75, -0.1]}>
          <boxGeometry args={[0.4, 0.5, 1.2]} />
          <meshStandardMaterial color="#000" metalness={1} />
        </mesh>
      </group>
    </>
  );
}