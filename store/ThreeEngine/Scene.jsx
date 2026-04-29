// Scene.jsx
"use client";
import React, { Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PerspectiveCamera, Stars, OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Scanline,
  Noise,
  Vignette,
} from "@react-three/postprocessing";

import { QUALITY_SETTINGS } from "../constants";
import { useGameStore } from "../useGameStore";

import Portal           from "./Portal";
import RealPortal       from "./Realportal";
import TronShip         from "./TronShip";
import Explosion        from "./Explosion";
import LightCycle       from "./LightCycle";
import Grid             from "./Grid";
import Obstacles        from "./Obstacles";
import GameObstacles    from "./GameObstacles";
import SpaceLandscape   from "./SpaceLandscape";
import RealWorldLandscape from "./RealWorldLandscape";

const LANE_X_POSITIONS = { "-1": -5, 0: 0, 1: 5 };

// ── Color de fondo por dimensión ─────────────────────────────────────────────
const BG_COLOR = {
  GRID:  "#01040a",
  SPACE: "#01040a",
  REAL:  "#2a2a2e",   // asfalto — si se cuela algún pixel es invisible
};

// ── Niebla por dimensión ──────────────────────────────────────────────────────
const FOG_COLOR = {
  GRID:  "#01040a",
  SPACE: "#01040a",
  REAL:  "#c8e8f5",   // niebla blanca-azulada en el horizonte
};

// ─────────────────────────────────────────────────────────────────────────────
function CameraRig() {
  const speed = useGameStore((state) => state.speed);
  useFrame((state) => {
    state.camera.fov = THREE.MathUtils.lerp(
      state.camera.fov,
      42 + speed * 0.4,
      0.05
    );
    state.camera.updateProjectionMatrix();

    if (speed > 25) {
      const shake = (speed - 25) * 0.001;
      state.camera.position.x += Math.sin(state.clock.elapsedTime * 30) * shake;
      state.camera.position.y += Math.cos(state.clock.elapsedTime * 30) * shake;
    }
  });
  return null;
}

function GameLogic() {
  const isPaused    = useGameStore((state) => state.isPaused);
  const isGameOver  = useGameStore((state) => state.isGameOver);
  const advanceGame = useGameStore((state) => state.advanceGame);

  useFrame((_, delta) => {
    if (!isPaused && !isGameOver) advanceGame(delta);
  });
  return null;
}

// ── Postprocessing adaptado a la dimensión ────────────────────────────────────
function PostFX({ dimension, quality, settings }) {
  const isReal = dimension === "REAL";
  return (
    <EffectComposer disableNormalPass multisampling={quality === "high" ? 8 : 0}>
      <Bloom
        luminanceThreshold={isReal ? 0.9 : 0.2}   // en el mundo real casi nada brilla
        mipmapBlur={quality !== "low"}
        intensity={isReal ? 0.3 : settings.bloomIntensity}
        radius={0.4}
      />
      {/* Viñeta suave en el mundo real para enmarcar la escena */}
      {isReal && <Vignette eskil={false} offset={0.3} darkness={0.6} />}
      {quality !== "low" && !isReal && (
        <>
          <Scanline opacity={0.05} />
          <Noise opacity={0.02} />
        </>
      )}
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Scene() {
  const isGameOver = useGameStore((state) => state.isGameOver);
  const lane       = useGameStore((state) => state.lane);
  const dimension  = useGameStore((state) => state.dimension);
  const quality    = useGameStore((state) => state.quality);
  const settings   = useMemo(() => QUALITY_SETTINGS[quality], [quality]);

  const isReal  = dimension === "REAL";
  const isSpace = dimension === "SPACE";
  const isGrid  = dimension === "GRID";

  const bgColor  = BG_COLOR[dimension]  ?? "#01040a";
  const fogColor = FOG_COLOR[dimension] ?? "#01040a";

  return (
    <div style={{ width: "100vw", height: "100vh", background: bgColor }}>
      <Canvas
        shadows={quality !== "low"}
        dpr={quality === "high" ? [1, 2] : [1, 1.2]}
        gl={{
          antialias: quality === "high",
          stencil: false,
          depth: true,
          shadowMapType: THREE.PCFShadowMap,
        }}
      >
        <Suspense fallback={null}>
          <GameLogic />
          <color attach="background" args={[bgColor]} />

          {/* Niebla: muy corta en mundo real para efecto de horizonte */}
          <fog
            attach="fog"
            args={[
              fogColor,
              isReal ? 80 : 10,
              isReal ? 280 : settings.renderDistance / 10,
            ]}
          />

          <PerspectiveCamera
            makeDefault
            position={[0, 7.5, 18]}
            fov={45}
            near={0.1}
            far={isReal ? 1100 : settings.renderDistance}
          />
          <CameraRig />

          {/* ── Luces base — se adaptan por dimensión ── */}
          {isReal ? (
            // Mundo real: luz solar cálida (las luces específicas están en RealWorldLandscape)
            null
          ) : (
            <>
              <ambientLight intensity={0.15} />
              <directionalLight
                position={[-10, 20, 10]}
                intensity={1.2}
                color="#00f7ff"
                castShadow={quality !== "low"}
              />
            </>
          )}

          {/* ── Portales ── */}
          <Portal />
          <RealPortal />

          {/* ── Paisajes ── */}
          {isGrid  && <Grid />}
          {isSpace && <SpaceLandscape />}
          {isReal  && <RealWorldLandscape />}

          {/* ── Obstáculos de decoración (edificios) — solo GRID y SPACE ── */}
          {!isReal && <Obstacles />}

          {/* ── Obstáculos de juego (barreras/discos) — solo GRID y SPACE ── */}
          <GameObstacles />

          {/* ── Vehículo o explosión ── */}
          {isGameOver ? (
            <Explosion position={[LANE_X_POSITIONS[lane], 0.5, 0]} />
          ) : (
            // En REAL seguimos con LightCycle (contraste intencional)
            <>{isGrid || isReal ? <LightCycle /> : <TronShip />}</>
          )}

          {/* ── Post-processing ── */}
          <PostFX dimension={dimension} quality={quality} settings={settings} />

          {/* ── Estrellas — solo en GRID y SPACE ── */}
          {!isReal && (
            <Stars
              radius={isGrid ? 50 : 100}
              count={quality === "low" ? 2000 : isGrid ? 5000 : 15000}
              factor={4}
              fade
              speed={2}
            />
          )}
        </Suspense>
        {/* OrbitControls eliminado — añade listeners y cálculos cada frame sin beneficio en gameplay */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
      
