// Obstacles.jsx — Efecto de Profundidad Infinita
"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";
import { QUALITY_SETTINGS } from "../constants";

const BUILDING_COUNT = 45;
const SPACING_GRID = 20; // Espaciado original para la moto
const SPACING_SPACE = 45; // Espaciado amplio para la nave
const RECYCLE_Z = 60;

export default function Obstacles() {
  const { dimension } = useGameStore();
  const isSpace = dimension === "SPACE";
  const quality = useGameStore((state) => state.quality);
  const settings = QUALITY_SETTINGS[quality];
  const buildings = useMemo(
    () =>
      Array.from({ length: BUILDING_COUNT }, (_, i) => {
        const h = isSpace ? 70 + Math.random() * 60 : 14 + Math.random() * 14;
        const w = isSpace ? 16 : 4 + Math.random() * 3;
        const color = isSpace ? "#ff6600" : "#00f7ff";

        // Ramificaciones (solo se verán realmente bien en modo nave por el brillo)
        const branches = Array.from({ length: 5 }, () => ({
          pos: [
            (Math.random() - 0.5) * w,
            (Math.random() - 0.5) * h,
            w / 2 + 0.1,
          ],
          size: Math.random() > 0.5 ? [0.1, h * 0.3, 0.1] : [w * 0.4, 0.1, 0.1],
        }));

        return {
          id: i,
          x: isSpace ? (i % 2 === 0 ? 55 : -55) : i % 2 === 0 ? 15 : -15,
          initZ: -i * (isSpace ? SPACING_SPACE : SPACING_GRID),
          height: h,
          width: w,
          color,
          branches,
        };
      }),
    [dimension],
  );

  const meshRefs = useRef([]);

  useFrame((state, delta) => {
    const { speed, isPaused } = useGameStore.getState();
    if (isPaused) return;

    meshRefs.current.forEach((group) => {
      if (!group) return;

      group.position.z += speed * delta;

      // 1. Reciclaje dinámico
      const currentSpacing = isSpace ? SPACING_SPACE : SPACING_GRID;
      const spawnZ = -(BUILDING_COUNT * currentSpacing);

      if (group.position.z > RECYCLE_Z) {
        group.position.z = spawnZ;
      }

      // 2. EFECTO DE PROFUNDIDAD: Solo activo en modo SPACE
      let opacity = 1;
      if (isSpace) {
        const dist = Math.abs(group.position.z);
        const appearanceThreshold = 800;
        const solidThreshold = 300;
        opacity =
          1 - (dist - solidThreshold) / (appearanceThreshold - solidThreshold);
        opacity = THREE.MathUtils.clamp(opacity, 0, 1);
      }

      // Aplicamos la opacidad y visibilidad
      group.traverse((child) => {
        if (child.material) {
          // En modo moto (isSpace = false), opacity siempre será 1
          child.material.transparent = opacity < 1;
          child.material.opacity = opacity;

          if (child.material.emissiveIntensity !== undefined) {
            // En la moto brilla fijo, en la nave brilla según distancia
            child.material.emissiveIntensity = isSpace ? opacity * 10 : 5;
          }
        }
      });
    });
  });

  return (
    <group>
      {buildings.map((b, i) => (
        <group
          key={b.id}
          ref={(el) => (meshRefs.current[i] = el)}
          position={[b.x, dimension === "SPACE" ? -25 : b.height / 2, b.initZ]}
        >
          {/* 1. CUERPO DEL EDIFICIO: Ahora es un material que reacciona a la luz */}
          <mesh>
            <boxGeometry args={[b.width, b.height, b.width]} />
            <meshStandardMaterial
              color="#050505"
              metalness={0.9}
              roughness={0.1} // Muy liso para que refleje el neón lateral
            />
          </mesh>

          {/* 2. ESQUELETO EXTERIOR: Para darle estructura visual */}
          <lineSegments>
            <edgesGeometry
              args={[new THREE.BoxGeometry(b.width, b.height, b.width)]}
            />
            <lineBasicMaterial color={b.color} transparent opacity={0.3} />
          </lineSegments>

          {/* 3. BANDAS HORIZONTALES: Simulan pisos y dan volumen */}
          {[0.2, 0.5, 0.8].map((factor, idx) => (
            <mesh key={idx} position={[0, b.height * (factor - 0.5), 0]}>
              <boxGeometry args={[b.width + 0.05, 0.1, b.width + 0.05]} />
              <meshStandardMaterial
                color={b.color}
                emissive={b.color}
                emissiveIntensity={2}
                transparent
                opacity={0.4}
              />
            </mesh>
          ))}

          {/* 4. RAMIFICACIONES TÉCNICAS */}
          {b.branches.map((branch, idx) => (
            <group key={idx}>
              {/* Luz de fondo de la rama para que "bañe" la pared del edificio */}
              <pointLight
                position={[branch.pos[0], branch.pos[1], branch.pos[2] - 0.2]}
                distance={2}
                intensity={0.5}
                color={b.color}
              />

              <mesh position={branch.pos}>
                <boxGeometry args={branch.size} />
                <meshStandardMaterial
                  color={b.color}
                  emissive={b.color}
                  emissiveIntensity={branch.glow}
                  toneMapped={false}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
