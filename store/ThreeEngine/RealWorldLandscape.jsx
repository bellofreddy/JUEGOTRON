// RealWorldLandscape.jsx — Mundo Real: carretera, árboles, cielo
"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";

// ── Paleta del mundo real ────────────────────────────────────────────────────
const ASPHALT   = "#2a2a2e";
const LINE_YEL  = "#f5c518";
const GRASS     = "#3a6b35";
const BARK      = "#4a3728";
const LEAF      = "#2d6e2d";
const SKY_TOP   = "#4a90d9";
const SKY_HOR   = "#87ceeb";
const CLOUD_COL = "#ffffff";
const MOUNTAIN  = "#6b7c8a";

// ── Constantes de carretera ───────────────────────────────────────────────────
const ROAD_W       = 14;    // ancho de la calzada
const ROAD_L       = 2000;  // largo (parece infinita)
const ROAD_BACK_EXT = 420;  // tramo que queda detras del jugador/camara
const ROAD_TOTAL_L = ROAD_L + ROAD_BACK_EXT;
const ROAD_Z_CENTER = (-ROAD_L + ROAD_BACK_EXT) / 2;
const SHOULDER_W   = 3;     // berma a cada lado

// ── Árboles ───────────────────────────────────────────────────────────────────
const TREE_COUNT   = 30;    // por lado
const TREE_SPACING = 18;

// ── Nubes ─────────────────────────────────────────────────────────────────────
const CLOUD_COUNT  = 14;
const CLOUD_RECYCLE = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Árbol simple (cono + cilindro)
// ─────────────────────────────────────────────────────────────────────────────
function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {/* Tronco */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 2.4, 6]} />
        <meshStandardMaterial color={BARK} roughness={0.9} metalness={0} />
      </mesh>
      {/* Copa exterior */}
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[1.6, 4.2, 7]} />
        <meshStandardMaterial color={LEAF} roughness={0.85} metalness={0} />
      </mesh>
      {/* Copa interior (más oscura, da volumen) */}
      <mesh position={[0, 3.0, 0]}>
        <coneGeometry args={[1.9, 2.8, 7]} />
        <meshStandardMaterial color="#1e4e1e" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Nube (esferas agrupadas)
