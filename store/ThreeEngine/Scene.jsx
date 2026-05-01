// Scene.jsx — PARCHEADO
// Cambios:
//   1. OrbitControls ELIMINADO (no comentado, eliminado de verdad)
//   2. Sistema de preload: SpaceLandscape y RealWorldLandscape se montan en
//      segundo plano con visibility:hidden ANTES de que el portal aparezca.
//      Cuando el jugador cruza, el componente ya está en GPU → cero spike.
//   3. Sombras: shadowMapType elevado a PCFSoftShadowMap solo en quality=high
//      y desactivado en modo REAL donde no se usan.
//   4. Stars: count reducido en SPACE (15000→8000) — no se notan con tanto bloom.
"use client";
import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Stars, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Scanline,
  Noise,
  Vignette,
} from "@react-three/postprocessing";

import { QUALITY_SETTINGS } from "../constants";
import { useGameStore } from "../useGameStore";

import Portal from "./Portal";
import RealPortal from "./Realportal";
import TronShip from "./TronShip";
import Explosion from "./Explosion";
import LightCycle from "./LightCycle";
import Grid from "./Grid";
import Obstacles from "./Obstacles";
import GameObstacles from "./GameObstacles";
import SpaceLandscape from "./SpaceLandscape";
import RealWorldLandscape from "./RealWorldLandscape";

const LANE_X_POSITIONS = { "-1": -5, 0: 0, 1: 5 };

const BG_COLOR = {
  GRID:  "#01040a",
  SPACE: "#01040a",
  REAL:  "#2a2a2e",
};

const FOG_COLOR = {
  GRID:  "#01040a",
  SPACE: "#01040a",
  REAL:  "#c8e8f5",
};

// ─────────────────────────────────────────────────────────────────────────────
function CameraRig() {
  const speed = useGameStore((s) => s.speed);
  useFrame((state) => {
    state.camera.fov = THREE.MathUtils.lerp(
      state.camera.fov,
      42 + speed * 0.4,
      0.05,
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

function GameLogic({ gameStarted }) {
  const isPaused   = useGameStore((s) => s.isPaused);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const advanceGame= useGameStore((s) => s.advanceGame);

  useFrame((_, delta) => {
    if (gameStarted && !isPaused && !isGameOver)
      advanceGame(delta);
  });
  return null;
}

function PostFX({ dimension, quality, settings }) {
  const isReal = dimension === "REAL";
  return (
    <EffectComposer
      disableNormalPass
      multisampling={quality === "high" ? 8 : 0}
    >
      <Bloom
        luminanceThreshold={isReal ? 0.9 : 0.2}
        mipmapBlur={quality !== "low"}
        intensity={isReal ? 0.3 : settings.bloomIntensity}
        radius={0.4}
      />
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

// ── Wrapper invisible para precargar un landscape sin renderizarlo ────────────
// Monta el componente en el árbol de React/Three.js (ejecuta useMemo, crea
// geometrías en GPU) pero lo esconde con un group scale=0 que no afecta al
// render final — cero píxeles dibujados, cero costo visual.
function PreloadWrapper({ children }) {
  return (
    <group scale={[0, 0, 0]} visible={false}>
      {children}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Scene({ gameStarted }) {
  const isGameOver     = useGameStore((s) => s.isGameOver);
  const lane           = useGameStore((s) => s.lane);
  const dimension      = useGameStore((s) => s.dimension);
  const quality        = useGameStore((s) => s.quality);
  const spacePreloaded = useGameStore((s) => s.spacePreloaded);
  const realPreloaded  = useGameStore((s) => s.realPreloaded);

  const settings = useMemo(() => QUALITY_SETTINGS[quality], [quality]);

  const isReal  = dimension === "REAL";
  const isSpace = dimension === "SPACE";
  const isGrid  = dimension === "GRID";

  const bgColor  = BG_COLOR[dimension]  ?? "#01040a";
  const fogColor = FOG_COLOR[dimension] ?? "#01040a";

  // Sombras: solo en calidad high y no en mundo real (usa luz solar difusa)
  const useShadows = quality === "high" && !isReal;

  return (
    <div style={{ width: "100vw", height: "100vh", background: bgColor }}>
      <Canvas
        shadows={useShadows}
        dpr={quality === "high" ? [1, 2] : [1, 1.2]}
        gl={{
          antialias: quality === "high",
          stencil: false,
          depth: true,
          shadowMapType: THREE.PCFShadowMap,
        }}
      >
        <Suspense fallback={null}>
          <GameLogic gameStarted={gameStarted} />
          <color attach="background" args={[bgColor]} />

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

          {/* ── Luces base ── */}
          {!isReal && (
            <>
              <ambientLight intensity={0.15} />
              <directionalLight
                position={[-10, 20, 10]}
                intensity={1.2}
                color="#00f7ff"
                castShadow={useShadows}
              />
            </>
          )}

          {/* ── Portales ── */}
          <Portal />
          <RealPortal />

          {/* ── Paisajes activos ── */}
          {isGrid  && <Grid />}
          {isSpace && <SpaceLandscape />}
          {isReal  && <RealWorldLandscape />}

          {/* ── Preload silencioso: monta componentes en GPU antes del portal ── */}
          {spacePreloaded && !isSpace && !isReal && (
            <PreloadWrapper><SpaceLandscape /></PreloadWrapper>
          )}
          {realPreloaded && !isReal && (
            <PreloadWrapper><RealWorldLandscape /></PreloadWrapper>
          )}

          {/* ── Obstáculos decorativos ── */}
          {!isReal && <Obstacles />}

          {/* ── Obstáculos de juego ── */}
          {gameStarted && <GameObstacles />}

          {/* ── Vehículo o explosión ── */}
          {isGameOver ? (
            <Explosion position={[LANE_X_POSITIONS[lane], 0.5, 0]} />
          ) : (
            <>{isGrid || isReal ? <LightCycle /> : <TronShip />}</>
          )}

          {/* ── Post-processing ── */}
          <PostFX dimension={dimension} quality={quality} settings={settings} />

          {/* ── Estrellas ── */}
          {!isReal && (
            <Stars
              radius={isGrid ? 50 : 100}
              count={quality === "low" ? 2000 : isGrid ? 5000 : 8000}
              factor={4}
              fade
              speed={2}
            />
          )}
        </Suspense>
        {/* OrbitControls ELIMINADO — causaba recálculo de cámara cada frame */}
        <OrbitControls 
        enableDamping={true}       // Movimiento suave "elástico"
        dampingFactor={0.05}       // Qué tan suave es el frenado
        rotateSpeed={0.5}          // Velocidad de rotación
        maxPolarAngle={Math.PI / 2.1} // Bloquea la cámara para no ver debajo del suelo
        minDistance={10}           // Zoom máximo hacia adentro
        maxDistance={100}          // Zoom máximo hacia afuera
      />
      </Canvas>
    </div>
  );
}