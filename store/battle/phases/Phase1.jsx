"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useBattleStore } from "../useBattleStore";

const MOTOR_POSITIONS = [
  [-8, 0, -18], [-4, 0, -20], [0, 0, -22],
  [4, 0, -20],  [8, 0, -18],  [-6, 0, -28],
  [-2, 0, -30], [2, 0, -30],  [6, 0, -28],
];

const IDENTITY_COLORS = [
  [0, 0.97, 1], [1, 0.4, 0], [0, 0.97, 1],
  [1, 0.4, 0],  [0, 0.97, 1],[1, 0.4, 0],
  [0, 0.97, 1], [1, 0.4, 0], [0, 0.97, 1],
];

const TOTAL_MOTORS = MOTOR_POSITIONS.length;

// ── Smooth lerp helper ──────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;

export default function Phase1({ onComplete }) {
  const canvasRef  = useRef(null);
  const engineRef  = useRef(null);
  const { bots, playerTakeMotor } = useBattleStore();

  const [motorsTaken,   setMotorsTaken]  = useState(0);
  const [derezzedCount, setDerezzed]     = useState(0);
  const [playerDone,    setPlayerDone]   = useState(false);
  const [message,       setMessage]      = useState("");
  const [canInteract,   setCanInteract]  = useState(false);
  const [nearMotorId,   setNearMotorId]  = useState(-1);
  const [hudPulse,      setHudPulse]     = useState(false);

  const motorsTakenRef = useRef(0);
  const playerDoneRef  = useRef(false);
  const takenSet       = useRef(new Set());
  const onCompleteRef  = useRef(onComplete);
  const nearMotorRef   = useRef(-1);
  const motorNodesRef  = useRef([]);
  const motorLightsRef = useRef([]);
  const phaseEndedRef  = useRef(false);

  onCompleteRef.current = onComplete;

  const stablePlayerTakeMotor = useCallback(playerTakeMotor, []);

  const triggerPhaseEnd = useCallback((lost) => {
    if (phaseEndedRef.current) return;
    phaseEndedRef.current = true;
    setHudPulse(true);
    setTimeout(() => onCompleteRef.current?.(lost), lost ? 2500 : 1800);
  }, []);

  // ── INPUT ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code !== "KeyE" && e.code !== "KeyF") return;
      if (playerDoneRef.current) return;
      if (nearMotorRef.current === -1) return;
      const i = nearMotorRef.current;
      if (takenSet.current.has(i)) return;
      if (motorsTakenRef.current >= TOTAL_MOTORS) return;

      takenSet.current.add(i);
      playerDoneRef.current = true;
      motorsTakenRef.current += 1;

      motorNodesRef.current[i]?.setEnabled(false);
      motorLightsRef.current[i]?.setEnabled(false);

      stablePlayerTakeMotor();
      setPlayerDone(true);
      setMessage("SISTEMA CONECTADO — PREPARANDO CICLO");
      triggerPhaseEnd(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stablePlayerTakeMotor, triggerPhaseEnd]);

  // ── BABYLON ──────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;
    let resizeHandler = null;

    const init = async () => {
      const BABYLON = await import("@babylonjs/core");

      const engine = new BABYLON.Engine(canvasRef.current, true, {
        preserveDrawingBuffer: true,
        stencil: false,
        adaptToDeviceRatio: true,
      });
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      scene.clearColor       = new BABYLON.Color4(0, 0.005, 0.01, 1);
      scene.ambientColor     = new BABYLON.Color3(0, 0.01, 0.015);
      scene.collisionsEnabled = true;
      scene.gravity          = new BABYLON.Vector3(0, -9.81 * 0.025, 0);
      scene.fogMode          = BABYLON.Scene.FOGMODE_EXP2;
      scene.fogDensity       = 0.006;
      scene.fogColor         = new BABYLON.Color3(0, 0.005, 0.01);

      // ── Cámara FPS ─────────────────────────────────────────
      const camera = new BABYLON.UniversalCamera(
        "cam", new BABYLON.Vector3(0, 1.75, 10), scene,
      );
      camera.setTarget(new BABYLON.Vector3(0, 1.4, -20));
      camera.attachControl(canvasRef.current, true);
      camera.keysUp    = [87, 38];
      camera.keysDown  = [83, 40];
      camera.keysLeft  = [65, 37];
      camera.keysRight = [68, 39];
      camera.speed              = 0.22;
      camera.angularSensibility = 650;
      camera.minZ = 0.05;
      camera.maxZ = 300;
      camera.checkCollisions = true;
      camera.applyGravity    = true;
      camera.ellipsoid = new BABYLON.Vector3(0.4, 0.85, 0.4);
      camera.fov = 1.15;

      canvasRef.current.addEventListener("click", () => {
        canvasRef.current.requestPointerLock();
      });

      // ── Iluminación ambiental mejorada ─────────────────────
      const ambLight = new BABYLON.HemisphericLight(
        "ambL", new BABYLON.Vector3(0, 1, 0), scene,
      );
      ambLight.intensity    = 0.06;
      ambLight.diffuse      = new BABYLON.Color3(0, 0.5, 0.6);
      ambLight.groundColor  = new BABYLON.Color3(0, 0.1, 0.15);

      const gridLight = new BABYLON.PointLight(
        "gridL", new BABYLON.Vector3(0, 2, -22), scene,
      );
      gridLight.intensity = 8;
      gridLight.diffuse   = new BABYLON.Color3(0, 0.97, 1);
      gridLight.range     = 90;

      const gridLight2 = new BABYLON.PointLight(
        "gridL2", new BABYLON.Vector3(0, 2, -50), scene,
      );
      gridLight2.intensity = 5;
      gridLight2.diffuse   = new BABYLON.Color3(0.1, 0.6, 1);
      gridLight2.range     = 70;

      const playerLight = new BABYLON.PointLight(
        "playerL", new BABYLON.Vector3(0, 0, 0), scene,
      );
      playerLight.intensity = 4;
      playerLight.diffuse   = new BABYLON.Color3(0, 0.97, 1);
      playerLight.range     = 5;

      // ── Glow mejorado ──────────────────────────────────────
      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = 2.2;

      // ── Helpers de material ────────────────────────────────
      const makeMat = (name, r, g, b, alpha = 1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(r, g, b);
        m.specularColor = new BABYLON.Color3(r * 0.6, g * 0.6, b * 0.6);
        m.specularPower = 768;
        if (alpha < 1) m.alpha = alpha;
        return m;
      };

      const makeBlackMat = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.03, 0.035, 0.04);
        m.emissiveColor = new BABYLON.Color3(0.005, 0.008, 0.01);
        m.specularColor = new BABYLON.Color3(0.08, 0.1, 0.12);
        m.specularPower = 256;
        return m;
      };

      const makeSemiMat = (name, r, g, b, alpha = 0.55) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(r * 0.25, g * 0.25, b * 0.25);
        m.specularColor = new BABYLON.Color3(r * 0.4, g * 0.4, b * 0.4);
        m.specularPower = 512;
        m.alpha = alpha;
        return m;
      };

      // ── Piso con reflejo sutil ──────────────────────────────
      const floor = BABYLON.MeshBuilder.CreateGround(
        "floor", { width: 400, height: 400, subdivisions: 2 }, scene,
      );
      const floorMat = new BABYLON.StandardMaterial("floorM", scene);
      floorMat.diffuseColor  = new BABYLON.Color3(0.01, 0.015, 0.02);
      floorMat.emissiveColor = new BABYLON.Color3(0, 0.008, 0.01);
      floorMat.specularColor = new BABYLON.Color3(0, 0.3, 0.35);
      floorMat.specularPower = 512;
      floor.material        = floorMat;
      floor.checkCollisions = true;

      // ── Grid mejorado con perspectiva ──────────────────────
      for (let i = -20; i <= 20; i++) {
        const line = BABYLON.MeshBuilder.CreateBox(
          `gl${i}`, { width: 0.035, height: 0.008, depth: 400 }, scene,
        );
        line.position = new BABYLON.Vector3(i * 4, 0.004, 0);
        const lm = new BABYLON.StandardMaterial(`glm${i}`, scene);
        const br = Math.max(0.15, 1 - Math.abs(i) * 0.045);
        lm.emissiveColor = new BABYLON.Color3(0, 0.97 * br, br);
        lm.alpha = br * 0.8;
        line.material = lm;
      }
      for (let i = -40; i <= 40; i++) {
        const line = BABYLON.MeshBuilder.CreateBox(
          `gt${i}`, { width: 400, height: 0.008, depth: 0.035 }, scene,
        );
        line.position = new BABYLON.Vector3(0, 0.004, i * 4);
        const lm = new BABYLON.StandardMaterial(`gtm${i}`, scene);
        const dist = Math.abs(i) / 40;
        lm.emissiveColor = new BABYLON.Color3(0, 0.6 * (1 - dist * 0.5), 0.7 * (1 - dist * 0.5));
        lm.alpha = (1 - dist * 0.6) * 0.6;
        line.material = lm;
      }

      // ── Plataforma de staging ──────────────────────────────
      const stagePlatform = BABYLON.MeshBuilder.CreateBox(
        "stage", { width: 30, height: 0.05, depth: 50 }, scene,
      );
      stagePlatform.position = new BABYLON.Vector3(0, 0.025, -18);
      const stageMat = new BABYLON.StandardMaterial("stageM", scene);
      stageMat.diffuseColor  = new BABYLON.Color3(0.02, 0.025, 0.03);
      stageMat.emissiveColor = new BABYLON.Color3(0, 0.04, 0.05);
      stageMat.specularColor = new BABYLON.Color3(0, 0.4, 0.5);
      stageMat.specularPower = 1024;
      stagePlatform.material = stageMat;
      stagePlatform.checkCollisions = true;

      // Bordes de la plataforma con neon
      [[-15, 0], [15, 0], [0, -25], [0, 25]].forEach(([ox, oz], ei) => {
        const isX = ei < 2;
        const edge = BABYLON.MeshBuilder.CreateBox(`stEdge${ei}`, {
          width: isX ? 0.06 : 30,
          height: 0.06,
          depth: isX ? 50 : 0.06,
        }, scene);
        edge.position = new BABYLON.Vector3(ox, 0.05, oz + (isX ? -18 : -18));
        edge.material = makeMat(`stEdgeM${ei}`, 0, 0.97, 1);
      });

      // ── Torres mejoradas ───────────────────────────────────
      const towerDefs = [
        [-22, -38, 7, 38, 0], [-35, -48, 5, 55, 1], [-16, -55, 8, 28, 0],
        [-45, -40, 4, 48, 0], [-28, -62, 5, 42, 1], [-12, -70, 4, 60, 0],
        [ 22, -38, 7, 38, 0], [ 35, -48, 5, 55, 1], [ 16, -55, 8, 28, 0],
        [ 45, -40, 4, 48, 0], [ 28, -62, 5, 42, 1], [ 12, -70, 4, 60, 0],
      ];

      towerDefs.forEach(([x, z, w, h, ci], idx) => {
        const [r, g, b] = ci === 0 ? [0, 0.97, 1] : [1, 0.4, 0];
        const body = BABYLON.MeshBuilder.CreateBox(
          `tb${idx}`, { width: w, height: h, depth: w }, scene,
        );
        body.position = new BABYLON.Vector3(x, h / 2, z);
        body.material = makeBlackMat(`tbm${idx}`);

        // Panel de ventanas en la torre
        for (let row = 0; row < 4; row++) {
          const win = BABYLON.MeshBuilder.CreateBox(
            `twin${idx}_${row}`, { width: w * 0.5, height: h * 0.04, depth: 0.04 }, scene,
          );
          win.position = new BABYLON.Vector3(x, h * (0.15 + row * 0.22), z + w / 2 + 0.02);
          win.material = makeMat(`twinM${idx}_${row}`, r * 0.4, g * 0.4, b * 0.4);
        }

        [[w/2,w/2],[w/2,-w/2],[-w/2,w/2],[-w/2,-w/2]].forEach(([cx, cz], ei) => {
          const edge = BABYLON.MeshBuilder.CreateBox(
            `te${idx}_${ei}`, { width: 0.08, height: h, depth: 0.08 }, scene,
          );
          edge.position = new BABYLON.Vector3(x + cx, h / 2, z + cz);
          edge.material = makeMat(`tem${idx}_${ei}`, r, g, b);
        });

        const crown = BABYLON.MeshBuilder.CreateBox(
          `tc${idx}`, { width: w + 0.4, height: 0.15, depth: w + 0.4 }, scene,
        );
        crown.position = new BABYLON.Vector3(x, h + 0.08, z);
        crown.material = makeMat(`tcm${idx}`, r, g * 1.3, b);

        const spire = BABYLON.MeshBuilder.CreateBox(
          `tsp${idx}`, { width: 0.08, height: h * 0.08, depth: 0.08 }, scene,
        );
        spire.position = new BABYLON.Vector3(x, h + h * 0.04, z);
        spire.material = makeMat(`tspm${idx}`, r, g, b);

        [h * 0.2, h * 0.45, h * 0.7, h * 0.9].forEach((yOff, li) => {
          const band = BABYLON.MeshBuilder.CreateBox(
            `tband${idx}_${li}`, { width: w + 0.06, height: 0.05, depth: 0.05 }, scene,
          );
          band.position = new BABYLON.Vector3(x, yOff, z + w / 2 + 0.02);
          band.material = makeMat(`tbandM${idx}_${li}`, r, g * 0.65, b * 0.65);
        });

        // Luz de señal en la cima
        const topLight = new BABYLON.PointLight(`tl${idx}`, new BABYLON.Vector3(x, h + 1, z), scene);
        topLight.intensity = 0.8;
        topLight.diffuse   = new BABYLON.Color3(r, g, b);
        topLight.range     = 12;
      });

      // Torre central
      const mainTower = BABYLON.MeshBuilder.CreateBox(
        "mainTower", { width: 10, height: 130, depth: 10 }, scene,
      );
      mainTower.position = new BABYLON.Vector3(0, 65, -130);
      mainTower.material = makeBlackMat("mainTowerM");

      [[5,5],[5,-5],[-5,5],[-5,-5]].forEach(([cx, cz], i) => {
        const e = BABYLON.MeshBuilder.CreateBox(
          `mte${i}`, { width: 0.12, height: 130, depth: 0.12 }, scene,
        );
        e.position = new BABYLON.Vector3(cx, 65, -130 + cz);
        e.material = makeMat(`mtem${i}`, 0, 0.97, 1);
      });

      // ── Motos mejoradas ─────────────────────────────────────
      const motorNodes  = [];
      const motorLights = [];

      MOTOR_POSITIONS.forEach((pos, i) => {
        const [r, g, b] = IDENTITY_COLORS[i];
        const node = new BABYLON.TransformNode(`motor${i}`, scene);
        node.position = new BABYLON.Vector3(pos[0], 0.5, pos[2]);

        // Cuerpo principal con perfil más aerodinámico
        const body = BABYLON.MeshBuilder.CreateBox(
          `mb${i}`, { width: 0.5, height: 0.28, depth: 2.6 }, scene,
        );
        body.parent   = node;
        body.material = makeBlackMat(`mbm${i}`);

        // Carenado delantero
        const frontFairing = BABYLON.MeshBuilder.CreateBox(
          `mff${i}`, { width: 0.42, height: 0.22, depth: 0.6 }, scene,
        );
        frontFairing.parent   = node;
        frontFairing.position = new BABYLON.Vector3(0, 0.06, -1.1);
        frontFairing.material = makeBlackMat(`mffm${i}`);

        // Carenado trasero
        const rearFairing = BABYLON.MeshBuilder.CreateBox(
          `mrf${i}`, { width: 0.36, height: 0.2, depth: 0.5 }, scene,
        );
        rearFairing.parent   = node;
        rearFairing.position = new BABYLON.Vector3(0, 0.05, 1.0);
        rearFairing.material = makeBlackMat(`mrfm${i}`);

        // Líneas de identidad (ambos lados)
        [-0.26, 0.26].forEach((xOff, si) => {
          const stripe = BABYLON.MeshBuilder.CreateBox(
            `ms${i}_${si}`, { width: 0.025, height: 0.025, depth: 2.6 }, scene,
          );
          stripe.parent   = node;
          stripe.position = new BABYLON.Vector3(xOff, 0.16, 0);
          stripe.material = makeMat(`msm${i}_${si}`, r, g, b);

          // Segunda línea inferior
          const stripe2 = BABYLON.MeshBuilder.CreateBox(
            `ms2${i}_${si}`, { width: 0.015, height: 0.015, depth: 2.6 }, scene,
          );
          stripe2.parent   = node;
          stripe2.position = new BABYLON.Vector3(xOff, -0.06, 0);
          stripe2.material = makeMat(`ms2m${i}_${si}`, r, g * 0.6, b * 0.6);
        });

        // Cabina / cockpit
        const cabin = BABYLON.MeshBuilder.CreateBox(
          `mc${i}`, { width: 0.36, height: 0.24, depth: 0.8 }, scene,
        );
        cabin.parent   = node;
        cabin.position = new BABYLON.Vector3(0, 0.3, 0.15);
        cabin.material = makeSemiMat(`cabm${i}`, r, g, b, 0.5);

        // Visor del cockpit
        const visor = BABYLON.MeshBuilder.CreateBox(
          `mvis${i}`, { width: 0.32, height: 0.04, depth: 0.5 }, scene,
        );
        visor.parent   = node;
        visor.position = new BABYLON.Vector3(0, 0.44, -0.15);
        visor.material = makeMat(`mvisM${i}`, r, g, b);

        // Ruedas con más detalle
        [1.0, -1.0].forEach((zo, wi) => {
          const wheel = BABYLON.MeshBuilder.CreateTorus(
            `mw${i}_${wi}`, { diameter: 0.7, thickness: 0.07, tessellation: 36 }, scene,
          );
          wheel.parent   = node;
          wheel.position = new BABYLON.Vector3(0, -0.16, zo);
          wheel.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
          wheel.material = makeMat(`mwm${i}_${wi}`, r, g, b);

          // Hub de la rueda
          const hub = BABYLON.MeshBuilder.CreateCylinder(
            `mhub${i}_${wi}`, { diameter: 0.18, height: 0.08, tessellation: 12 }, scene,
          );
          hub.parent   = node;
          hub.position = new BABYLON.Vector3(0, -0.16, zo);
          hub.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
          hub.material = makeMat(`mhubM${i}_${wi}`, r, g * 0.8, b * 0.8);
        });

        // Disco de freno trasero
        const disc = BABYLON.MeshBuilder.CreateTorus(
          `md${i}`, { diameter: 0.48, thickness: 0.045, tessellation: 36 }, scene,
        );
        disc.parent   = node;
        disc.position = new BABYLON.Vector3(0, 0.12, -1.4);
        disc.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
        disc.material = makeMat(`mdm${i}`, r, g * 1.3, b);

        // Escape / propulsor
        const exhaust = BABYLON.MeshBuilder.CreateCylinder(
          `mexh${i}`, { diameterTop: 0.06, diameterBottom: 0.1, height: 0.3, tessellation: 10 }, scene,
        );
        exhaust.parent   = node;
        exhaust.position = new BABYLON.Vector3(0.18, -0.04, 1.25);
        exhaust.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
        exhaust.material = makeMat(`mexhM${i}`, r, g, b);

        // Plataforma de reposo (base glow bajo la moto)
        const basePad = BABYLON.MeshBuilder.CreateDisc(
          `mpad${i}`, { radius: 1.5, tessellation: 32 }, scene,
        );
        basePad.parent   = node;
        basePad.position = new BABYLON.Vector3(0, -0.49, 0);
        basePad.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
        basePad.material = makeSemiMat(`mpadM${i}`, r, g, b, 0.18);

        const ml = new BABYLON.PointLight(
          `ml${i}`, new BABYLON.Vector3(pos[0], 0.5, pos[2]), scene,
        );
        ml.intensity = 4;
        ml.diffuse   = new BABYLON.Color3(r, g, b);
        ml.range     = 6;

        motorNodes.push(node);
        motorLights.push(ml);
      });

      motorNodesRef.current  = motorNodes;
      motorLightsRef.current = motorLights;

      // ── Animación global de motos ──────────────────────────
      let globalT = 0;
      scene.registerBeforeRender(() => {
        globalT += engine.getDeltaTime() * 0.001;
        motorNodes.forEach((n, i) => {
          if (!n.isEnabled()) return;
          const wave = Math.sin(globalT * 1.6 + i * 0.9) * 0.07;
          const tilt  = Math.sin(globalT * 0.8 + i * 1.2) * 0.025;
          n.position.y  = 0.5 + wave;
          n.rotation.z  = tilt;
          motorLights[i].position.y = 0.5 + wave;
          motorLights[i].intensity  = 3.5 + Math.sin(globalT * 2.5 + i) * 0.5;
        });
      });

      // ── Cuerpo completo Tron ───────────────────────────────
      // Devuelve un objeto con referencias a las partes animables
      const makeTronBody = (node, r, g, b, botIdx) => {
        const uid   = `b${botIdx}`;
        const black = makeBlackMat(`suit_${uid}`);
        const neon  = makeMat(`neon_${uid}`, r, g, b);
        const neonDim = makeMat(`neonD_${uid}`, r * 0.55, g * 0.55, b * 0.55);

        // ── Pie base (para pivot de pasos) ─────────────────
        const rootPivot = new BABYLON.TransformNode(`root_${uid}`, scene);
        rootPivot.parent   = node;
        rootPivot.position = new BABYLON.Vector3(0, 0, 0);

        // ── PELVIS ─────────────────────────────────────────
        const pelvis = BABYLON.MeshBuilder.CreateBox(
          `pelvis_${uid}`, { width: 0.3, height: 0.14, depth: 0.18 }, scene,
        );
        pelvis.parent     = rootPivot;
        pelvis.position.y = 0.6;
        pelvis.material   = black;

        // línea de cinturón
        const belt = BABYLON.MeshBuilder.CreateBox(
          `belt_${uid}`, { width: 0.3, height: 0.025, depth: 0.025 }, scene,
        );
        belt.parent   = rootPivot;
        belt.position = new BABYLON.Vector3(0, 0.65, 0.09);
        belt.material = neonDim;

        // ── TORSO ──────────────────────────────────────────
        const torso = BABYLON.MeshBuilder.CreateBox(
          `torso_${uid}`, { width: 0.34, height: 0.5, depth: 0.2 }, scene,
        );
        torso.parent     = rootPivot;
        torso.position.y = 0.98;
        torso.material   = black;

        // Panel central del pecho (cruz Tron)
        const chestV = BABYLON.MeshBuilder.CreateBox(
          `chestV_${uid}`, { width: 0.03, height: 0.32, depth: 0.025 }, scene,
        );
        chestV.parent   = rootPivot;
        chestV.position = new BABYLON.Vector3(0, 1.0, 0.105);
        chestV.material = neon;

        const chestH = BABYLON.MeshBuilder.CreateBox(
          `chestH_${uid}`, { width: 0.2, height: 0.025, depth: 0.025 }, scene,
        );
        chestH.parent   = rootPivot;
        chestH.position = new BABYLON.Vector3(0, 1.08, 0.105);
        chestH.material = neon;

        // Hombros redondeados (usando esferas achatadas)
        [-0.22, 0.22].forEach((xOff, si) => {
          const shoulder = BABYLON.MeshBuilder.CreateSphere(
            `shd_${uid}_${si}`, { diameterX: 0.16, diameterY: 0.14, diameterZ: 0.14, segments: 8 }, scene,
          );
          shoulder.parent   = rootPivot;
          shoulder.position = new BABYLON.Vector3(xOff, 1.18, 0);
          shoulder.material = black;

          // epaulette Tron
          const epaulette = BABYLON.MeshBuilder.CreateBox(
            `ep_${uid}_${si}`, { width: 0.025, height: 0.025, depth: 0.15 }, scene,
          );
          epaulette.parent   = rootPivot;
          epaulette.position = new BABYLON.Vector3(xOff, 1.18, 0);
          epaulette.material = neon;
        });

        // Líneas de traje en los costados del torso
        [-0.165, 0.165].forEach((xOff, si) => {
          const sideL = BABYLON.MeshBuilder.CreateBox(
            `sideL_${uid}_${si}`, { width: 0.02, height: 0.42, depth: 0.02 }, scene,
          );
          sideL.parent   = rootPivot;
          sideL.position = new BABYLON.Vector3(xOff, 0.97, 0.08);
          sideL.material = neonDim;
        });

        // ── CUELLO ─────────────────────────────────────────
        const neck = BABYLON.MeshBuilder.CreateCylinder(
          `neck_${uid}`, { diameterTop: 0.1, diameterBottom: 0.12, height: 0.1, tessellation: 8 }, scene,
        );
        neck.parent     = rootPivot;
        neck.position.y = 1.28;
        neck.material   = black;

        // ── CABEZA ─────────────────────────────────────────
        const head = BABYLON.MeshBuilder.CreateBox(
          `head_${uid}`, { width: 0.24, height: 0.27, depth: 0.24 }, scene,
        );
        head.parent     = rootPivot;
        head.position.y = 1.51;
        head.material   = black;

        // Casco — placa superior
        const helmetTop = BABYLON.MeshBuilder.CreateBox(
          `helT_${uid}`, { width: 0.26, height: 0.06, depth: 0.26 }, scene,
        );
        helmetTop.parent   = rootPivot;
        helmetTop.position = new BABYLON.Vector3(0, 1.67, 0);
        helmetTop.material = black;

        // Visor principal
        const visor = BABYLON.MeshBuilder.CreateBox(
          `visor_${uid}`, { width: 0.2, height: 0.07, depth: 0.025 }, scene,
        );
        visor.parent   = rootPivot;
        visor.position = new BABYLON.Vector3(0, 1.52, 0.125);
        visor.material = makeMat(`visorM_${uid}`, r, g, b, 0.85);

        // Línea lateral del casco
        [-0.12, 0.12].forEach((xOff, ci) => {
          const helmLine = BABYLON.MeshBuilder.CreateBox(
            `helmLine_${uid}_${ci}`, { width: 0.015, height: 0.22, depth: 0.015 }, scene,
          );
          helmLine.parent   = rootPivot;
          helmLine.position = new BABYLON.Vector3(xOff, 1.51, 0.12);
          helmLine.material = neonDim;
        });

        // ── BRAZOS ─────────────────────────────────────────
        // Nodos pivot para animación de brazo
        const armPivots = [];
        const forearmPivots = [];

        [-0.25, 0.25].forEach((xOff, ai) => {
          const sign = ai === 0 ? -1 : 1;

          // Pivot en hombro
          const armPivot = new BABYLON.TransformNode(`armPivot_${uid}_${ai}`, scene);
          armPivot.parent   = rootPivot;
          armPivot.position = new BABYLON.Vector3(xOff, 1.18, 0);
          armPivots.push(armPivot);

          // Brazo superior
          const upperArm = BABYLON.MeshBuilder.CreateBox(
            `uArm_${uid}_${ai}`, { width: 0.12, height: 0.28, depth: 0.12 }, scene,
          );
          upperArm.parent   = armPivot;
          upperArm.position = new BABYLON.Vector3(0, -0.18, 0);
          upperArm.material = black;

          // Línea del brazo
          const armLine = BABYLON.MeshBuilder.CreateBox(
            `armLine_${uid}_${ai}`, { width: 0.02, height: 0.26, depth: 0.02 }, scene,
          );
          armLine.parent   = armPivot;
          armLine.position = new BABYLON.Vector3(0, -0.18, 0.065);
          armLine.material = neonDim;

          // Codo
          const elbow = BABYLON.MeshBuilder.CreateSphere(
            `elbow_${uid}_${ai}`, { diameter: 0.1, segments: 6 }, scene,
          );
          elbow.parent   = armPivot;
          elbow.position = new BABYLON.Vector3(0, -0.34, 0);
          elbow.material = black;

          // Pivot de antebrazo en codo
          const forearmPivot = new BABYLON.TransformNode(`forearmPivot_${uid}_${ai}`, scene);
          forearmPivot.parent   = armPivot;
          forearmPivot.position = new BABYLON.Vector3(0, -0.34, 0);
          forearmPivots.push(forearmPivot);

          // Antebrazo
          const forearm = BABYLON.MeshBuilder.CreateBox(
            `forearm_${uid}_${ai}`, { width: 0.1, height: 0.26, depth: 0.1 }, scene,
          );
          forearm.parent   = forearmPivot;
          forearm.position = new BABYLON.Vector3(0, -0.15, 0);
          forearm.material = black;

          const forearmLine = BABYLON.MeshBuilder.CreateBox(
            `forearmLine_${uid}_${ai}`, { width: 0.015, height: 0.24, depth: 0.015 }, scene,
          );
          forearmLine.parent   = forearmPivot;
          forearmLine.position = new BABYLON.Vector3(0, -0.15, 0.055);
          forearmLine.material = neon;

          // Muñeca
          const wrist = BABYLON.MeshBuilder.CreateSphere(
            `wrist_${uid}_${ai}`, { diameter: 0.09, segments: 6 }, scene,
          );
          wrist.parent   = forearmPivot;
          wrist.position = new BABYLON.Vector3(0, -0.29, 0);
          wrist.material = black;

          // Mano
          const hand = BABYLON.MeshBuilder.CreateBox(
            `hand_${uid}_${ai}`, { width: 0.1, height: 0.11, depth: 0.065 }, scene,
          );
          hand.parent   = forearmPivot;
          hand.position = new BABYLON.Vector3(0, -0.36, 0);
          hand.material = black;

          // Dedos (3 cajas juntas)
          [-0.03, 0, 0.03].forEach((fx, fi) => {
            const finger = BABYLON.MeshBuilder.CreateBox(
              `finger_${uid}_${ai}_${fi}`, { width: 0.025, height: 0.07, depth: 0.025 }, scene,
            );
            finger.parent   = forearmPivot;
            finger.position = new BABYLON.Vector3(fx, -0.43, 0);
            finger.material = black;
          });
        });

        // ── PIERNAS ─────────────────────────────────────────
        const thighPivots = [];
        const shinPivots  = [];

        [-0.1, 0.1].forEach((xOff, li) => {
          // Pivot en cadera
          const thighPivot = new BABYLON.TransformNode(`thighPivot_${uid}_${li}`, scene);
          thighPivot.parent   = rootPivot;
          thighPivot.position = new BABYLON.Vector3(xOff, 0.6, 0);
          thighPivots.push(thighPivot);

          // Muslo
          const thigh = BABYLON.MeshBuilder.CreateBox(
            `thigh_${uid}_${li}`, { width: 0.15, height: 0.34, depth: 0.15 }, scene,
          );
          thigh.parent   = thighPivot;
          thigh.position = new BABYLON.Vector3(0, -0.2, 0);
          thigh.material = black;

          // Línea de muslo
          const thighLine = BABYLON.MeshBuilder.CreateBox(
            `thighLine_${uid}_${li}`, { width: 0.02, height: 0.3, depth: 0.02 }, scene,
          );
          thighLine.parent   = thighPivot;
          thighLine.position = new BABYLON.Vector3(0, -0.2, 0.08);
          thighLine.material = neonDim;

          // Rodilla
          const knee = BABYLON.MeshBuilder.CreateSphere(
            `knee_${uid}_${li}`, { diameter: 0.11, segments: 6 }, scene,
          );
          knee.parent   = thighPivot;
          knee.position = new BABYLON.Vector3(0, -0.4, 0);
          knee.material = black;

          const kneePad = BABYLON.MeshBuilder.CreateBox(
            `kneePad_${uid}_${li}`, { width: 0.1, height: 0.07, depth: 0.03 }, scene,
          );
          kneePad.parent   = thighPivot;
          kneePad.position = new BABYLON.Vector3(0, -0.38, 0.08);
          kneePad.material = makeMat(`kpM_${uid}_${li}`, r * 0.4, g * 0.4, b * 0.4);

          // Pivot de espinilla en rodilla
          const shinPivot = new BABYLON.TransformNode(`shinPivot_${uid}_${li}`, scene);
          shinPivot.parent   = thighPivot;
          shinPivot.position = new BABYLON.Vector3(0, -0.4, 0);
          shinPivots.push(shinPivot);

          // Espinilla
          const shin = BABYLON.MeshBuilder.CreateBox(
            `shin_${uid}_${li}`, { width: 0.12, height: 0.3, depth: 0.12 }, scene,
          );
          shin.parent   = shinPivot;
          shin.position = new BABYLON.Vector3(0, -0.17, 0);
          shin.material = black;

          const shinLine = BABYLON.MeshBuilder.CreateBox(
            `shinLine_${uid}_${li}`, { width: 0.015, height: 0.26, depth: 0.015 }, scene,
          );
          shinLine.parent   = shinPivot;
          shinLine.position = new BABYLON.Vector3(0, -0.17, 0.07);
          shinLine.material = neon;

          // Tobillo
          const ankle = BABYLON.MeshBuilder.CreateSphere(
            `ankle_${uid}_${li}`, { diameter: 0.09, segments: 6 }, scene,
          );
          ankle.parent   = shinPivot;
          ankle.position = new BABYLON.Vector3(0, -0.34, 0);
          ankle.material = black;

          // Pie
          const foot = BABYLON.MeshBuilder.CreateBox(
            `foot_${uid}_${li}`, { width: 0.11, height: 0.07, depth: 0.2 }, scene,
          );
          foot.parent   = shinPivot;
          foot.position = new BABYLON.Vector3(0, -0.39, 0.06);
          foot.material = black;

          const footLine = BABYLON.MeshBuilder.CreateBox(
            `footLine_${uid}_${li}`, { width: 0.09, height: 0.015, depth: 0.015 }, scene,
          );
          footLine.parent   = shinPivot;
          footLine.position = new BABYLON.Vector3(0, -0.36, 0.16);
          footLine.material = neonDim;
        });

        // ── DISCO DE IDENTIDAD (espalda) ─────────────────────
        const discOuter = BABYLON.MeshBuilder.CreateTorus(
          `discOut_${uid}`, { diameter: 0.32, thickness: 0.03, tessellation: 32 }, scene,
        );
        discOuter.parent   = rootPivot;
        discOuter.position = new BABYLON.Vector3(0, 0.98, -0.12);
        discOuter.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
        discOuter.material = makeMat(`discOutM_${uid}`, r, g * 1.4, b);

        const discInner = BABYLON.MeshBuilder.CreateTorus(
          `discIn_${uid}`, { diameter: 0.2, thickness: 0.02, tessellation: 24 }, scene,
        );
        discInner.parent   = rootPivot;
        discInner.position = new BABYLON.Vector3(0, 0.98, -0.12);
        discInner.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
        discInner.material = makeMat(`discInM_${uid}`, r * 0.6, g * 0.8, b * 0.6);

        return { thighPivots, shinPivots, armPivots, forearmPivots, rootPivot };
      };

      // ── Bots con movimiento mejorado ───────────────────────
      const botsData   = [...bots].sort((a, b) => b.speed - a.speed);
      const botNodes   = [];
      const botTargets = [];
      const botDoneArr = [];
      const botSpeeds  = [];     // velocidad actual interpolada
      const botRotY    = [];     // rotación suavizada
      const botLimbs   = [];     // referencias de animación
      const BOT_ENTRY_DELAY = 0.4; // segundos de stagger entre bots

      const assignBotTargets = () => {
        const assigned = new Set();
        return botsData.map((bot, i) => {
          const botStartX = (i - Math.floor(botsData.length / 2)) * 1.6;
          let bestIdx  = -1;
          let bestDist = Infinity;
          MOTOR_POSITIONS.forEach((mp, mi) => {
            if (assigned.has(mi)) return;
            const dx   = botStartX - mp[0];
            const dz   = 8 - mp[2];
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < bestDist) { bestDist = dist; bestIdx = mi; }
          });
          if (bestIdx !== -1) assigned.add(bestIdx);
          const target = bestIdx !== -1 ? MOTOR_POSITIONS[bestIdx] : [0, 0, -25];
          return { motorIdx: bestIdx, vec: new BABYLON.Vector3(target[0], 0, target[2]) };
        });
      };

      const botAssignments = assignBotTargets();

      botsData.forEach((bot, i) => {
        const [r, g, b] = IDENTITY_COLORS[i % IDENTITY_COLORS.length];
        const node = new BABYLON.TransformNode(`bot${i}`, scene);
        node.position = new BABYLON.Vector3(
          (i - Math.floor(botsData.length / 2)) * 1.6, 0, 8,
        );

        const limbs = makeTronBody(node, r, g, b, i);
        botLimbs.push(limbs);

        const bl = new BABYLON.PointLight(
          `bl${i}`, new BABYLON.Vector3(0, 1.2, 0), scene,
        );
        bl.parent    = node;
        bl.intensity = 2;
        bl.diffuse   = new BABYLON.Color3(r, g, b);
        bl.range     = 3;

        botTargets.push(botAssignments[i].vec);
        botDoneArr.push(false);
        botNodes.push(node);
        botSpeeds.push(0);           // empieza en 0, se acelera
        botRotY.push(node.rotation.y);
      });

      // ── LOOP DE BOTS CON MOVIMIENTO SUAVIZADO ─────────────
      scene.registerBeforeRender(() => {
        const delta = engine.getDeltaTime() * 0.001;
        botsData.forEach((bot, i) => {
          if (botDoneArr[i] || !bot.alive) return;

          // Stagger de entrada: los bots con índice mayor esperan más
          if (globalT < i * BOT_ENTRY_DELAY * 0.5) return;

          const node   = botNodes[i];
          const limbs  = botLimbs[i];
          const dir    = botTargets[i].subtract(node.position);
          dir.y = 0;
          const dist = dir.length();

          if (dist < 0.9) {
            botDoneArr[i] = true;
            botSpeeds[i]  = 0;
            const tmi = botAssignments[i].motorIdx;
            if (tmi !== -1 && !takenSet.current.has(tmi)) {
              if (motorsTakenRef.current < TOTAL_MOTORS) {
                takenSet.current.add(tmi);
                motorsTakenRef.current += 1;
                if (motorNodes[tmi])  motorNodes[tmi].setEnabled(false);
                if (motorLights[tmi]) motorLights[tmi].setEnabled(false);
                setMotorsTaken(motorsTakenRef.current);
              }
            } else {
              node.setEnabled(false);
              setDerezzed((d) => d + 1);
              setMessage("UN PROGRAMA HA SIDO DERREZADO");
            }
            return;
          }

          // Suavizado de velocidad (aceleración y deceleración)
          const targetSpeed = bot.speed * 4.2;
          const slowZone    = 2.5;
          const speedMult   = dist < slowZone ? dist / slowZone : 1.0;
          const desiredSpeed = targetSpeed * speedMult;
          botSpeeds[i] = lerp(botSpeeds[i], desiredSpeed, delta * 6);

          dir.normalize();
          node.position.addInPlace(dir.scale(botSpeeds[i] * delta));

          // Flotación mínima al caminar
          node.position.y = Math.abs(Math.sin(globalT * 9 + i * 0.7)) * 0.04;

          // Rotación suavizada hacia el destino
          const targetRotY = Math.atan2(dir.x, dir.z);
          let diff = targetRotY - botRotY[i];
          // Normalizar a [-PI, PI]
          while (diff >  Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          botRotY[i]      = botRotY[i] + diff * Math.min(1, delta * 10);
          node.rotation.y = botRotY[i];

          // ── Ciclo de caminar animado ──────────────────────
          const walkSpeed  = botSpeeds[i] * 3.5;
          const walkPhase  = globalT * walkSpeed + i * 1.3;
          const walkAmp    = Math.min(0.45, botSpeeds[i] * 0.12);
          const armAmp     = walkAmp * 0.7;

          if (limbs.thighPivots.length === 2) {
            // Pierna derecha e izquierda opuestas
            limbs.thighPivots[0].rotation.x =  Math.sin(walkPhase) * walkAmp;
            limbs.thighPivots[1].rotation.x = -Math.sin(walkPhase) * walkAmp;

            // Espinillas: doblan ligeramente cuando la pierna va atrás
            limbs.shinPivots[0].rotation.x = Math.max(0, -Math.sin(walkPhase) * walkAmp * 0.6);
            limbs.shinPivots[1].rotation.x = Math.max(0,  Math.sin(walkPhase) * walkAmp * 0.6);
          }

          if (limbs.armPivots.length === 2) {
            // Brazos opuestos a las piernas
            limbs.armPivots[0].rotation.x = -Math.sin(walkPhase) * armAmp;
            limbs.armPivots[1].rotation.x =  Math.sin(walkPhase) * armAmp;

            // Codo ligeramente doblado
            limbs.forearmPivots[0].rotation.x = Math.abs(Math.sin(walkPhase)) * armAmp * 0.4 + 0.15;
            limbs.forearmPivots[1].rotation.x = Math.abs(Math.cos(walkPhase)) * armAmp * 0.4 + 0.15;
          }
        });
      });

      // ── Detección de proximidad ────────────────────────────
      scene.registerBeforeRender(() => {
        if (playerDoneRef.current || motorsTakenRef.current >= TOTAL_MOTORS) {
          if (nearMotorRef.current !== -1) {
            nearMotorRef.current = -1;
            setCanInteract(false);
            setNearMotorId(-1);
          }
          return;
        }

        playerLight.position.copyFrom(camera.position);
        playerLight.position.y = 0.5;

        let found   = -1;
        let minDist = Infinity;
        MOTOR_POSITIONS.forEach((mp, i) => {
          if (takenSet.current.has(i)) return;
          const dx   = camera.position.x - mp[0];
          const dz   = camera.position.z - mp[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 2.2 && dist < minDist) { minDist = dist; found = i; }
        });

        if (nearMotorRef.current !== found) {
          nearMotorRef.current = found;
          setCanInteract(found !== -1);
          setNearMotorId(found);
        }
      });

      // ── Manos del jugador (más elaboradas) ─────────────────
      const playerHands = ["l", "r"].map((side, si) => {
        const pivot = new BABYLON.TransformNode(`handPivot_${side}`, scene);

        const forearm = BABYLON.MeshBuilder.CreateBox(
          `playerForearm_${side}`, { width: 0.08, height: 0.07, depth: 0.28 }, scene,
        );
        forearm.parent   = pivot;
        forearm.position = new BABYLON.Vector3(0, 0, 0.08);
        forearm.material = makeBlackMat(`pfarm${side}`);

        const handBox = BABYLON.MeshBuilder.CreateBox(
          `playerHand_${side}`, { width: 0.09, height: 0.055, depth: 0.15 }, scene,
        );
        handBox.parent   = pivot;
        handBox.position = new BABYLON.Vector3(0, 0, -0.08);
        handBox.material = makeBlackMat(`phandm${side}`);

        const circuit = BABYLON.MeshBuilder.CreateBox(
          `phc_${side}`, { width: 0.006, height: 0.006, depth: 0.42 }, scene,
        );
        circuit.parent   = pivot;
        circuit.position = new BABYLON.Vector3(0, 0.035, 0);
        circuit.material = makeMat(`phcm_${side}`, 0, 0.97, 1);

        return pivot;
      });

      let handBob   = 0;
      let handBobV  = 0;
      scene.registerBeforeRender(() => {
        const fw = camera.getDirection(BABYLON.Axis.Z);
        const rt = camera.getDirection(BABYLON.Axis.X);
        const up = camera.getDirection(BABYLON.Axis.Y);
        const bob = Math.sin(globalT * 9.5) * 0.01;
        const sway = Math.cos(globalT * 4.8) * 0.004;

        const setHandPivot = (pivot, side) => {
          const sign = side === 0 ? -1 : 1;
          pivot.position = camera.position.clone()
            .add(rt.scale(sign * 0.22 + sway))
            .subtract(up.scale(0.18 + bob * sign))
            .subtract(fw.scale(0.38));

          // Heredar rotación de la cámara
          pivot.rotationQuaternion = null;
          pivot.rotation = camera.rotation.clone();
        };

        setHandPivot(playerHands[0], 0);
        setHandPivot(playerHands[1], 1);
      });

      // ── Partículas de datos ─────────────────────────────────
      const ps = new BABYLON.ParticleSystem("data", 500, scene);
      ps.emitter    = new BABYLON.Vector3(0, 12, -28);
      ps.minEmitBox = new BABYLON.Vector3(-50, -8, -40);
      ps.maxEmitBox = new BABYLON.Vector3( 50,  6,  15);
      ps.color1     = new BABYLON.Color4(0, 0.97, 1, 0.45);
      ps.color2     = new BABYLON.Color4(0, 0.45, 0.6, 0.2);
      ps.colorDead  = new BABYLON.Color4(0, 0, 0, 0);
      ps.minSize    = 0.008;
      ps.maxSize    = 0.05;
      ps.minLifeTime = 5;
      ps.maxLifeTime = 10;
      ps.emitRate   = 65;
      ps.blendMode  = BABYLON.ParticleSystem.BLENDMODE_ADD;
      ps.gravity    = new BABYLON.Vector3(0, -0.18, 0);
      ps.direction1 = new BABYLON.Vector3(-0.25, -1, -0.25);
      ps.direction2 = new BABYLON.Vector3( 0.25, -0.25, 0.25);
      ps.minEmitPower = 0.08;
      ps.maxEmitPower = 0.55;
      ps.updateSpeed  = 0.006;
      ps.start();

      // Segundo sistema de chispas cerca de los motores
      const sparks = new BABYLON.ParticleSystem("sparks", 150, scene);
      sparks.emitter    = new BABYLON.Vector3(0, 0.1, -24);
      sparks.minEmitBox = new BABYLON.Vector3(-10, 0, -12);
      sparks.maxEmitBox = new BABYLON.Vector3( 10, 0,   4);
      sparks.color1     = new BABYLON.Color4(0, 1, 1, 0.8);
      sparks.color2     = new BABYLON.Color4(1, 0.4, 0, 0.6);
      sparks.colorDead  = new BABYLON.Color4(0, 0, 0, 0);
      sparks.minSize    = 0.015;
      sparks.maxSize    = 0.03;
      sparks.minLifeTime = 0.4;
      sparks.maxLifeTime = 1.2;
      sparks.emitRate   = 35;
      sparks.blendMode  = BABYLON.ParticleSystem.BLENDMODE_ADD;
      sparks.gravity    = new BABYLON.Vector3(0, -0.8, 0);
      sparks.direction1 = new BABYLON.Vector3(-1, 2, -1);
      sparks.direction2 = new BABYLON.Vector3( 1, 4,  1);
      sparks.minEmitPower = 0.5;
      sparks.maxEmitPower = 1.5;
      sparks.updateSpeed  = 0.012;
      sparks.start();

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
      }
    };
  }, []);

  useEffect(() => {
    if (motorsTaken >= TOTAL_MOTORS && !playerDone) {
      setMessage("SIN MOTO — FIN DEL PROGRAMA");
      triggerPhaseEnd(true);
    }
  }, [motorsTaken, playerDone, triggerPhaseEnd]);

  const motorsLeft  = Math.max(0, TOTAL_MOTORS - motorsTaken);
  const motorsRatio = motorsTaken / TOTAL_MOTORS;
  const isLost      = message.includes("SIN MOTO");
  const isWon       = message.includes("CONECTADO");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes flickerIn {
          0%,20%,22%,80%,82%,100% { opacity: 1; }
          21%,81% { opacity: 0.4; }
        }
        @keyframes hudPulse {
          0%,100% { box-shadow: 0 0 8px rgba(0,247,255,0.3); }
          50% { box-shadow: 0 0 28px rgba(0,247,255,0.9); }
        }
        @keyframes crosshairRotate {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes msgGlow {
          0%,100% { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
          50% { text-shadow: 0 0 40px currentColor, 0 0 80px currentColor, 0 0 120px currentColor; }
        }
        @keyframes barFill {
          from { width: 0%; }
        }
        @keyframes cornerPulse {
          0%,100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes interactPop {
          0% { transform: translateX(-50%) scale(0.85); opacity: 0; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes dataStream {
          0% { background-position: 0 0; }
          100% { background-position: 0 200px; }
        }
      `}</style>

      <div style={{
        width: "100vw", height: "100vh",
        background: "#000008", position: "relative",
        overflow: "hidden",
        fontFamily: "'Share Tech Mono', monospace",
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", outline: "none" }}
        />

        {/* ── Vignette ── */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,12,0.85) 100%)",
        }} />

        {/* ── Scanline ── */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", opacity: 0.04,
        }}>
          <div style={{
            position: "absolute", width: "100%", height: "3px",
            background: "rgba(0,247,255,0.8)",
            animation: "scanline 4s linear infinite",
          }} />
        </div>

        {/* ── Grid overlay noise ── */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,247,255,0.012) 3px, rgba(0,247,255,0.012) 4px)",
          backgroundSize: "100% 4px",
        }} />

        {/* ── HUD: Top Left ── */}
        <div style={{
          position: "absolute", top: 18, left: 20, pointerEvents: "none",
          animation: hudPulse ? "hudPulse 0.5s ease 3" : "none",
        }}>
          {/* Corner brackets */}
          <div style={{ position: "absolute", top: -6, left: -6, width: 14, height: 14,
            borderTop: "2px solid rgba(0,247,255,0.8)", borderLeft: "2px solid rgba(0,247,255,0.8)" }} />
          <div style={{ position: "absolute", bottom: -6, left: -6, width: 14, height: 14,
            borderBottom: "2px solid rgba(0,247,255,0.8)", borderLeft: "2px solid rgba(0,247,255,0.8)" }} />

          <div style={{
            padding: "12px 18px 14px 14px",
            background: "rgba(0,8,15,0.75)",
            border: "1px solid rgba(0,247,255,0.18)",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              fontSize: "0.52rem", color: "rgba(0,247,255,0.5)",
              letterSpacing: "0.28em", marginBottom: 6,
            }}>
              GRID // FASE-01 // STAGING PIT
            </div>
            <div style={{
              fontSize: "0.7rem", color: "rgba(0,247,255,0.9)",
              letterSpacing: "0.15em", marginBottom: 10,
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
            }}>
              CICLOS DISPONIBLES
            </div>

            {/* Barra de progreso de motos */}
            <div style={{
              width: 180, height: 4,
              background: "rgba(0,247,255,0.12)",
              border: "1px solid rgba(0,247,255,0.2)", marginBottom: 6,
            }}>
              <div style={{
                width: `${(motorsLeft / TOTAL_MOTORS) * 100}%`,
                height: "100%",
                background: motorsLeft < 3
                  ? "linear-gradient(90deg, #ff0055, #ff6600)"
                  : "linear-gradient(90deg, #00f7ff, #00c8ff)",
                boxShadow: motorsLeft < 3
                  ? "0 0 8px #ff0055"
                  : "0 0 8px #00f7ff",
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "1.8rem", fontWeight: 900,
                color: motorsLeft < 3 ? "#ff3300" : "#00f7ff",
                textShadow: `0 0 20px ${motorsLeft < 3 ? "#ff3300" : "#00f7ff"}`,
                lineHeight: 1,
              }}>
                {String(motorsLeft).padStart(2, "0")}
              </span>
              <span style={{
                fontSize: "0.5rem", color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.1em",
              }}>
                / {TOTAL_MOTORS} TOTAL
              </span>
            </div>
          </div>
        </div>

        {/* ── HUD: Top Right ── */}
        <div style={{
          position: "absolute", top: 18, right: 20, pointerEvents: "none", textAlign: "right",
        }}>
          <div style={{ position: "absolute", top: -6, right: -6, width: 14, height: 14,
            borderTop: "2px solid rgba(0,247,255,0.8)", borderRight: "2px solid rgba(0,247,255,0.8)" }} />
          <div style={{ position: "absolute", bottom: -6, right: -6, width: 14, height: 14,
            borderBottom: "2px solid rgba(0,247,255,0.8)", borderRight: "2px solid rgba(0,247,255,0.8)" }} />

          <div style={{
            padding: "12px 14px 14px 18px",
            background: "rgba(0,8,15,0.75)",
            border: "1px solid rgba(0,247,255,0.18)",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              fontSize: "0.52rem", color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.22em", marginBottom: 6,
            }}>
              PROGRAMAS // EN LINEA
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "2rem", fontWeight: 900,
                color: "#00f7ff",
                textShadow: "0 0 25px #00f7ff, 0 0 50px rgba(0,247,255,0.3)",
                lineHeight: 1,
              }}>
                {String(Math.max(0, (bots?.length ?? 10) - derezzedCount)).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                / {bots?.length ?? 10}
              </span>
            </div>
            {derezzedCount > 0 && (
              <div style={{
                marginTop: 6, fontSize: "0.48rem", color: "#ff0055",
                letterSpacing: "0.18em",
                textShadow: "0 0 6px #ff0055",
              }}>
                {String(derezzedCount).padStart(2, "0")} DERREZADOS
              </div>
            )}
          </div>
        </div>

        {/* ── Crosshair mejorado ── */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          pointerEvents: "none", width: 32, height: 32,
        }}>
          {/* Cruz principal */}
          <div style={{
            position: "absolute", top: "50%", left: -14, right: -14, height: "1px",
            background: "rgba(0,247,255,0.5)", transform: "translateY(-50%)",
          }} />
          <div style={{
            position: "absolute", left: "50%", top: -14, bottom: -14, width: "1px",
            background: "rgba(0,247,255,0.5)", transform: "translateX(-50%)",
          }} />
          {/* Punto central */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 4, height: 4, borderRadius: "50%",
            background: canInteract ? "#00f7ff" : "rgba(0,247,255,0.6)",
            boxShadow: canInteract ? "0 0 12px #00f7ff, 0 0 24px #00f7ff" : "none",
            transition: "all 0.2s ease",
          }} />
          {/* Anillo exterior cuando hay interacción */}
          {canInteract && (
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: 22, height: 22, borderRadius: "50%",
              border: "1px solid rgba(0,247,255,0.6)",
              boxShadow: "0 0 8px rgba(0,247,255,0.4)",
              animation: "crosshairRotate 3s linear infinite",
            }} />
          )}
        </div>

        {/* ── Prompt de interacción ── */}
        {canInteract && !playerDone && (
          <div style={{
            position: "absolute", top: "62%", left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "'Share Tech Mono', monospace",
            pointerEvents: "none", zIndex: 10,
            animation: "interactPop 0.2s ease",
          }}>
            <div style={{
              padding: "10px 24px",
              background: "rgba(0,4,8,0.88)",
              border: "1px solid rgba(0,247,255,0.6)",
              boxShadow: "0 0 20px rgba(0,247,255,0.25), inset 0 0 20px rgba(0,247,255,0.05)",
              backdropFilter: "blur(6px)",
              textAlign: "center",
            }}>
              <div style={{
                fontSize: "0.65rem", color: "rgba(0,247,255,0.5)",
                letterSpacing: "0.25em", marginBottom: 4,
              }}>
                CICLO #{nearMotorId + 1} DETECTADO
              </div>
              <div style={{
                fontSize: "0.95rem", color: "#00f7ff",
                textShadow: "0 0 12px #00f7ff",
                letterSpacing: "0.2em", fontWeight: 700,
              }}>
                [E] ABORDAR CICLO
              </div>
            </div>
          </div>
        )}

        {/* ── Instrucciones ── */}
        {!message && !playerDone && (
          <div style={{
            position: "absolute", bottom: 36, left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            display: "flex", gap: 0,
            border: "1px solid rgba(0,247,255,0.15)",
            background: "rgba(0,4,8,0.7)",
            backdropFilter: "blur(4px)",
            overflow: "hidden",
          }}>
            {[
              ["CLICK", "ACTIVAR CONTROL"],
              ["WASD", "DESPLAZARSE"],
              ["RATON", "APUNTAR"],
              ["E", "ABORDAR"],
            ].map(([key, label], ki) => (
              <div key={ki} style={{
                padding: "8px 16px",
                borderRight: ki < 3 ? "1px solid rgba(0,247,255,0.1)" : "none",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: "0.65rem", color: "#00f7ff",
                  letterSpacing: "0.15em", fontWeight: 700,
                  textShadow: "0 0 8px rgba(0,247,255,0.6)",
                }}>
                  {key}
                </div>
                <div style={{
                  fontSize: "0.42rem", color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.12em", marginTop: 2,
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Mensaje de estado ── */}
        {message && (
          <div style={{
            position: "absolute", bottom: "18%", left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
            fontSize: "clamp(0.8rem, 2.5vw, 1.3rem)",
            color: isLost ? "#ff0055" : "#00f7ff",
            letterSpacing: "0.2em",
            animation: "msgGlow 1.5s ease-in-out infinite, flickerIn 0.5s ease",
            textAlign: "center",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            {message}
          </div>
        )}

        {/* ── Indicador de identidad del jugador ── */}
        <div style={{
          position: "absolute", bottom: 36, right: 20,
          pointerEvents: "none",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#00f7ff", boxShadow: "0 0 10px #00f7ff",
            animation: "cornerPulse 2s ease infinite",
          }} />
          <span style={{
            fontSize: "0.48rem", color: "rgba(0,247,255,0.55)",
            letterSpacing: "0.22em",
          }}>
            IDENTIDAD: USUARIO
          </span>
        </div>
      </div>
    </>
  );
}