// ─────────────────────────────────────────────────────────────────────────────
function Cloud({ position }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[3.5, 7, 7]} />
        <meshStandardMaterial color={CLOUD_COL} roughness={1} metalness={0} transparent opacity={0.92} />
      </mesh>
      <mesh position={[3.5, -0.8, 0]}>
        <sphereGeometry args={[2.6, 6, 6]} />
        <meshStandardMaterial color={CLOUD_COL} roughness={1} metalness={0} transparent opacity={0.88} />
      </mesh>
      <mesh position={[-3, -0.5, 0.5]}>
        <sphereGeometry args={[2.2, 6, 6]} />
        <meshStandardMaterial color={CLOUD_COL} roughness={1} metalness={0} transparent opacity={0.85} />
      </mesh>
      <mesh position={[1, 1.8, 0]}>
        <sphereGeometry args={[2, 6, 6]} />
        <meshStandardMaterial color="#f0f0f0" roughness={1} metalness={0} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function RealWorldLandscape() {
  const treeGroupRef  = useRef();
  const cloudGroupRef = useRef();
  const skyRef        = useRef();  // ← esfera de cielo sigue a la cámara

  // ── Posiciones de árboles (estáticas, generadas una vez) ──────────────────
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const z     = -i * TREE_SPACING;
      const scale = 0.8 + Math.random() * 0.5;
      const jitter = (Math.random() - 0.5) * 3;
      // Lado derecho
      arr.push({ id: `r${i}`, position: [ROAD_W / 2 + SHOULDER_W + 3 + jitter, 0, z], scale });
      // Lado izquierdo
      arr.push({ id: `l${i}`, position: [-(ROAD_W / 2 + SHOULDER_W + 3 + jitter), 0, z], scale });
    }
    return arr;
  }, []);

  // ── Posiciones de nubes (estáticas, el grupo rota/mueve lento) ────────────
  const clouds = useMemo(() => {
    return Array.from({ length: CLOUD_COUNT }, (_, i) => ({
      id: i,
      x:  (Math.random() - 0.5) * 160,
      y:  28 + Math.random() * 20,
      z:  -i * (ROAD_L / CLOUD_COUNT) + Math.random() * 30,
    }));
  }, []);

  // ── Animación ─────────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const { speed, isPaused } = useGameStore.getState();

    // ── La esfera de cielo siempre centrada en la cámara ──────────────────
    // Esto elimina las franjas en los bordes sin importar hacia dónde mire la cámara
    if (skyRef.current) {
      skyRef.current.position.copy(state.camera.position);
    }

    if (isPaused) return;

    // Los arboles se reciclan con su propia separacion.
    if (treeGroupRef.current) {
      treeGroupRef.current.position.z += speed * delta;
      if (treeGroupRef.current.position.z > TREE_SPACING) {
        treeGroupRef.current.position.z -= TREE_SPACING;
      }
    }

    // Nubes se mueven muy lento (viento suave)
    if (cloudGroupRef.current) {
      cloudGroupRef.current.position.z += speed * delta * 0.08;
      cloudGroupRef.current.position.x += delta * 0.4; // deriva lateral
      if (cloudGroupRef.current.position.z > CLOUD_RECYCLE) {
        cloudGroupRef.current.position.z = 0;
      }
    }
  });

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          CIELO — esfera completa que sigue a la cámara (cubre los 360°)
          El ref permite que el useFrame la reposicione en cada frame
          para que nunca quede fuera del frustum de la cámara.
      ═══════════════════════════════════════════════════════════════ */}
      <group ref={skyRef}>
        {/* Esfera base — azul cielo */}
        <mesh>
          <sphereGeometry args={[500, 32, 16]} />
          <meshBasicMaterial color={SKY_TOP} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        {/* Franja del horizonte — azul más claro en la banda ecuatorial */}
        <mesh>
          <cylinderGeometry args={[495, 495, 160, 32, 1, true]} />
          <meshBasicMaterial color={SKY_HOR} side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} />
        </mesh>
        {/* Franja inferior — evita el corte azul abajo de la cámara */}
        <mesh rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[498, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3]} />
          <meshBasicMaterial color={SKY_HOR} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      </group>

      {/* ═══════════════════════════════════════════════════════════════
          MONTAÑAS DE FONDO (estáticas, solo decoración)
      ═══════════════════════════════════════════════════════════════ */}
      {[-180, -100, -60, 60, 100, 180].map((x, i) => (
        <mesh key={i} position={[x, 8 + (i % 3) * 6, -280]} castShadow={false}>
          <coneGeometry args={[30 + (i % 3) * 12, 50 + (i % 2) * 20, 5]} />
          <meshStandardMaterial color={MOUNTAIN} roughness={1} metalness={0} />
        </mesh>
      ))}

      {/* ═══════════════════════════════════════════════════════════════
          NUBES (grupo que se mueve lento)
      ═══════════════════════════════════════════════════════════════ */}
      <group ref={cloudGroupRef}>
        {clouds.map((c) => (
          <Cloud key={c.id} position={[c.x, c.y, c.z]} />
        ))}
      </group>

      {/* ═══════════════════════════════════════════════════════════════
          PLANO BLOQUEADOR — ESTÁTICO, fuera de cualquier grupo móvil
          Igual que Grid.jsx: cubre el fondo del Canvas en los 360°.
          Está en y:-0.03 para quedar debajo de toda la geometría.
          Es meshBasicMaterial para que las luces no lo afecten.
      ═══════════════════════════════════════════════════════════════ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <meshBasicMaterial color={ASPHALT} />
      </mesh>

      {/* ═══════════════════════════════════════════════════════════════
          GRUPO PRINCIPAL: carretera + bermas + árboles (se recicla)
      ═══════════════════════════════════════════════════════════════ */}
      <group position={[0, 0, 0]}>

        {/* ── Suelo de hierba — extendido hacia atrás para cubrir bajo la cámara ── */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, ROAD_Z_CENTER]}>
          <planeGeometry args={[600, ROAD_TOTAL_L]} />
          <meshStandardMaterial color={GRASS} roughness={0.95} metalness={0} />
        </mesh>

        {/* ── Asfalto ── */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROAD_Z_CENTER]}>
          <planeGeometry args={[ROAD_W, ROAD_TOTAL_L]} />
          <meshStandardMaterial color={ASPHALT} roughness={0.8} metalness={0.05} />
        </mesh>

        {/* ── Bermas grises a cada lado ── */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[side * (ROAD_W / 2 + SHOULDER_W / 2), 0.005, ROAD_Z_CENTER]}
          >
            <planeGeometry args={[SHOULDER_W, ROAD_TOTAL_L]} />
            <meshStandardMaterial color="#999" roughness={0.9} metalness={0} />
          </mesh>
        ))}

        {/* Doble linea amarilla: separa los dos sentidos de la carretera real. */}
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.018, ROAD_Z_CENTER]}>
            <planeGeometry args={[0.14, ROAD_TOTAL_L]} />
            <meshStandardMaterial color={LINE_YEL} roughness={0.45} />
          </mesh>
        ))}

        {/* ── Líneas blancas continuas de borde de carril ── */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[side * (ROAD_W / 2 - 0.5), 0.01, ROAD_Z_CENTER]}
          >
            <planeGeometry args={[0.18, ROAD_TOTAL_L]} />
            <meshStandardMaterial color="#cccccc" roughness={0.5} />
          </mesh>
        ))}

        {/* ── Árboles a ambos lados ── */}
        <group ref={treeGroupRef}>
          {trees.map((t) => (
            <Tree key={t.id} position={t.position} scale={t.scale} />
          ))}
        </group>

      </group>

      {/* ═══════════════════════════════════════════════════════════════
          LUZ SOLAR — direccional cálida desde arriba-derecha
      ═══════════════════════════════════════════════════════════════ */}
      <ambientLight intensity={0.7} color="#fff8f0" />
      <directionalLight
        position={[40, 60, 20]}
        intensity={1.8}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={300}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      {/* Luz de relleno del cielo (azul suave desde arriba) */}
      <hemisphereLight skyColor={SKY_TOP} groundColor={GRASS} intensity={0.5} />
    </>
  );
}
