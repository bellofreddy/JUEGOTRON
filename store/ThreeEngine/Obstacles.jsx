// Obstacles.jsx — Efecto de Profundidad Infinita (OPTIMIZADO)
"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";
import { QUALITY_SETTINGS } from "../constants";

const BUILDING_COUNT = 45;
const SPACING_GRID = 20;
const SPACING_SPACE = 45;
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

        const branches = Array.from({ length: 5 }, () => ({
          pos: [
            (Math.random() - 0.5) * w,
            (Math.random() - 0.5) * h,
            w / 2 + 0.1,
          ],
          size:
            Math.random() > 0.5 ? [0.1, h * 0.3, 0.1] : [w * 0.4, 0.1, 0.1],
        }));

        // ✅ OPTIMIZACIÓN: Cacheamos la EdgeGeometry aquí en useMemo, una vez por edificio.
        // Antes: "new THREE.BoxGeometry()" se ejecutaba en cada re-render del componente.
        const edgeGeo = new THREE.BoxGeometry(w, h, w);

        return {
          id: i,
          x: isSpace ? (i % 2 === 0 ? 55 : -55) : i % 2 === 0 ? 15 : -15,
          initZ: -i * (isSpace ? SPACING_SPACE : SPACING_GRID),
          height: h,
          width: w,
          color,
          branches,
          edgeGeo,
        };
      }),
    [dimension]
  );

  const meshRefs = useRef([]);

  // ✅ OPTIMIZACIÓN: Guardamos referencias directas a TODOS los materiales de cada edificio.
  // Antes: group.traverse() recorría todo el árbol de hijos cada frame (muy costoso con 45 edificios).
  // Ahora: accedemos directo al array de materiales sin ninguna búsqueda.
  const materialRefs = useRef([]);

  useFrame((state, delta) => {
    const { speed, isPaused } = useGameStore.getState();
    if (isPaused) return;

    const currentSpacing = isSpace ? SPACING_SPACE : SPACING_GRID;
    const spawnZ = -(BUILDING_COUNT * currentSpacing);

    meshRefs.current.forEach((group, idx) => {
      if (!group) return;

      group.position.z += speed * delta;

      if (group.position.z > RECYCLE_Z) {
        group.position.z = spawnZ;
      }

      // ✅ Acceso directo a materiales — sin traverse
      if (isSpace && materialRefs.current[idx]) {
        const dist = Math.abs(group.position.z);
        const appearanceThreshold = 800;
        const solidThreshold = 300;
        let opacity =
          1 -
          (dist - solidThreshold) / (appearanceThreshold - solidThreshold);
        opacity = THREE.MathUtils.clamp(opacity, 0, 1);

        for (const mat of materialRefs.current[idx]) {
          mat.transparent = opacity < 1;
          mat.opacity = opacity;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = opacity * 10;
          }
        }
      }
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
          {/* 1. CUERPO DEL EDIFICIO */}
          <mesh>
            <boxGeometry args={[b.width, b.height, b.width]} />
            <meshStandardMaterial
              ref={(mat) => {
                if (mat) {
                  if (!materialRefs.current[i]) materialRefs.current[i] = [];
                  materialRefs.current[i][0] = mat;
                }
              }}
              color="#050505"
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>

          {/* 2. ESQUELETO EXTERIOR — usa geometría cacheada del useMemo */}
          <lineSegments>
            <primitive object={b.edgeGeo} attach="geometry" />
            <lineBasicMaterial
              ref={(mat) => {
                if (mat) {
                  if (!materialRefs.current[i]) materialRefs.current[i] = [];
                  materialRefs.current[i][1] = mat;
                }
              }}
              color={b.color}
              transparent
              opacity={0.3}
            />
          </lineSegments>

          {/* 3. BANDAS HORIZONTALES */}
          {[0.2, 0.5, 0.8].map((factor, idx) => (
            <mesh key={idx} position={[0, b.height * (factor - 0.5), 0]}>
              <boxGeometry args={[b.width + 0.05, 0.1, b.width + 0.05]} />
              <meshStandardMaterial
                ref={(mat) => {
                  if (mat) {
                    if (!materialRefs.current[i]) materialRefs.current[i] = [];
                    materialRefs.current[i][2 + idx] = mat;
                  }
                }}
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
              <pointLight
                position={[branch.pos[0], branch.pos[1], branch.pos[2] - 0.2]}
                distance={2}
                intensity={0.5}
                color={b.color}
              />
              <mesh position={branch.pos}>
                <boxGeometry args={branch.size} />
                <meshStandardMaterial
                  ref={(mat) => {
                    if (mat) {
                      if (!materialRefs.current[i])
                        materialRefs.current[i] = [];
                      materialRefs.current[i][5 + idx] = mat;
                    }
                  }}
                  color={b.color}
                  emissive={b.color}
                  emissiveIntensity={2}
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