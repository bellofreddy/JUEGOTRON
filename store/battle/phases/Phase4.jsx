"use client";
import React, { useEffect, useRef, useState } from "react";
import { useBattleStore } from "../useBattleStore";

// ── Configuracion ─────────────────────────────────────────────
const ARENA_SIZE = 120;
const CYCLE_SPEED = 22;
const TRAIL_SEG = 0.4;
const TRAIL_HEIGHT = 1.4;
const BOT_THINK = 0.55;
const TRAIL_MAX_AGE = 8.0;
const FP_CAM_Y = 0.62;
const FP_CAM_Z_FRONT = -0.25;
const FP_CAM_Z_BACK = 0.28;
const FP_LOOK_Z_FRONT = 22;
const FP_LOOK_Z_BACK = -22;
const FP_LERP = 14;
const TP_POS_LERP = 8;
const TP_ROT_LERP = 6;
// Cuantos segmentos propios ignorar en colision (cabeza de serpiente)
const OWN_TRAIL_GRACE = 4;
// Umbral de distancia de colision de estela propia (mas generoso)
const OWN_TRAIL_DIST = 0.38;
const OTHER_TRAIL_DIST = 0.52;
const SCENE_CLEAR_R = 0;
const SCENE_CLEAR_G = 0;
const SCENE_CLEAR_B = 0;
const GLOW_INTENSITY = 0.6;
const GLOW_BLUR_KERNEL = 6;
const SCANLINES_ALPHA = 0.05;
const VIGNETTE_ALPHA = 0.14;

const DIR = {
  N: { x: 0, z: -1 },
  S: { x: 0, z: 1 },
  E: { x: 1, z: 0 },
  W: { x: -1, z: 0 },
};
const OPPOSITE = { N: "S", S: "N", E: "W", W: "E" };
const TURN_LEFT = { N: "W", W: "S", S: "E", E: "N" };
const TURN_RIGHT = { N: "E", E: "S", S: "W", W: "N" };

const SLOT_COLORS = [
  [0, 0.97, 1],
  [1, 0.4, 0],
  [0.6, 0, 1],
  [1, 0.9, 0],
  [0, 1, 0.4],
  [1, 0, 0.5],
  [0.4, 0.8, 1],
  [1, 0.6, 0],
];

