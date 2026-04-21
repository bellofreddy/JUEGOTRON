"use client";
import React, { Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber"; 
import * as THREE from "three";
import { Stars, PerspectiveCamera, OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Scanline,
  Noise,
} from "@react-three/postprocessing";

// Tus componentes y constantes
import { QUALITY_SETTINGS } from "../constants"; // Asegúrate de la ruta
import { useGameStore } from "../useGameStore";
import Portal from "./Portal";
import TronShip from "./TronShip";
import Explosion from "./Explosion";
import LightCycle from "./LightCycle";
import Grid from "./Grid";
import Obstacles from "./Obstacles";
import GameObstacles from "./GameObstacles";
import AirstripLandscape from "./SpaceLandscape";

const LANE_X_POSITIONS = { "-1": -5, 0: 0, 1: 5 };

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
      const shakeAmount = (speed - 25) * 0.001;
      state.camera.position.x += Math.sin(state.clock.elapsedTime * 30) * shakeAmount;
      state.camera.position.y += Math.cos(state.clock.elapsedTime * 30) * shakeAmount;
    }
  });
  return null;
}

function GameLogic() {
  const isPaused = useGameStore((state) => state.isPaused);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const advanceGame = useGameStore((state) => state.advanceGame);

  useFrame((_, delta) => {
    if (!isPaused && !isGameOver) {
      advanceGame(delta);
    }
  });
  return null;
}

export default function Scene() {
  const isGameOver = useGameStore((state) => state.isGameOver);
  const lane = useGameStore((state) => state.lane);
  const dimension = useGameStore((state) => state.dimension);
  
  // --- CONEXIÓN CON CALIDAD ---
  const quality = useGameStore((state) => state.quality); //
  const settings = useMemo(() => QUALITY_SETTINGS[quality], [quality]); //

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <Canvas
        shadows={quality !== 'low'} // Desactiva sombras en bajo para más FPS
        dpr={quality === 'high' ? [1, 2] : [1, 1.2]} // Menos resolución en bajo/medio
        gl={{
          antialias: quality === 'high',
          stencil: false,
          depth: true,
          shadowMapType: THREE.PCFShadowMap,
        }}
      >
        <Suspense fallback={null}>
          <GameLogic />
          <color attach="background" args={["#01040a"]} />
          
          {/* Niebla que se ajusta a la distancia de renderizado seleccionada */}
          <fog attach="fog" args={["#01040a", 10, settings.renderDistance / 10]} />

          <PerspectiveCamera
            makeDefault
            position={[0, 7.5, 18]}
            fov={45}
            near={0.1}
            far={settings.renderDistance} // Corta el renderizado según la calidad
          />
          <CameraRig />

          <ambientLight intensity={0.15} />
          <directionalLight
            position={[-10, 20, 10]}
            intensity={1.2}
            color="#00f7ff"
            castShadow={quality !== 'low'}
          />

          <Portal />

          {dimension === "GRID" && <Grid />}
          {dimension === "SPACE" && <AirstripLandscape />}
          
          <Obstacles />
          <GameObstacles />

          {isGameOver ? (
            <Explosion position={[LANE_X_POSITIONS[lane], 0.5, 0]} />
          ) : (
            <>{dimension === "GRID" ? <LightCycle /> : <TronShip />}</>
          )}

          <EffectComposer disableNormalPass multisampling={quality === 'high' ? 8 : 0}>
            <Bloom
              luminanceThreshold={0.2}
              mipmapBlur={quality !== 'low'}
              intensity={settings.bloomIntensity} // Brillo dinámico según calidad
              radius={0.4}
            />
            {quality !== 'low' && (
              <>
                <Scanline opacity={0.05} />
                <Noise opacity={0.02} />
              </>
            )}
          </EffectComposer>

          <Stars
            radius={dimension === "GRID" ? 50 : 100}
            count={quality === 'low' ? 2000 : (dimension === "GRID" ? 5000 : 15000)}
            factor={4}
            fade
            speed={2}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}