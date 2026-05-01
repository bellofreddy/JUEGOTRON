// Obstacles.jsx — PARCHEADO
// Cambios:
//   1. BUILDING_COUNT ahora viene de QUALITY_SETTINGS (el original usaba constante fija)
//   2. dispose() de edgeGeo al cambiar dimension → elimina el memory leak de VRAM
//   3. Selectores granulares en useGameStore
"use client";
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";
import { QUALITY_SETTINGS } from "../constants";

const SPACING_GRID  = 20;
const SPACING_SPACE = 45;
const RECYCLE_Z     = 60;

export default function Obstacles() {
  const dimension = useGameStore((s) => s.dimension);
  const quality   = useGameStore((s) => s.quality);
  const isSpace   = dimension === "SPACE";

  // PARCHE 1: usa buildingCount del sistema de calidad en lugar del valor fijo 45
  const settings      = QUALITY_SETTINGS[quality];
  const BUILDING_COUNT = settings.buildingCount;

  const buildings = useMemo(
    () =>
      Array.from({ length: BUILDING_COUNT }, (_, i) => {
        const h     = isSpace ? 70 + Math.random() * 60 : 14 + Math.random() * 14;
        const w     = isSpace ? 16 : 4 + Math.random() * 3;
        const color = isSpace ? "#ff6600" : "#00f7ff";

        const branches = Array.from({ length: settings.showBranches ? (settings.branchCount ?? 3) : 0 }, () => ({
          pos:  [(Math.random() - 0.5) * w, (Math.random() - 0.5) * h, w / 2 + 0.1],
          size: Math.random() > 0.5 ? [0.1, h * 0.3, 0.1] : [w * 0.4, 0.1, 0.1],
        }));

        // PARCHE 2: guardamos referencia al edgeGeo para poder hacerle dispose
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
    [dimension, quality] // PARCHE: quality también invalida el memo
  );

  // PARCHE 2: dispose de geometrías cuando cambia la dimensión o calidad
  useEffect(() => {
    return () => {
      buildings.forEach((b) => {
        if (b.edgeGeo) b.edgeGeo.dispose();
      });
    };
  }, [buildings]);

  const meshRefs     = useRef([]);
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

      if (isSpace && materialRefs.current[idx]) {
        const dist = Math.abs(group.position.z);
        const appearanceThreshold = 800;
        const solidThreshold      = 300;
        let opacity =
          1 - (dist - solidThreshold) / (appearanceThreshold - solidThreshold);
        opacity = THREE.MathUtils.clamp(opacity, 0, 1);

        for (const mat of materialRefs.current[idx]) {
          mat.transparent        = opacity < 1;
          mat.opacity            = opacity;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity  = opacity * 10;
          }
        }
      }
    });
  });

  return (
    <group>
      {buildings.map((b, idx) => {
        const emissiveColor = new THREE.Color(b.color);
        const mats = [];

        return (
          <group
            key={b.id}
            ref={(el) => (meshRefs.current[idx] = el)}
            position={[b.x, b.height / 2, b.initZ]}
          >
            <mesh
              ref={(el) => {
                if (el?.material) {
                  mats.push(el.material);
                  materialRefs.current[idx] = mats;
                }
              }}
            >
              <boxGeometry args={[b.width, b.height, b.width]} />
              <meshStandardMaterial
                color="#050510"
                emissive={emissiveColor}
                emissiveIntensity={isSpace ? 10 : 3}
                transparent
                opacity={isSpace ? 0 : 0.9}
              />
            </mesh>

            <lineSegments>
              <primitive object={b.edgeGeo} attach="geometry" />
              <lineBasicMaterial color={b.color} />
            </lineSegments>

            {b.branches.map((br, bi) => (
              <mesh key={bi} position={br.pos}>
                <boxGeometry args={br.size} />
                <meshStandardMaterial
                  color="#050510"
                  emissive={emissiveColor}
                  emissiveIntensity={isSpace ? 8 : 2}
                  transparent
                  opacity={isSpace ? 0 : 0.7}
                  ref={(el) => {
                    if (el) {
                      mats.push(el);
                      materialRefs.current[idx] = mats;
                    }
                  }}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}