export default function Phase4({ onComplete }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const { bots } = useBattleStore();

  const [survivors, setSurvivors] = useState(0);
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [speedPct, setSpeedPct] = useState(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const pendingTurn = useRef(null);
  const lookingBack = useRef(false);
  const [lookBack, setLookBack] = useState(false);
  const [isFirstPerson, setIsFirstPerson] = useState(true);

  // ── Input ──────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      // FIX: controles correctos desde perspectiva 1a persona
      // A / flecha izq => girar a la IZQUIERDA visual => TURN_LEFT
      if (e.code === "KeyA" || e.code === "ArrowLeft")
        pendingTurn.current = "L";
      // D / flecha der => girar a la DERECHA visual => TURN_RIGHT
      if (e.code === "KeyD" || e.code === "ArrowRight")
        pendingTurn.current = "R";
      if (e.code === "KeyS" || e.code === "ArrowDown") {
        lookingBack.current = true;
        setLookBack(true);
      }
      if (e.code === "KeyV") setIsFirstPerson((v) => !v);
    };
    const up = (e) => {
      if (e.code === "KeyS" || e.code === "ArrowDown") {
        lookingBack.current = false;
        setLookBack(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const isFirstPersonRef = useRef(true);
  useEffect(() => {
    isFirstPersonRef.current = isFirstPerson;
  }, [isFirstPerson]);

  // ── Babylon ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let resizeHandler = null;

    const init = async () => {
      const BABYLON = await import("@babylonjs/core");

      if (disposed || !canvas.isConnected) return;

      const engine = new BABYLON.Engine(canvas, true, {
        adaptToDeviceRatio: true,
        antialias: true,
      })
      if (disposed) { engine.dispose(); return; }
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(SCENE_CLEAR_R, SCENE_CLEAR_G, SCENE_CLEAR_B, 1);
      scene.ambientColor = new BABYLON.Color3(0, 0, 0);
      scene.fogMode = BABYLON.Scene.FOGMODE_NONE;

      // ── Glow ──────────────────────────────────────────────
      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = GLOW_INTENSITY;
      glow.blurKernelSize = GLOW_BLUR_KERNEL;

      // ── Materiales ────────────────────────────────────────
      const neon = (name, r, g, b, a = 1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(r, g, b);
        if (a < 1) { m.alpha = a; }
        // Las estelas no deben proyectar ni recibir sombras
        m.disableLighting = true;
        return m;
      };
      const blackMat = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.03);
        m.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.015);
        return m;
      };

      // ── Iluminacion ambiental ─────────────────────────────
      const gridLight = new BABYLON.PointLight(
        "gl", new BABYLON.Vector3(0, 5, 0), scene
      );
      gridLight.intensity = 3.5;
      gridLight.diffuse = new BABYLON.Color3(0, 0.97, 1);
      gridLight.range = 280;

      const ambLight = new BABYLON.HemisphericLight(
        "amb", new BABYLON.Vector3(0, 1, 0), scene
      );
      ambLight.intensity = 0.08;
      ambLight.diffuse = new BABYLON.Color3(0, 0.3, 0.5);

      // ── Suelo con textura grid ────────────────────────────
      const floor = BABYLON.MeshBuilder.CreateGround(
        "floor",
        { width: ARENA_SIZE * 2 + 20, height: ARENA_SIZE * 2 + 20, subdivisions: 2 },
        scene
      );
      const floorMat = new BABYLON.StandardMaterial("floorM", scene);
      floorMat.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.04);
      floorMat.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.02);
      floorMat.specularColor = new BABYLON.Color3(0, 0.4, 0.6);
      floorMat.specularPower = 80;
      floor.material = floorMat;
      floor.receiveShadows = true;

      // ── Grid de lineas ─────────────────────────────────────
      const S = ARENA_SIZE;
      for (let i = -S; i <= S; i += 8) {
        const br = 0.18 - Math.abs(i / S) * 0.1;
        const h = BABYLON.MeshBuilder.CreateBox(
          `gh${i}`, { width: S * 2, height: 0.015, depth: 0.04 }, scene
        );
        h.position = new BABYLON.Vector3(0, 0.008, i);
        h.material = neon(`ghm${i}`, 0, br * 0.97, br);
        h.isPickable = false;

        const v = BABYLON.MeshBuilder.CreateBox(
          `gv${i}`, { width: 0.04, height: 0.015, depth: S * 2 }, scene
        );
        v.position = new BABYLON.Vector3(i, 0.008, 0);
        v.material = neon(`gvm${i}`, 0, br * 0.97, br);
        v.isPickable = false;
      }

      // ── Paredes ────────────────────────────────────────────
      const wallDefs = [
        [0, S, S * 2 + 1, 0.25, 0.35],
        [0, -S, S * 2 + 1, 0.25, 0.35],
        [S, 0, 0.35, 0.25, S * 2 + 1],
        [-S, 0, 0.35, 0.25, S * 2 + 1],
      ];
      wallDefs.forEach(([x, z, w, h, d], i) => {
        const wall = BABYLON.MeshBuilder.CreateBox(
          `wall${i}`, { width: w, height: h, depth: d }, scene
        );
        wall.position = new BABYLON.Vector3(x, 0.12, z);
        wall.material = neon(`wallM${i}`, 0, 0.97, 1);
        wall.isPickable = false;
      });

      [[S, S], [S, -S], [-S, S], [-S, -S]].forEach(([x, z], i) => {
        const c = BABYLON.MeshBuilder.CreateBox(
          `cor${i}`, { width: 0.6, height: 3.5, depth: 0.6 }, scene
        );
        c.position = new BABYLON.Vector3(x, 1.75, z);
        c.material = neon(`corM${i}`, 0, 0.97, 1);
        c.isPickable = false;
      });

      // ── Riders ────────────────────────────────────────────
      const aliveBots = bots.filter((b) => b.alive && b.hasTube);
      const totalRiders = 1 + aliveBots.length;
      const startPositions = [];
      for (let i = 0; i < totalRiders; i++) {
        const angle = (i / totalRiders) * Math.PI * 2;
        startPositions.push({ x: Math.cos(angle) * 18, z: Math.sin(angle) * 18 });
      }

      const riders = [];

      const makeCycle = (slotIdx, isPlayer, sx, sz, startDir) => {
        const [r, g, b] = SLOT_COLORS[slotIdx % SLOT_COLORS.length];

        // Nodo de fisica: solo posicion y yaw, NUNCA rota en Z
        const node = new BABYLON.TransformNode(`cycle_phys${slotIdx}`, scene);
        node.position = new BABYLON.Vector3(sx, 0.5, sz);

        // Nodo visual hijo: recibe el banking (roll)
        const visualNode = new BABYLON.TransformNode(`cycle_vis${slotIdx}`, scene);
        visualNode.parent = node;

        const body = BABYLON.MeshBuilder.CreateBox(
          `cb${slotIdx}`, { width: 0.55, height: 0.3, depth: 2.2 }, scene
        );
        body.parent = visualNode;
        body.material = blackMat(`cbM${slotIdx}`);

        // Linea lateral superior
        const stripe = BABYLON.MeshBuilder.CreateBox(
          `cs${slotIdx}`, { width: 0.05, height: 0.04, depth: 2.2 }, scene
        );
        stripe.parent = visualNode;
        stripe.position.y = 0.17;
        stripe.material = neon(`csM${slotIdx}`, r, g, b);

        // Cabina del piloto
        const cockpit = BABYLON.MeshBuilder.CreateBox(
          `cock${slotIdx}`, { width: 0.42, height: 0.22, depth: 0.55 }, scene
        );
        cockpit.parent = visualNode;
        cockpit.position = new BABYLON.Vector3(0, 0.24, -0.2);
        cockpit.material = neon(`cockM${slotIdx}`, r * 0.4, g * 0.4, b * 0.4, 0.7);

        // Alerón trasero
        const spoiler = BABYLON.MeshBuilder.CreateBox(
          `sp${slotIdx}`, { width: 0.7, height: 0.08, depth: 0.08 }, scene
        );
        spoiler.parent = visualNode;
        spoiler.position = new BABYLON.Vector3(0, 0.28, 0.9);
        spoiler.material = neon(`spM${slotIdx}`, r, g, b);

        // Ruedas
        [0.85, -0.85].forEach((zo, wi) => {
          const w = BABYLON.MeshBuilder.CreateTorus(
            `cw${slotIdx}_${wi}`,
            { diameter: 0.56, thickness: 0.06, tessellation: 20 },
            scene
          );
          w.parent = visualNode;
          w.position = new BABYLON.Vector3(0, -0.1, zo);
          w.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
          w.material = neon(`cwM${slotIdx}_${wi}`, r, g, b);
        });

        // Luz del ciclo
        const cl = new BABYLON.PointLight(`cl${slotIdx}`, BABYLON.Vector3.Zero(), scene);
        cl.parent = node;
        cl.intensity = 5;
        cl.diffuse = new BABYLON.Color3(r, g, b);
        cl.range = 12;

        // Particulas de chispa al girar
        const sparks = new BABYLON.ParticleSystem(`sparks${slotIdx}`, 40, scene);
        sparks.emitter = node;
        sparks.minEmitBox = new BABYLON.Vector3(-0.1, 0, 0.8);
        sparks.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 1.0);
        sparks.color1 = new BABYLON.Color4(r, g, b, 1);
        sparks.color2 = new BABYLON.Color4(r * 0.5, g * 0.5, b * 0.5, 0.5);
        sparks.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        sparks.minSize = 0.04;
        sparks.maxSize = 0.12;
        sparks.minLifeTime = 0.08;
        sparks.maxLifeTime = 0.22;
        sparks.emitRate = 0;
        sparks.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        sparks.gravity = new BABYLON.Vector3(0, -4, 0);
        sparks.direction1 = new BABYLON.Vector3(-3, 1, -3);
        sparks.direction2 = new BABYLON.Vector3(3, 2, -6);
        sparks.minEmitPower = 3;
        sparks.maxEmitPower = 7;
        sparks.start();

        return {
          x: sx, z: sz, dir: startDir,
          visualRotation: Math.atan2(DIR[startDir].x, DIR[startDir].z),
          alive: true, isPlayer, r, g, b,
          node, visualNode, sparks,
          trailSegs: [],
          lastSegPos: { x: sx, z: sz },
          botTimer: Math.random() * BOT_THINK,
          turning: false,
          turnTimer: 0,
          speed: CYCLE_SPEED,
        };
      };

      const startDirs = ["N", "S", "E", "W", "N", "S", "E", "W"];
      riders.push(makeCycle(0, true, startPositions[0].x, startPositions[0].z, startDirs[0]));
      aliveBots.forEach((bot, i) => {
        riders.push(makeCycle(
          i + 1, false,
          startPositions[i + 1].x, startPositions[i + 1].z,
          startDirs[(i + 1) % startDirs.length]
        ));
      });

      setSurvivors(riders.length);

      // ── Camaras ───────────────────────────────────────────
      const playerNode = riders[0].node;

      // 1a persona: CAMARA HIJA del nodo visual para heredar banking
      const camera = new BABYLON.UniversalCamera(
        "camFP", new BABYLON.Vector3(0, FP_CAM_Y, FP_CAM_Z_FRONT), scene
      );
      // Se adjunta al nodo FISICO (sin banking), miramos en espacio local
      camera.parent = playerNode;
      camera.setTarget(new BABYLON.Vector3(0, 0.25, FP_LOOK_Z_FRONT));
      camera.fov = 1.22;
      // Reducir clipping cercano sin volver a meter el cuerpo dentro del encuadre
      camera.minZ = 0.2;
      camera.maxZ = 600;

      // Pivot de 3a persona
      const camPivot = new BABYLON.TransformNode("camPivot", scene);
      camPivot.position.copyFrom(playerNode.position);
      camPivot.rotation.y = riders[0].visualRotation;

      const camTP = new BABYLON.UniversalCamera(
        "camTP", new BABYLON.Vector3(0, 5, -12), scene
      );
      camTP.parent = camPivot;
      camTP.setTarget(new BABYLON.Vector3(0, 0.5, 38));
      camTP.fov = 1.12;
      camTP.minZ = 0.2;
      camTP.maxZ = 600;

      scene.activeCamera = camera;

      // ── Motion blur (si disponible) ───────────────────────


      // ── Agregar segmento de estela ─────────────────────────
      const addTrailSeg = (rider, x1, z1, x2, z2) => {
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.05) return;

        const cx = (x1 + x2) / 2;
        const cz = (z1 + z2) / 2;
        const angle = Math.atan2(dx, dz);
        const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const seg = BABYLON.MeshBuilder.CreateBox(
          `tr_${uid}`,
          { width: 0.16, height: TRAIL_HEIGHT, depth: len + 0.05 },
          scene
        );
        // Posicion: base exactamente en Y=0, altura hacia arriba
        seg.position = new BABYLON.Vector3(cx, TRAIL_HEIGHT / 2, cz);
        seg.rotation.y = angle;

        // FIX SOMBRA: desactivar shadow casting/receiving en estelas
        seg.receiveShadows = false;
        seg.isPickable = false;

        const mat = neon(`trM_${uid}`, rider.r, rider.g, rider.b, 0.9);
        seg.material = mat;

        rider.trailSegs.push({ mesh: seg, mat, x1, z1, x2, z2, born: performance.now() / 1000 });
      };

      // ── Colision ───────────────────────────────────────────
      const checkCollision = (rider, nx, nz) => {
        if (Math.abs(nx) >= ARENA_SIZE || Math.abs(nz) >= ARENA_SIZE) return true;
        const now = performance.now() / 1000;
        const isOwn = (r2) => r2 === rider;

        for (const r2 of riders) {
          if (!r2.alive) continue;
          for (let si = 0; si < r2.trailSegs.length; si++) {
            // Grace: ignorar ultimos segmentos propios
            if (isOwn(r2) && si >= r2.trailSegs.length - OWN_TRAIL_GRACE) continue;
            const seg = r2.trailSegs[si];
            if (now - seg.born > TRAIL_MAX_AGE) continue;
            const threshold = isOwn(r2) ? OWN_TRAIL_DIST : OTHER_TRAIL_DIST;
            const dist = pointToSegDist(nx, nz, seg.x1, seg.z1, seg.x2, seg.z2);
            if (dist < threshold) return true;
          }
        }
        return false;
      };

      // ── IA bots ────────────────────────────────────────────
      const botDecide = (rider) => {
        const d = DIR[rider.dir];
        const spd = CYCLE_SPEED * 0.55;
        const nx = rider.x + d.x * spd;
        const nz = rider.z + d.z * spd;
        if (!checkCollision(rider, nx, nz)) return;

        const opts = [TURN_LEFT[rider.dir], TURN_RIGHT[rider.dir]];
        if (Math.random() > 0.5) opts.reverse();
        for (const newDir of opts) {
          const nd = DIR[newDir];
          if (!checkCollision(rider, rider.x + nd.x * spd, rider.z + nd.z * spd)) {
            rider.dir = newDir;
            return;
          }
        }
        rider.dir = opts[0];
      };

      // ── Camara shake state ────────────────────────────────
      let camShake = 0;

      // ── Countdown ────────────────────────────────────────
      let gameStarted = false;
      let cdVal = 3;
      const cdInterval = setInterval(() => {
        cdVal--;
        setCountdown(cdVal);
        if (cdVal <= 0) {
          clearInterval(cdInterval);
          gameStarted = true;
          setCountdown(-1);
          setMessage("");
        }
      }, 1000);

      // ── Render loop ───────────────────────────────────────
      let gameDone = false;
      let totalTime = 0;
      let prevDir = riders[0].dir;

      scene.registerBeforeRender(() => {
        if (disposed || gameDone || !gameStarted) return;
        const dt = Math.min(engine.getDeltaTime() * 0.001, 0.05);
        const now = performance.now() / 1000;
        totalTime += dt;

        // ── Input jugador ─────────────────────────────────
        const player = riders[0];
        const wasTurning = player.dir !== prevDir;

        if (player.alive && pendingTurn.current) {
          const turn = pendingTurn.current;
          pendingTurn.current = null;
          // FIX CONTROLES: A/izq = TURN_LEFT, D/der = TURN_RIGHT
          const newDir = turn === "L" ? TURN_LEFT[player.dir] : TURN_RIGHT[player.dir];
          if (newDir !== OPPOSITE[player.dir]) {
            player.dir = newDir;
            player.turning = true;
            player.turnTimer = 0.18; // duracion de chispas
          }
        }
        prevDir = player.dir;

        // ── Mover cada rider ───────────────────────────────
        riders.forEach((rider) => {
          if (!rider.alive) return;

          const d = DIR[rider.dir];
          const targetAngle = Math.atan2(d.x, d.z);

          // Yaw suave en nodo fisico
          rider.visualRotation = lerpAngle(rider.visualRotation, targetAngle, dt * 11);
          rider.node.rotation.y = rider.visualRotation;

          // Banking en nodo VISUAL (hijo) — NUNCA en node raiz
          const angleDiff = shortAngleDist(rider.visualRotation, targetAngle);
          const targetBank = angleDiff * 0.55;
          rider.visualNode.rotation.z = BABYLON.Scalar.Lerp(
            rider.visualNode.rotation.z, targetBank, dt * 6
          );

          // Chispas al girar
          if (rider.turnTimer > 0) {
            rider.turnTimer -= dt;
            rider.sparks.emitRate = 180;
          } else {
            rider.sparks.emitRate = 0;
          }

          // Fade y limpieza de estelas
          for (let i = rider.trailSegs.length - 1; i >= 0; i--) {
            const seg = rider.trailSegs[i];
            const age = now - seg.born;
            if (age >= TRAIL_MAX_AGE) {
              seg.mesh.dispose();
              rider.trailSegs.splice(i, 1);
            } else if (age > TRAIL_MAX_AGE * 0.55) {
              const fade = 1 - (age - TRAIL_MAX_AGE * 0.55) / (TRAIL_MAX_AGE * 0.45);
              seg.mat.alpha = Math.max(0, fade * 0.9);
            }
          }

          // Bot AI
          if (!rider.isPlayer) {
            rider.botTimer -= dt;
            if (rider.botTimer <= 0) {
              rider.botTimer = BOT_THINK * (0.6 + Math.random() * 0.8);
              const oldDir = rider.dir;
              botDecide(rider);
              if (rider.dir !== oldDir) rider.turnTimer = 0.15;
            }
          }

          // Movimiento
          const nx = rider.x + d.x * CYCLE_SPEED * dt;
          const nz = rider.z + d.z * CYCLE_SPEED * dt;

          if (checkCollision(rider, nx, nz)) {
            rider.alive = false;
            rider.node.setEnabled(false);
            rider.sparks.stop();
            rider.trailSegs.forEach((s) => { s.mesh.dispose(); });
            rider.trailSegs = [];

            const alive = riders.filter((r) => r.alive);
            setSurvivors(alive.length);

            if (rider.isPlayer) {
              gameDone = true;
              camShake = 0.6; // vibrar camara al morir
              setMessage("PROGRAMA DEREZZED");
              setTimeout(() => onCompleteRef.current?.(false), 2600);
            } else if (alive.length <= 1) {
              gameDone = true;
              const winner = alive[0];
              if (winner?.isPlayer) {
                setMessage("ULTIMO PROGRAMA EN PIE");
                setTimeout(() => onCompleteRef.current?.(true), 2600);
              } else {
                setMessage("PROGRAMA DEREZZED");
                setTimeout(() => onCompleteRef.current?.(false), 2600);
              }
            }
            return;
          }

          rider.x = nx;
          rider.z = nz;
          rider.node.position.x = nx;
          rider.node.position.z = nz;
          // Mantener Y fija: el nodo fisico nunca baja del suelo
          rider.node.position.y = 0.5;

          // Bounce sutil de ruedas
          rider.visualNode.position.y =
            Math.sin(totalTime * 18) * 0.012 * Math.abs(rider.visualNode.rotation.z + 0.3);

          // Estela
          const ddx = nx - rider.lastSegPos.x;
          const ddz = nz - rider.lastSegPos.z;
          if (Math.sqrt(ddx * ddx + ddz * ddz) >= TRAIL_SEG) {
            addTrailSeg(rider, rider.lastSegPos.x, rider.lastSegPos.z, nx, nz);
            rider.lastSegPos = { x: nx, z: nz };
          }
        });

        // ── Camara ──────────────────────────────────────────
        if (player.alive || camShake > 0) {
          const fp = isFirstPersonRef.current;

          if (fp) {
            if (scene.activeCamera !== camera) scene.activeCamera = camera;

            const targetCamZ = lookingBack.current ? FP_CAM_Z_BACK : FP_CAM_Z_FRONT;
            const targetLookZ = lookingBack.current ? FP_LOOK_Z_BACK : FP_LOOK_Z_FRONT;
            // FOV dinamico segun si esta girando
            const isTurning = player.turnTimer > 0;
            const targetFov = lookingBack.current ? 1.05 : (isTurning ? 1.35 : 1.22);

            camera.position.y = BABYLON.Scalar.Lerp(camera.position.y, FP_CAM_Y, dt * FP_LERP);
            camera.position.z = BABYLON.Scalar.Lerp(camera.position.z, targetCamZ, dt * FP_LERP);
            camera.fov = BABYLON.Scalar.Lerp(camera.fov, targetFov, dt * 9);

            // FIX SOMBRA: la camara no rota con el banking del visualNode
            // El target se calcula en espacio local del nodo fisico
            const lookY = lookingBack.current ? 0.18 : 0.25;
            const lookZVal = BABYLON.Scalar.Lerp(
              camera.target?.z ?? targetLookZ, targetLookZ, dt * FP_LERP
            );
            camera.setTarget(new BABYLON.Vector3(0, lookY, targetLookZ));

            // Shake de camara al morir
            if (camShake > 0) {
              camShake -= dt * 2.5;
              const s = camShake * 0.08;
              camera.position.x = (Math.random() - 0.5) * s;
              camera.position.y = FP_CAM_Y + (Math.random() - 0.5) * s;
            } else {
              camera.position.x = BABYLON.Scalar.Lerp(camera.position.x, 0, dt * 10);
            }

          } else {
            if (scene.activeCamera !== camTP) {
              camPivot.position.x = player.x;
              camPivot.position.z = player.z;
              camPivot.rotation.y = player.visualRotation;
              scene.activeCamera = camTP;
            }

            camPivot.position.x = BABYLON.Scalar.Lerp(camPivot.position.x, player.x, dt * TP_POS_LERP);
            camPivot.position.z = BABYLON.Scalar.Lerp(camPivot.position.z, player.z, dt * TP_POS_LERP);
            camPivot.rotation.y = lerpAngle(camPivot.rotation.y, player.visualRotation, dt * TP_ROT_LERP);

            const bank = player.visualNode.rotation.z;
            camTP.position.x = BABYLON.Scalar.Lerp(camTP.position.x, -bank * 2.2, dt * 7);
            camTP.position.y = BABYLON.Scalar.Lerp(camTP.position.y, 5 + Math.abs(bank) * 1.2, dt * 5);
            camTP.position.z = BABYLON.Scalar.Lerp(camTP.position.z, -12, dt * 5);

            if (camShake > 0) {
              camShake -= dt * 2.5;
              const s = camShake * 0.3;
              camTP.position.x += (Math.random() - 0.5) * s;
              camTP.position.y += (Math.random() - 0.5) * s;
            }
          }
        }

        // Luz de grid sigue al jugador
        gridLight.position.x = player.x;
        gridLight.position.z = player.z;

        // Actualizar HUD de velocidad
        const spd = Math.min(1, CYCLE_SPEED / 30);
        setSpeedPct(Math.round(spd * 100));
      });

      engine.runRenderLoop(() => { if (!disposed) scene.render(); });
      resizeHandler = () => engine.resize();
      window.addEventListener("resize", resizeHandler);
    };

    init().catch(console.error);
    return () => {
      disposed = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (engineRef.current) {
        engineRef.current.stopRenderLoop();
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  // ── HUD ───────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", outline: "none" }} />

      {/* Scanlines overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${SCANLINES_ALPHA}) 2px, rgba(0,0,0,${SCANLINES_ALPHA}) 4px)`,
        zIndex: 2,
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: `radial-gradient(ellipse at center, transparent 58%, rgba(0,0,20,${VIGNETTE_ALPHA}) 100%)`,
      }} />

      {/* HUD superior */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", justifyContent: "space-between",
        padding: "18px 24px", pointerEvents: "none",
        fontFamily: "'Share Tech Mono', monospace",
      }}>
        <div style={{
          fontSize: "0.55rem", color: "rgba(0,247,255,0.7)",
          letterSpacing: "0.2em", lineHeight: 2.1,
          borderLeft: "2px solid rgba(0,247,255,0.35)", paddingLeft: 12,
        }}>
          FASE 4 - LIGHT CYCLES<br />
          <span style={{ color: "#ff6600" }}>EN PISTA: {survivors}</span>
        </div>

        {/* Velocimetro central */}
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.48rem", color: "rgba(0,247,255,0.5)",
            letterSpacing: "0.25em",
          }}>
            {isFirstPerson ? "VISION 1P" : "VISION 3P"}
          </div>
          {/* Barra de velocidad */}
          <div style={{
            width: 90, height: 3, background: "rgba(0,247,255,0.12)",
            border: "1px solid rgba(0,247,255,0.25)", position: "relative",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%",
              width: `${speedPct}%`,
              background: "linear-gradient(90deg, #00f7ff, #ff6600)",
              boxShadow: "0 0 8px #00f7ff",
              transition: "width 0.1s",
            }} />
          </div>
        </div>

        <div style={{
          fontSize: "0.55rem", textAlign: "right",
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.15em", lineHeight: 2.1,
          borderRight: "2px solid rgba(0,247,255,0.3)", paddingRight: 12,
        }}>
          PROGRAMAS ACTIVOS<br />
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "1.5rem", color: "#00f7ff",
            textShadow: "0 0 20px #00f7ff",
          }}>{survivors}</span>
        </div>
      </div>

      {/* Countdown */}
      {countdown > 0 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
            fontSize: "clamp(5rem,18vw,10rem)",
            color: "#00f7ff",
            textShadow: "0 0 60px #00f7ff, 0 0 120px rgba(0,247,255,0.3)",
            letterSpacing: "0.1em",
            animation: "pulse 0.9s ease infinite",
          }}>{countdown}</div>
        </div>
      )}

      {/* Mensaje de resultado */}
      {message && (
        <div style={{
          position: "absolute", top: "42%", left: "50%",
          transform: "translateX(-50%)", zIndex: 20,
          fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
          fontSize: "clamp(1rem,3vw,1.4rem)",
          color: message.includes("ULTIMO") ? "#00f7ff" : "#ff0055",
          textShadow: "0 0 30px currentColor, 0 0 60px currentColor",
          letterSpacing: "0.15em", pointerEvents: "none",
          whiteSpace: "nowrap", animation: "flicker 0.15s infinite",
        }}>{message}</div>
      )}

      {/* Retrovisor */}
      {lookBack && (
        <>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 6, zIndex: 15,
            background: "linear-gradient(90deg, transparent, rgba(255,102,0,0.6), transparent)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            zIndex: 15, fontFamily: "'Orbitron', sans-serif",
            fontSize: "0.52rem", color: "#ff6600",
            letterSpacing: "0.3em", textShadow: "0 0 12px #ff6600",
            pointerEvents: "none",
          }}>RETROVISOR</div>
        </>
      )}

      {/* Controles */}
      {countdown < 0 && !message && (
        <div style={{
          position: "absolute", bottom: 18, left: "50%",
          transform: "translateX(-50%)", zIndex: 10,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.48rem", color: "rgba(0,247,255,0.28)",
          letterSpacing: "0.18em", pointerEvents: "none",
          textAlign: "center", lineHeight: 2.2,
        }}>
          A / LEFT GIRAR IZQ &nbsp;·&nbsp; D / RIGHT GIRAR DER<br />
          S / DOWN RETROVISOR &nbsp;·&nbsp; V CAMARA
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap');
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1) }
          50% { opacity:0.65; transform:scale(0.9) }
        }
        @keyframes flicker {
          0%,100% { opacity:1 }
          92% { opacity:1 }
          93% { opacity:0.4 }
          94% { opacity:1 }
          97% { opacity:0.6 }
          98% { opacity:1 }
        }
      `}</style>
    </div>
  );
}

// ── Utilidades ────────────────────────────────────────────────
function pointToSegDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (pz - (az + t * dz)) ** 2);
}

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function shortAngleDist(a, b) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
