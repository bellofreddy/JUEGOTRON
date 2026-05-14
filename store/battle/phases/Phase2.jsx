// Phase2.jsx — v2
// ① Física Unificada  ② Sistema de Obstáculos  ③ Diseño Inmersivo
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useBattleStore } from "../useBattleStore";
import { Input } from "../InputManager";

// ══════════════════════════════════════════════════════════════════
// ① FÍSICA GLOBAL — MISMAS REGLAS PARA TODOS (player = bots)
// ══════════════════════════════════════════════════════════════════
const TUBE_X = [-14, -10, -6, -2, 2, 6, 10, 14];

const PHYSICS = {
  baseSpeed  : 22,
  maxSpeed   : 46,
  minSpeed   : 10,
  accel      : 2.5,
  brakeForce : 30,    // unificado (antes: player=32, bot=28)
  collRadius : 0.95,
  collPush   : 0.18,
  speedLoss  : 0.94,
  lateralSpd : 11,
  roadLimit  : 8.9,
};

const BRAKE_Z = -175;
const CLIFF_Z = -212;
const TUBES_Z = -220;

// ══════════════════════════════════════════════════════════════════
// ② SISTEMA DE OBSTÁCULOS — BARRERAS DE ENERGÍA
//    gapCenter: centro del hueco   gapWidth: ancho del hueco
//    Mismas reglas: si x < gapLeft || x > gapRight → eliminado
// ══════════════════════════════════════════════════════════════════
const OBSTACLES = [
  { z: -48,  gapCenter:  4.5, gapWidth: 5.5, color: [1, 0.15, 0.05] },
  { z: -88,  gapCenter: -4.5, gapWidth: 5.2, color: [0, 0.97, 1   ] },
  { z: -126, gapCenter:  0.5, gapWidth: 4.8, color: [1, 0.15, 0.05] },
  { z: -162, gapCenter: -2.0, gapWidth: 4.5, color: [0, 0.97, 1   ] },
];

/** Devuelve true si (x, z) colisiona con alguna barrera */
function checkObstacleHit(x, z) {
  for (const obs of OBSTACLES) {
    if (Math.abs(z - obs.z) < 2.0) {
      const half = obs.gapWidth / 2;
      if (x < obs.gapCenter - half || x > obs.gapCenter + half) return true;
    }
  }
  return false;
}

/** Devuelve el próximo obstáculo adelante dentro de LOOKAHEAD unidades */
function getNextObstacle(currentZ) {
  const LOOKAHEAD = 60;
  let nearest = null, nearestDist = Infinity;
  for (const obs of OBSTACLES) {
    const dist = currentZ - obs.z;       // positivo = está adelante
    if (dist > 0 && dist < LOOKAHEAD) {
      if (dist < nearestDist) { nearestDist = dist; nearest = obs; }
    }
  }
  return nearest;
}

// ── HELPERS DE TUBOS ───────────────────────────────────────────────
const ID_COLORS = [
  [0, 0.97, 1], [1, 0.4, 0], [0, 0.97, 1], [1, 0.4, 0],
  [0, 0.97, 1], [1, 0.4, 0], [0, 0.97, 1], [1, 0.4, 0],
  [0, 0.97, 1],
];

function findNearestFreeTube(x, tubeClaims) {
  let bestIdx = -1, bestDist = Infinity;
  TUBE_X.forEach((tx, i) => {
    if (tubeClaims[i]) return;
    const d = Math.abs(x - tx);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  });
  return bestIdx;
}

function claimTube(tubeClaims, idx, owner) {
  if (idx < 0 || idx >= tubeClaims.length || tubeClaims[idx]) return false;
  tubeClaims[idx] = owner;
  return true;
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export default function Phase2({ onComplete }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const { bots, eliminate } = useBattleStore();

  const [uiPhase,     setUiPhase]     = useState("WAITING");
  const [tubesTaken,  setTubesTaken]  = useState(0);
  const [playerDone,  setPlayerDone]  = useState(false);
  const [message,     setMessage]     = useState("");
  const [survivors,   setSurvivors]   = useState(9);
  // ③ Estado de UI inmersiva
  const [speedPct,    setSpeedPct]    = useState(0);   // 0-1 para el velocímetro
  const [warnObs,     setWarnObs]     = useState(null); // obstáculo próximo
  const [screenFlash, setScreenFlash] = useState("");   // flash rojo/cyan en impacto

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;
    Input.activate();

    const init = async () => {
      const BABYLON = await import("@babylonjs/core");

      // ── MOTOR ────────────────────────────────────────────────────
      const engine = new BABYLON.Engine(canvasRef.current, true, { adaptToDeviceRatio: true });
      engineRef.current = engine;

      // ── ESCENA ───────────────────────────────────────────────────
      const scene = new BABYLON.Scene(engine);
      scene.clearColor  = new BABYLON.Color4(0, 0, 0, 1);
      scene.ambientColor = new BABYLON.Color3(0, 0, 0);
      scene.fogMode    = BABYLON.Scene.FOGMODE_EXP;
      scene.fogDensity = 0.006;                        // ③ niebla ligeramente más densa
      scene.fogColor   = new BABYLON.Color3(0, 0, 0.02);

      // ── CÁMARA ───────────────────────────────────────────────────
      const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 2.5, 8), scene);
      camera.setTarget(new BABYLON.Vector3(0, 1, -50));
      camera.fov  = 1.1;
      camera.minZ = 0.05;
      camera.maxZ = 300;

      // ── GLOW ③ intensidad ligeramente aumentada ──────────────────
      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = 2.0;

      // ── HELPERS DE MATERIAL ──────────────────────────────────────
      const neon = (name, r, g, b, a = 1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(r, g, b);
        if (a < 1) m.alpha = a;
        return m;
      };
      const black = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.015, 0.015, 0.015);
        m.emissiveColor = new BABYLON.Color3(0, 0, 0);
        m.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
        return m;
      };

      // ── LUCES ────────────────────────────────────────────────────
      const roadL = new BABYLON.PointLight("rl", new BABYLON.Vector3(0, 0.1, -50), scene);
      roadL.intensity = 8; roadL.diffuse = new BABYLON.Color3(0, 0.97, 1); roadL.range = 130;

      const cliffL = new BABYLON.PointLight("cl", new BABYLON.Vector3(0, 3, -200), scene);
      cliffL.intensity = 20; cliffL.diffuse = new BABYLON.Color3(0, 0.97, 1); cliffL.range = 90;

      // ── CARRETERA ─────────────────────────────────────────────────
      const road = BABYLON.MeshBuilder.CreateBox("road", { width: 18, height: 0.1, depth: 230 }, scene);
      road.position = new BABYLON.Vector3(0, -0.05, -107);
      road.material = black("roadM");
      road.checkCollisions = true;

      [-9, 9].forEach((x, i) => {
        const e = BABYLON.MeshBuilder.CreateBox(`re${i}`, { width: 0.07, height: 0.07, depth: 230 }, scene);
        e.position = new BABYLON.Vector3(x, 0.04, -107);
        e.material = neon(`rem${i}`, 0, 0.97, 1);
      });

      for (let i = 0; i < 42; i++) {
        const d = BABYLON.MeshBuilder.CreateBox(`d${i}`, { width: 0.04, height: 0.02, depth: 2.8 }, scene);
        d.position = new BABYLON.Vector3(0, 0.01, -i * 5.2 - 2);
        d.material = neon(`dm${i}`, 0, 0.55, 0.65);
      }
      for (let i = 0; i < 46; i++) {
        const c = BABYLON.MeshBuilder.CreateBox(`c${i}`, { width: 18, height: 0.01, depth: 0.04 }, scene);
        c.position = new BABYLON.Vector3(0, 0.005, -i * 5);
        c.material = neon(`cm${i}`, 0, 0.28, 0.36);
      }

      // ── ABISMO ───────────────────────────────────────────────────
      [-10, 10].forEach((x, si) => {
        for (let j = 0; j < 22; j++) {
          const v = BABYLON.MeshBuilder.CreateBox(`vl${si}_${j}`, { width: 0.035, height: 55, depth: 0.035 }, scene);
          v.position = new BABYLON.Vector3(x + (si === 0 ? -j * 2.2 : j * 2.2), -27.5, -j * 9 - 15);
          const br = 1 - j * 0.042;
          v.material = neon(`vlm${si}_${j}`, 0, 0.97 * br, br);
        }
      });
      const abyss = BABYLON.MeshBuilder.CreateBox("ab", { width: 500, height: 0.1, depth: 500 }, scene);
      abyss.position.y = -58;
      abyss.material = black("abM");

      // ── BORDE DEL PRECIPICIO ──────────────────────────────────────
      const cliffEdge = BABYLON.MeshBuilder.CreateBox("ce", { width: 18, height: 0.4, depth: 0.25 }, scene);
      cliffEdge.position = new BABYLON.Vector3(0, 0.2, -218);
      cliffEdge.material = neon("ceM", 0, 0.97, 1);

      // ══════════════════════════════════════════════════════════════
      // ② OBSTÁCULOS 3D — BARRERAS DE ENERGÍA EN LA CARRETERA
      // ══════════════════════════════════════════════════════════════
      const obsLights = []; // para animar intensidad en el loop

      OBSTACLES.forEach((obs, oi) => {
        const [r, g, b] = obs.color;
        const roadEdgeL = -9, roadEdgeR = 9;
        const gapL = obs.gapCenter - obs.gapWidth / 2;
        const gapR = obs.gapCenter + obs.gapWidth / 2;

        const buildBar = (x1, x2, tag) => {
          const w = x2 - x1;
          if (w < 0.05) return;
          const cx = x1 + w / 2;

          // Barra principal (suelo)
          const bar = BABYLON.MeshBuilder.CreateBox(`obs${oi}${tag}`, {
            width: w, height: 0.1, depth: 0.09,
          }, scene);
          bar.position = new BABYLON.Vector3(cx, 0.1, obs.z);
          bar.material = neon(`obsM${oi}${tag}`, r, g, b);

          // Barra media (más fina, efecto de profundidad)
          const bar2 = BABYLON.MeshBuilder.CreateBox(`obs${oi}${tag}2`, {
            width: w, height: 0.04, depth: 0.04,
          }, scene);
          bar2.position = new BABYLON.Vector3(cx, 0.55, obs.z);
          bar2.material = neon(`obsM2${oi}${tag}`, r * 0.55, g * 0.55, b * 0.55);

          // Luz animada
          const l = new BABYLON.PointLight(`obsL${oi}${tag}`, new BABYLON.Vector3(cx, 0.6, obs.z), scene);
          l.intensity = 5; l.diffuse = new BABYLON.Color3(r, g, b); l.range = 14;
          obsLights.push({ light: l, phase: oi * 0.9 + (tag === "L" ? 0 : 0.45) });
        };

        buildBar(roadEdgeL, gapL, "L");
        buildBar(gapR, roadEdgeR, "R");

        // Postes verticales en los bordes del hueco (guías visuales)
        [gapL - 0.1, gapR + 0.1].forEach((px, pi) => {
          const pole = BABYLON.MeshBuilder.CreateBox(`obs${oi}p${pi}`, {
            width: 0.07, height: 2.4, depth: 0.07,
          }, scene);
          pole.position = new BABYLON.Vector3(px, 1.2, obs.z);
          pole.material = neon(`obsPM${oi}${pi}`, r, g, b);

          // Esfera en lo alto del poste
          const cap = BABYLON.MeshBuilder.CreateSphere(`obs${oi}cap${pi}`, { diameter: 0.14 }, scene);
          cap.position = new BABYLON.Vector3(px, 2.55, obs.z);
          cap.material = neon(`obsCapM${oi}${pi}`, r, g, b);
        });

        // Flechas indicadoras en el piso hacia el hueco
        for (let ai = 0; ai < 5; ai++) {
          const az = BABYLON.MeshBuilder.CreateBox(`obs${oi}az${ai}`, {
            width: 0.55, height: 0.007, depth: 0.2,
          }, scene);
          az.position = new BABYLON.Vector3(obs.gapCenter, 0.005, obs.z + 8 - ai * 1.6);
          az.material = neon(`obsAM${oi}${ai}`, r * 0.4, g * 0.4, b * 0.4);
        }
      });

      // ── TUBOS NEÓN ────────────────────────────────────────────────
      const tubeNodes  = [];
      const tubeLights = [];

      TUBE_X.forEach((x, i) => {
        const [r, g, b] = i % 2 === 0 ? [0, 0.97, 1] : [1, 0.4, 0];
        const node = new BABYLON.TransformNode(`tube${i}`, scene);
        node.position = new BABYLON.Vector3(x, 5, -220);

        const cable = BABYLON.MeshBuilder.CreateBox(`cab${i}`, { width: 0.025, height: 7, depth: 0.025 }, scene);
        cable.parent = node; cable.position.y = 3.5;
        cable.material = neon(`cabM${i}`, r * 0.4, g * 0.4, b * 0.4);

        const body = BABYLON.MeshBuilder.CreateCylinder(`tb${i}`, { height: 3.2, diameter: 0.32, tessellation: 16 }, scene);
        body.parent = node; body.material = black(`tbM${i}`);

        [1.1, 0.2, -0.7, -1.5].forEach((y, ri) => {
          const ring = BABYLON.MeshBuilder.CreateTorus(`tr${i}_${ri}`, { diameter: 0.42, thickness: 0.038, tessellation: 24 }, scene);
          ring.parent = node; ring.position.y = y;
          ring.material = neon(`trM${i}_${ri}`, r, g, b);
        });

        const grip = BABYLON.MeshBuilder.CreateBox(`tg${i}`, { width: 0.48, height: 0.1, depth: 0.48 }, scene);
        grip.parent = node; grip.position.y = -1.7;
        grip.material = neon(`tgM${i}`, r, g * 1.2, b);

        const tl = new BABYLON.PointLight(`tl${i}`, new BABYLON.Vector3(x, 3, -220), scene);
        tl.intensity = 5; tl.diffuse = new BABYLON.Color3(r, g, b); tl.range = 7;

        tubeNodes.push(node);
        tubeLights.push(tl);
      });

      // ── MOTO DEL JUGADOR ──────────────────────────────────────────
      const pMoto = new BABYLON.TransformNode("pMoto", scene);
      pMoto.position = new BABYLON.Vector3(0, 0.5, 5);

      const pmB = BABYLON.MeshBuilder.CreateBox("pmB", { width: 0.5, height: 0.28, depth: 2.2 }, scene);
      pmB.parent = pMoto; pmB.material = black("pmBM");
      const pmS = BABYLON.MeshBuilder.CreateBox("pmS", { width: 0.025, height: 0.025, depth: 2.2 }, scene);
      pmS.parent = pMoto; pmS.position.x = 0.27; pmS.position.y = 0.08;
      pmS.material = neon("pmSM", 0, 0.97, 1);
      [0.85, -0.85].forEach((zo, wi) => {
        const w = BABYLON.MeshBuilder.CreateTorus(`pmW${wi}`, { diameter: 0.55, thickness: 0.055, tessellation: 20 }, scene);
        w.parent = pMoto; w.position = new BABYLON.Vector3(0, -0.12, zo);
        w.rotation.z = Math.PI / 2;
        w.material = neon(`pmWM${wi}`, 0, 0.97, 1);
      });

      // ── MANOS ─────────────────────────────────────────────────────
      const lH = BABYLON.MeshBuilder.CreateBox("lH", { width: 0.08, height: 0.05, depth: 0.22 }, scene);
      lH.material = black("lHM");
      const lC = BABYLON.MeshBuilder.CreateBox("lC", { width: 0.005, height: 0.005, depth: 0.22 }, scene);
      lC.material = neon("lCM", 0, 0.97, 1);
      const rH = BABYLON.MeshBuilder.CreateBox("rH", { width: 0.08, height: 0.05, depth: 0.22 }, scene);
      rH.material = black("rHM");
      const rC = BABYLON.MeshBuilder.CreateBox("rC", { width: 0.005, height: 0.005, depth: 0.22 }, scene);
      rC.material = neon("rCM", 0, 0.97, 1);

      // ── BOTS EN SUS MOTOS ─────────────────────────────────────────
      const botsAlive  = [...bots].filter(b => b.alive).sort((a, b) => b.speed - a.speed);
      const botNodes   = [];
      const botVelZ    = [];
      const botState   = [];
      const botTargetX = []; // ② destino X para sortear obstáculos

      botsAlive.forEach((bot, i) => {
        const [r, g, b_] = ID_COLORS[i % ID_COLORS.length];
        const startX = (i - Math.floor(botsAlive.length / 2)) * 1.9;
        const node = new BABYLON.TransformNode(`bm${i}`, scene);
        node.position = new BABYLON.Vector3(startX, 0.5, 5 + i * 0.4);

        const mb = BABYLON.MeshBuilder.CreateBox(`bmb${i}`, { width: 0.45, height: 0.25, depth: 2.0 }, scene);
        mb.parent = node; mb.material = black(`bmbM${i}`);
        const ms = BABYLON.MeshBuilder.CreateBox(`bms${i}`, { width: 0.022, height: 0.022, depth: 2.0 }, scene);
        ms.parent = node; ms.position.x = 0.24; ms.position.y = 0.07;
        ms.material = neon(`bmsM${i}`, r, g, b_);
        [0.8, -0.8].forEach((zo, wi) => {
          const w = BABYLON.MeshBuilder.CreateTorus(`bmw${i}_${wi}`, { diameter: 0.5, thickness: 0.05, tessellation: 16 }, scene);
          w.parent = node; w.position = new BABYLON.Vector3(0, -0.11, zo);
          w.rotation.z = Math.PI / 2;
          w.material = neon(`bmwM${i}_${wi}`, r, g, b_);
        });

        botNodes.push(node);
        botVelZ.push(bot.speed * 11 + 8);
        botState.push("RIDING");
        botTargetX.push(null);
      });

      // ── ESTADO DEL JUEGO ──────────────────────────────────────────
      let gPhase   = "WAITING";
      let mountT   = 0;
      let rideZ    = 8;
      let rideSpd  = 0;
      let fallVel  = 0;
      let playerY  = 1.1;
      let tubeCount = 0;
      let botTubes  = {};
      const tubeClaims = Array(TUBE_X.length).fill(null);
      let shakeT   = 0;
      let startJumpPos = null;
      let closestIdx   = -1;
      let jumpProgress = 0;
      const JUMP_DURATION = 1.2;

      // ── COLISIONES DE TRÁFICO ─────────────────────────────────────
      const resolveTrafficCollisions = () => {
        if (gPhase !== "RIDING" && gPhase !== "BRAKING") return;
        const participants = [{
          kind: "player", index: -1,
          x: camera.position.x, z: rideZ,
          radius: PHYSICS.collRadius,
        }];
        botNodes.forEach((node, i) => {
          if (!node.isEnabled()) return;
          if (botState[i] !== "RIDING" && botState[i] !== "BRAKING") return;
          participants.push({ kind: "bot", index: i, x: node.position.x, z: node.position.z, radius: PHYSICS.collRadius });
        });
        for (let a = 0; a < participants.length; a++) {
          for (let b = a + 1; b < participants.length; b++) {
            const pa = participants[a], pb = participants[b];
            const dx = pb.x - pa.x, dz = pb.z - pa.z;
            const distSq = dx * dx + dz * dz;
            const minDist = pa.radius + pb.radius;
            if (distSq >= minDist * minDist) continue;
            const dist  = Math.max(Math.sqrt(distSq), 0.001);
            const nx    = dx / dist;
            const push  = (minDist - dist) * PHYSICS.collPush;
            if (pa.kind === "player") camera.position.x -= nx * push;
            else botNodes[pa.index].position.x -= nx * push;
            if (pb.kind === "player") camera.position.x += nx * push;
            else botNodes[pb.index].position.x += nx * push;
            if (pa.kind === "player" || pb.kind === "player")
              rideSpd = Math.max(8, rideSpd * PHYSICS.speedLoss);
            if (pa.kind === "bot") botVelZ[pa.index] = Math.max(0, botVelZ[pa.index] * PHYSICS.speedLoss);
            if (pb.kind === "bot") botVelZ[pb.index] = Math.max(0, botVelZ[pb.index] * PHYSICS.speedLoss);
          }
        }
        pMoto.position.x = camera.position.x;
        pMoto.position.z = rideZ - 1;
      };

      // ── LOOP PRINCIPAL ────────────────────────────────────────────
      scene.registerBeforeRender(() => {
        const dt = engine.getDeltaTime() * 0.001;
        shakeT += dt;
        const tt = shakeT;

        // Animaciones de tubos
        tubeNodes.forEach((n, i) => {
          if (!n.isEnabled()) return;
          n.position.y = 5 + Math.sin(tt * 1.5 + i * 0.7) * 0.1;
          tubeLights[i].position.y = 3 + Math.sin(tt * 1.5 + i * 0.7) * 0.1;
          tubeLights[i].intensity  = 5 + Math.sin(tt * 3 + i) * 1.5;
        });
        cliffL.intensity = 20 + Math.sin(tt * 2.5) * 6;

        // ② Pulso de barreras
        obsLights.forEach(({ light, phase }) => {
          light.intensity = 5 + Math.sin(tt * 5 + phase) * 2.2;
        });

        // ─── WAITING ───────────────────────────────────────────────
        if (gPhase === "WAITING") {
          pMoto.position.z = rideZ - 2.5;
          pMoto.position.y = 0.5 + Math.sin(tt * 2) * 0.05;
          camera.position  = new BABYLON.Vector3(0, 2.2, rideZ);
          camera.setTarget(new BABYLON.Vector3(0, 1.2, rideZ - 8));
          if (Input.wasPressed("KeyE") || Input.wasPressed("Space")) {
            gPhase = "MOUNTING"; mountT = 0; setUiPhase("MOUNTING");
          }
          return;
        }

        // ─── MOUNTING ──────────────────────────────────────────────
        if (gPhase === "MOUNTING") {
          mountT += dt;
          const p = Math.min(mountT / 2.2, 1);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          camera.position.y = 2.2 + (1.1 - 2.2) * e;
          camera.position.z = rideZ;
          pMoto.position.z  = rideZ - 1; pMoto.position.y = 0.5;
          camera.setTarget(new BABYLON.Vector3(0, 0.8, -50));
          if (mountT >= 2.2) { gPhase = "RIDING"; rideSpd = 0; setUiPhase("RIDING"); }
          return;
        }

        // ─── RIDING ────────────────────────────────────────────────
        if (gPhase === "RIDING") {
          // ① Velocidad — mismos límites para todos
          let targetSpeed = PHYSICS.baseSpeed;
          if (Input.isDown("KeyW")) targetSpeed = PHYSICS.maxSpeed;
          if (Input.isDown("KeyS")) targetSpeed = PHYSICS.minSpeed;
          rideSpd = BABYLON.Scalar.Lerp(rideSpd, targetSpeed, dt * PHYSICS.accel);
          rideZ  -= rideSpd * dt;

          // Movimiento lateral
          if (Input.isDown("KeyA")) camera.position.x += PHYSICS.lateralSpd * dt;
          if (Input.isDown("KeyD")) camera.position.x -= PHYSICS.lateralSpd * dt;

          // ① Límite de carretera (igual que bots)
          if (Math.abs(camera.position.x) > PHYSICS.roadLimit) {
            gPhase = "DONE"; setPlayerDone(true);
            setMessage("¡DESREZZADO: IMPACTO CRÍTICO!");
            if (pMoto) pMoto.setEnabled(false);
            camera.fov = 1.5;
            camera.rotation.z = camera.position.x > 0 ? 0.8 : -0.8;
            camera.position.y -= 0.6;
            setTimeout(() => onCompleteRef.current(true), 2000);
            return;
          }

          // ② Colisión con barrera de obstáculo — misma regla que bots
          if (checkObstacleHit(camera.position.x, rideZ)) {
            gPhase = "DONE"; setPlayerDone(true);
            setMessage("¡BARRERA CRÍTICA — DEREZZADO!");
            setScreenFlash("red");
            setTimeout(() => setScreenFlash(""), 700);
            if (pMoto) pMoto.setEnabled(false);
            camera.fov = 1.65; camera.rotation.z = 1.1; camera.position.y -= 0.4;
            setTimeout(() => onCompleteRef.current(true), 1800);
            return;
          }

          // ③ Velocímetro + aviso de obstáculo
          setSpeedPct(rideSpd / PHYSICS.maxSpeed);
          const nextObs = getNextObstacle(rideZ);
          setWarnObs(nextObs
            ? { gapCenter: nextObs.gapCenter, dist: Math.round(rideZ - nextObs.z) }
            : null);

          // Sincronización visual
          pMoto.position.x = camera.position.x;
          pMoto.position.z = rideZ - 1;
          pMoto.position.y = 0.5 + Math.sin(tt * 18) * 0.008;
          camera.position.z = rideZ;
          camera.position.y = 1.1 + Math.sin(tt * 22) * 0.005;

          const targetTilt = (Input.isDown("KeyD") ? -0.15 : 0) + (Input.isDown("KeyA") ? 0.15 : 0);
          camera.rotation.z = BABYLON.Scalar.Lerp(camera.rotation.z, targetTilt, dt * 5);

          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);
          _updateBots(botsAlive, botNodes, botVelZ, botState, botTargetX, dt,
            tubeNodes, tubeLights, tubeClaims, botTubes,
            (count) => { tubeCount = count; setTubesTaken(count); },
            eliminate, setMessage, setSurvivors);
          resolveTrafficCollisions();

          if (rideZ < BRAKE_Z) { gPhase = "BRAKING"; setWarnObs(null); }
          return;
        }

        // ─── BRAKING ───────────────────────────────────────────────
        if (gPhase === "BRAKING") {
          // ① Fuerza de frenado unificada (PHYSICS.brakeForce)
          rideSpd = Math.max(rideSpd - PHYSICS.brakeForce * dt, 0);
          rideZ  -= rideSpd * dt;

          // ③ Velocímetro en frenada
          setSpeedPct(rideSpd / PHYSICS.maxSpeed);

          pMoto.position.x = camera.position.x; pMoto.position.z = rideZ - 1; pMoto.position.y = 0.5;
          camera.position.z = rideZ; camera.position.y = 1.1;

          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);
          _updateBots(botsAlive, botNodes, botVelZ, botState, botTargetX, dt,
            tubeNodes, tubeLights, tubeClaims, botTubes,
            (count) => { tubeCount = count; setTubesTaken(count); },
            eliminate, setMessage, setSurvivors);
          resolveTrafficCollisions();

          if (rideSpd <= 0 || rideZ < CLIFF_Z + 3) {
            gPhase = "CLIFF"; rideSpd = 0;
            setSpeedPct(0);
            if (pMoto) pMoto.setEnabled(false);
            setUiPhase("CLIFF");
            setMessage("¡SALTA! — ESPACIO O E");
          }
          return;
        }

        // ─── CLIFF ─────────────────────────────────────────────────
        if (gPhase === "CLIFF") {
          camera.position = new BABYLON.Vector3(camera.position.x, 1.1, rideZ);
          camera.setTarget(new BABYLON.Vector3(camera.position.x * 0.5, 3.5, -225));
          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);
          _updateBots(botsAlive, botNodes, botVelZ, botState, botTargetX, dt,
            tubeNodes, tubeLights, tubeClaims, botTubes,
            (count) => { tubeCount = count; setTubesTaken(count); },
            eliminate, setMessage, setSurvivors);

          if (Input.wasPressed("Space") || Input.wasPressed("KeyE")) {
            gPhase = "JUMPING"; setMessage("");
          }
          if (tubeCount >= 8) {
            gPhase = "FALLING"; fallVel = 0; playerY = 1.1; setMessage("SIN TUBO...");
          }
          return;
        }

        // ─── JUMPING ───────────────────────────────────────────────
        if (gPhase === "JUMPING") {
          if (!startJumpPos) {
            startJumpPos = camera.position.clone();
            closestIdx = findNearestFreeTube(camera.position.x, tubeClaims);
            if (closestIdx === -1) {
              gPhase = "DONE"; setPlayerDone(true); setMessage("SIN TUBO...");
              setTimeout(() => onCompleteRef.current(true), 500);
              return;
            }
          }

          jumpProgress += dt / JUMP_DURATION;
          const p       = Math.min(jumpProgress, 1);
          const easeOut = 1 - Math.pow(1 - p, 3);

          camera.position.x = BABYLON.Scalar.Lerp(startJumpPos.x, TUBE_X[closestIdx], easeOut);
          camera.position.z = BABYLON.Scalar.Lerp(startJumpPos.z, TUBES_Z, easeOut);

          const jumpHeight = 3.5, parabola = 1 - Math.pow(2 * p - 1, 2);
          camera.position.y = startJumpPos.y + parabola * jumpHeight + p * (5.0 - startJumpPos.y);

          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);

          if (p >= 1.0) {
            const claimed = claimTube(tubeClaims, closestIdx, "player");
            if (!claimed) {
              setPlayerDone(true); gPhase = "DONE"; setUiPhase("DONE");
              setMessage("¡TUBO OCUPADO!");
              setTimeout(() => onCompleteRef.current(true), 500);
              return;
            }
            if (tubeNodes[closestIdx]) {
              tubeNodes[closestIdx].setEnabled(false);
              tubeLights[closestIdx].setEnabled(false);
            }
            useBattleStore.getState().playerTakeTube();
            setTubesTaken(useBattleStore.getState().tubesTaken);
            setPlayerDone(true); gPhase = "DONE"; setUiPhase("DONE");
            setMessage("¡SISTEMA DE VUELO ADQUIRIDO!");
            setTimeout(() => onCompleteRef.current(false), 500);
          }
          return;
        }

        // ─── FALLING ───────────────────────────────────────────────
        if (gPhase === "FALLING") {
          fallVel -= 14 * dt;
          playerY += fallVel * dt;
          camera.position = new BABYLON.Vector3(camera.position.x, playerY, camera.position.z);
          camera.rotation.z += dt * 1.8;
          if (playerY < -28) { gPhase = "DONE"; onCompleteRef.current(true); }
        }
      });

      engine.runRenderLoop(() => { if (!disposed) scene.render(); });
      window.addEventListener("resize", () => engine.resize());
    };

    init().catch(console.error);
    return () => {
      disposed = true;
      Input.deactivate();
      if (engineRef.current) {
        engineRef.current.stopRenderLoop();
        engineRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (tubesTaken >= 8 && !playerDone) setTimeout(() => onComplete(true), 2500);
  }, [tubesTaken, playerDone]);

  // ══════════════════════════════════════════════════════════════════
  // ③ RENDER — UI INMERSIVA
  // ══════════════════════════════════════════════════════════════════
  const isRiding = uiPhase === "RIDING" || uiPhase === "BRAKING";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative" }}>

      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", outline: "none" }}
      />

      {/* ③ Scanlines — overlay sutil de TV de datos */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 4px)",
      }} />

      {/* ③ Viñeta — bordes oscuros para foco central */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11,
        background: "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.72) 100%)",
      }} />

      {/* ③ Borde de pantalla neón — marco inmersivo */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 12,
        boxShadow: "inset 0 0 0 1px rgba(0,247,255,0.07), inset 0 0 80px rgba(0,247,255,0.04)",
      }} />

      {/* ③ Flash de impacto (barrera o borde) */}
      {screenFlash === "red" && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30,
          background: "rgba(255,0,40,0.32)",
          animation: "fadeFlash 0.7s ease-out forwards",
        }} />
      )}

      {/* ③ Líneas de velocidad — activas cuando va rápido */}
      {isRiding && speedPct > 0.72 && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 13,
          opacity: Math.min((speedPct - 0.72) / 0.28, 1) * 0.65,
        }}>
          {[22, 38, 53, 64, 72, 80].map((top, i) => (
            <div key={i} style={{
              position: "absolute",
              top: `${top}%`,
              left: 0, right: 0,
              height: "1px",
              background: `linear-gradient(90deg, transparent 0%, rgba(0,247,255,${0.06 + i * 0.02}) 40%, rgba(0,247,255,${0.14 + i * 0.02}) 55%, transparent 100%)`,
              animation: `speedLine ${0.28 + i * 0.06}s linear infinite`,
              animationDelay: `${i * 0.04}s`,
            }} />
          ))}
        </div>
      )}

      {/* ── HUD principal ────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between",
        padding: "20px 26px", pointerEvents: "none",
        fontFamily: "'Share Tech Mono',monospace", zIndex: 20,
      }}>
        {/* Izquierda: fase + tubos */}
        <div style={{
          fontSize: "0.58rem", color: "rgba(0,247,255,0.65)",
          letterSpacing: "0.2em", lineHeight: 2,
          borderLeft: "2px solid rgba(0,247,255,0.3)", paddingLeft: 12,
        }}>
          FASE 2 — PRECIPICIO
          <br />
          <span style={{ color: "#ff6600" }}>TUBOS: {Math.max(0, 8 - tubesTaken)}/8</span>
        </div>

        {/* Centro: ③ barra de progreso de tubos */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 4, paddingTop: 4,
        }}>
          <div style={{ fontSize: "0.42rem", color: "rgba(0,247,255,0.35)", letterSpacing: "0.4em" }}>
            NAVES DISPONIBLES
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {TUBE_X.map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10,
                background: i < (8 - tubesTaken)
                  ? (i % 2 === 0 ? "rgba(0,247,255,0.8)" : "rgba(255,102,0,0.8)")
                  : "rgba(255,255,255,0.08)",
                boxShadow: i < (8 - tubesTaken)
                  ? `0 0 6px ${i % 2 === 0 ? "#00f7ff" : "#ff6600"}`
                  : "none",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Derecha: programas activos */}
        <div style={{
          fontSize: "0.58rem", textAlign: "right",
          color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em",
          borderRight: "2px solid rgba(0,247,255,0.3)", paddingRight: 12,
        }}>
          PROGRAMAS ACTIVOS
          <br />
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: "1.6rem",
            color: "#00f7ff", textShadow: "0 0 20px #00f7ff",
          }}>
            {survivors}
          </span>
          <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.2)" }}>/9</span>
        </div>
      </div>

      {/* ③ Velocímetro — esquina inferior izquierda */}
      {isRiding && (
        <div style={{
          position: "absolute", bottom: 28, left: 28,
          pointerEvents: "none", zIndex: 20,
        }}>
          <svg width="96" height="60" viewBox="0 0 96 60">
            {/* Arco fondo */}
            <path d="M 8 56 A 40 40 0 0 1 88 56"
              fill="none" stroke="rgba(0,247,255,0.1)" strokeWidth="5" strokeLinecap="round" />
            {/* Arco de velocidad */}
            <path d="M 8 56 A 40 40 0 0 1 88 56"
              fill="none"
              stroke={speedPct > 0.78 ? "#ff6600" : "#00f7ff"}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${speedPct * 125.6} 125.6`}
              style={{ filter: `drop-shadow(0 0 5px ${speedPct > 0.78 ? "#ff6600" : "#00f7ff"})`, transition: "stroke 0.2s" }}
            />
            {/* Valor numérico */}
            <text x="48" y="46" textAnchor="middle"
              fill={speedPct > 0.78 ? "#ff6600" : "#00f7ff"}
              fontSize="13" fontFamily="'Orbitron',sans-serif" fontWeight="900">
              {Math.round(speedPct * 460)}
            </text>
            <text x="48" y="57" textAnchor="middle"
              fill="rgba(0,247,255,0.35)" fontSize="6" fontFamily="'Share Tech Mono',monospace">
              km/h
            </text>
          </svg>
        </div>
      )}

      {/* ③ Aviso de obstáculo próximo */}
      {warnObs && uiPhase === "RIDING" && (
        <div style={{
          position: "absolute", left: "50%", top: "38%",
          transform: "translateX(-50%)",
          pointerEvents: "none", zIndex: 20, textAlign: "center",
        }}>
          <div style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: "0.44rem",
            color: warnObs.dist < 18 ? "#ff6600" : "#ff6600",
            letterSpacing: "0.35em", marginBottom: 6,
            animation: warnObs.dist < 18 ? "blink 0.25s ease infinite" : "none",
          }}>
            ⬛ BARRERA — {warnObs.dist}u ⬛
          </div>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontWeight: 900,
            fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
            color: warnObs.dist < 14 ? "#ff6600" : "#ff6600",
            textShadow: "0 0 18px currentColor",
            letterSpacing: "0.2em",
          }}>
            {warnObs.gapCenter > 3.5
              ? "GIRA → DERECHA"
              : warnObs.gapCenter < -3.5
                ? "GIRA ← IZQUIERDA"
                : "↑ MANTÉN CENTRO"}
          </div>
        </div>
      )}

      {/* ③ Crosshair con datos */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        pointerEvents: "none", zIndex: 20,
      }}>
        <div style={{
          position: "absolute", top: "50%", left: -10, right: -10,
          height: "1px", background: "rgba(0,247,255,0.3)",
          transform: "translateY(-50%)",
        }} />
        <div style={{
          position: "absolute", left: "50%", top: -10, bottom: -10,
          width: "1px", background: "rgba(0,247,255,0.3)",
          transform: "translateX(-50%)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 6, height: 6, borderRadius: "50%",
          background: "rgba(0,247,255,0.5)",
          boxShadow: "0 0 6px #00f7ff",
        }} />
      </div>

      {/* WAITING */}
      {uiPhase === "WAITING" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 25,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <div style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: "0.55rem", color: "rgba(0,247,255,0.4)",
            letterSpacing: "0.45em", marginBottom: 4, pointerEvents: "none",
          }}>
            LIGHT CYCLE LISTO
          </div>
          <button
            onClick={() => Input.simulatePress("KeyE")}
            style={{
              background: "rgba(0,247,255,0.08)",
              border: "2px solid rgba(0,247,255,0.6)",
              color: "#00f7ff", fontFamily: "'Orbitron',sans-serif",
              fontWeight: 900, fontSize: "clamp(1rem,3vw,1.5rem)",
              letterSpacing: "0.25em", padding: "18px 48px",
              cursor: "pointer", textShadow: "0 0 20px #00f7ff",
              boxShadow: "0 0 30px rgba(0,247,255,0.2), inset 0 0 20px rgba(0,247,255,0.05)",
            }}
          >
            ▶ MONTAR
          </button>
          <div style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: "0.5rem", color: "rgba(0,247,255,0.25)",
            letterSpacing: "0.3em", pointerEvents: "none",
          }}>
            ESPACIO · E · CLICK
          </div>
        </div>
      )}

      {/* MOUNTING */}
      {uiPhase === "MOUNTING" && (
        <div style={{
          position: "absolute", bottom: 60, left: "50%",
          transform: "translateX(-50%)", textAlign: "center",
          pointerEvents: "none", zIndex: 20,
        }}>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontWeight: 900,
            fontSize: "clamp(1rem,3vw,1.3rem)",
            color: "#00f7ff", letterSpacing: "0.15em",
            textShadow: "0 0 20px #00f7ff",
          }}>
            MONTANDO LIGHT CYCLE...
          </div>
        </div>
      )}

      {/* CLIFF */}
      {uiPhase === "CLIFF" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 25,
          display: "flex", alignItems: "flex-end",
          justifyContent: "center", paddingBottom: 60,
        }}>
          <button
            onClick={() => Input.simulatePress("Space")}
            style={{
              background: "rgba(255,102,0,0.12)",
              border: "2px solid rgba(255,102,0,0.7)",
              color: "#ff6600", fontFamily: "'Orbitron',sans-serif",
              fontWeight: 900, fontSize: "clamp(1rem,3vw,1.4rem)",
              letterSpacing: "0.2em", padding: "16px 42px",
              cursor: "pointer", textShadow: "0 0 20px #ff6600",
              boxShadow: "0 0 30px rgba(255,102,0,0.2)",
              animation: "pulse 0.8s ease infinite",
            }}
          >
            ⬆ SALTAR AL TUBO
          </button>
        </div>
      )}

      {/* Mensaje de estado */}
      {message && uiPhase !== "CLIFF" && (
        <div style={{
          position: "absolute", bottom: 90, left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Orbitron',sans-serif", fontWeight: 900,
          fontSize: "clamp(0.9rem,2.5vw,1.2rem)", zIndex: 20,
          color: (message.includes("TOMADO") || message.includes("ADQUIRIDO"))
            ? "#00f7ff"
            : (message.includes("SIN") || message.includes("CRÍTICO") || message.includes("BARRERA"))
              ? "#ff0044"
              : "#ff6600",
          textShadow: "0 0 30px currentColor",
          letterSpacing: "0.15em", pointerEvents: "none",
        }}>
          {message}
        </div>
      )}

      <style>{`
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0.3}  }
        @keyframes fadeFlash { 0%{opacity:1}       100%{opacity:0}   }
        @keyframes speedLine {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HELPERS EXTERNOS (no recrear cada frame)
// ══════════════════════════════════════════════════════════════════

function _updateHands(camera, lH, lC, rH, rC, BABYLON, running) {
  const fw = camera.getDirection(BABYLON.Axis.Z);
  const rt = camera.getDirection(BABYLON.Axis.X);
  const up = camera.getDirection(BABYLON.Axis.Y);
  lH.position = camera.position.clone().subtract(rt.scale(0.22)).subtract(up.scale(0.19)).subtract(fw.scale(0.38));
  lH.rotation = camera.rotation.clone();
  lC.position = lH.position.clone().add(up.scale(0.028));
  lC.rotation = lH.rotation.clone();
  rH.position = camera.position.clone().add(rt.scale(0.22)).subtract(up.scale(0.19)).subtract(fw.scale(0.38));
  rH.rotation = camera.rotation.clone();
  rC.position = rH.position.clone().add(up.scale(0.028));
  rC.rotation = rH.rotation.clone();
}

/**
 * ① Física unificada: mismas reglas para todos los bots
 * ② Navegación de obstáculos: los bots ven el hueco y se dirigen a él
 */
function _updateBots(
  bots, nodes, vels, states, targetXArr, dt,
  tubeNodes, tubeLights, tubeClaims, botTubes,
  setCount, eliminate, setMsg, setSurv,
) {
  bots.forEach((bot, i) => {
    if (states[i] === "DONE") return;
    const node = nodes[i];

    // ─── RIDING ───────────────────────────────────────────────────
    if (states[i] === "RIDING") {
      // ② IA de obstáculos: busca el hueco del siguiente obstáculo
      const nextObs = getNextObstacle(node.position.z);
      targetXArr[i] = nextObs ? nextObs.gapCenter : null;

      if (targetXArr[i] !== null) {
        // Dirigirse al centro del hueco con velocidad lateral proporcional
        const diff = targetXArr[i] - node.position.x;
        const steerSpd = Math.min(Math.abs(diff) * 3, PHYSICS.lateralSpd * 0.85);
        node.position.x += Math.sign(diff) * steerSpd * dt;
      }

      node.position.z -= vels[i] * dt;

      // ② Colisión con barrera — misma regla que el jugador
      if (checkObstacleHit(node.position.x, node.position.z)) {
        states[i] = "DONE"; node.setEnabled(false);
        eliminate(bot.id);
        setMsg("UN PROGRAMA HA SIDO DERREZADO — BARRERA");
        setSurv(s => Math.max(0, s - 1));
        return;
      }

      if (node.position.z < BRAKE_Z) states[i] = "BRAKING";
    }

    // ─── BRAKING ─────────────────────────────────────────────────
    if (states[i] === "BRAKING") {
      // ① Fuerza de frenado unificada (igual que el jugador)
      vels[i] = Math.max(vels[i] - PHYSICS.brakeForce * dt, 0);
      node.position.z -= vels[i] * dt;
      if (vels[i] <= 0 || node.position.z < CLIFF_Z + 4) states[i] = "JUMPING";
    }

    // ─── JUMPING ─────────────────────────────────────────────────
    if (states[i] === "JUMPING") {
      if (botTubes[bot.id] == null) {
        const targetIdx = findNearestFreeTube(node.position.x, tubeClaims);
        if (targetIdx === -1) {
          states[i] = "DONE"; node.setEnabled(false);
          eliminate(bot.id);
          setMsg("UN PROGRAMA HA SIDO DERREZADO — SIN NAVE");
          setSurv(s => Math.max(0, s - 1));
          return;
        }
        botTubes[bot.id] = targetIdx;
      }

      const tIdx = botTubes[bot.id];
      const tx   = TUBE_X[tIdx];
      node.position.x += (tx - node.position.x) * dt * 4;
      node.position.z += (TUBES_Z - node.position.z) * dt * 4.5;
      node.position.y += (5 - node.position.y) * dt * 3;

      if (Math.abs(node.position.z - TUBES_Z) < 1.5) {
        states[i] = "DONE"; node.setEnabled(false);

        if (!claimTube(tubeClaims, tIdx, bot.id)) {
          eliminate(bot.id);
          setMsg("UN PROGRAMA HA SIDO DERREZADO — SIN NAVE");
          setSurv(s => Math.max(0, s - 1));
          return;
        }

        if (tubeNodes[tIdx]) tubeNodes[tIdx].setEnabled(false);
        if (tubeLights[tIdx]) tubeLights[tIdx].setEnabled(false);

        useBattleStore.getState().botTakeTube(bot.id);
        setCount(useBattleStore.getState().tubesTaken);
      }
    }
  });
}