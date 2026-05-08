"use client";
import React, { useEffect, useRef, useState } from "react";
import { useBattleStore } from "../useBattleStore";

const MOTOR_POSITIONS = [
  [-8, 0, -18],
  [-4, 0, -20],
  [0, 0, -22],
  [4, 0, -20],
  [8, 0, -18],
  [-6, 0, -28],
  [-2, 0, -30],
  [2, 0, -30],
  [6, 0, -28],
];

const IDENTITY_COLORS = [
  [0, 0.97, 1],
  [1, 0.4, 0],
  [0, 0.97, 1],
  [1, 0.4, 0],
  [0, 0.97, 1],
  [1, 0.4, 0],
  [0, 0.97, 1],
  [1, 0.4, 0],
  [0, 0.97, 1],
];

export default function Phase1({ onComplete }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const { bots, playerTakeMotor } = useBattleStore();

  const [motorsTaken, setMotorsTaken] = useState(0);
  const [derezzedCount, setDerezzed] = useState(0);
  const [playerDone, setPlayerDone] = useState(false);
  const [message, setMessage] = useState("");
  const [canInteract, setCanInteract] = useState(false);

  const motorsTakenRef  = useRef(0);
  const playerDoneRef   = useRef(false);
  const takenSet        = useRef(new Set());
  const botMotorMap     = useRef({});
  const onCompleteRef   = useRef(onComplete);
  const nearMotorRef    = useRef(-1);
  const motorNodesRef   = useRef([]);
  const motorLightsRef  = useRef([]);

  onCompleteRef.current = onComplete;

// ── INPUT NATIVO — Con transición a Fase 2 ──────────────────
 useEffect(() => {
  const handleKey = (e) => {
    if (e.code !== "KeyE" && e.code !== "KeyF") return;
    if (playerDoneRef.current || nearMotorRef.current === -1) return;

    const i = nearMotorRef.current;
    takenSet.current.add(i);
    playerDoneRef.current = true;

    // Desactivar la moto del suelo
    motorNodesRef.current[i]?.setEnabled(false);
    motorLightsRef.current[i]?.setEnabled(false);

    playerTakeMotor(); // Actualiza el estado global a "hasMotor: true"
    setPlayerDone(true);
    setMessage("¡SISTEMA CONECTADO! PREPARANDO CICLO...");

    // TRANSICIÓN MANUAL: Pasamos a la Phase2 donde tú conduces
    setTimeout(() => {
      if (onComplete) onComplete(false); 
    }, 1500);
  };

  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [onComplete, playerTakeMotor]);

  // ── BABYLON ────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;

    const init = async () => {
      const BABYLON = await import("@babylonjs/core");

      const engine = new BABYLON.Engine(canvasRef.current, true, {
        preserveDrawingBuffer: true,
        stencil: false,
        adaptToDeviceRatio: true,
      });
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      scene.clearColor   = new BABYLON.Color4(0, 0, 0, 1);
      scene.ambientColor = new BABYLON.Color3(0, 0, 0);
      scene.collisionsEnabled = true;
      scene.gravity = new BABYLON.Vector3(0, -9.81 * 0.025, 0);
      scene.fogMode    = BABYLON.Scene.FOGMODE_EXP;
      scene.fogDensity = 0.005;
      scene.fogColor   = new BABYLON.Color3(0, 0, 0);

      // ── Cámara FPS ────────────────────────────────────────
      const camera = new BABYLON.UniversalCamera(
        "cam",
        new BABYLON.Vector3(0, 1.8, 8),
        scene,
      );
      camera.setTarget(new BABYLON.Vector3(0, 1.4, -20));
      camera.attachControl(canvasRef.current, true);
      camera.keysUp    = [87, 38];
      camera.keysDown  = [83, 40];
      camera.keysLeft  = [65, 37];
      camera.keysRight = [68, 39];
      camera.speed             = 0.28;
      camera.angularSensibility = 700;
      camera.minZ = 0.05;
      camera.maxZ = 250;
      camera.checkCollisions = true;
      camera.applyGravity    = true;
      camera.ellipsoid = new BABYLON.Vector3(0.4, 0.9, 0.4);
      camera.fov = 1.1;

      canvasRef.current.addEventListener("click", () => {
        canvasRef.current.requestPointerLock();
      });

      // ── Iluminación ───────────────────────────────────────
      const gridLight = new BABYLON.PointLight(
        "gridL",
        new BABYLON.Vector3(0, 0.1, -20),
        scene,
      );
      gridLight.intensity = 6;
      gridLight.diffuse   = new BABYLON.Color3(0, 0.97, 1);
      gridLight.range     = 80;

      const playerLight = new BABYLON.PointLight(
        "playerL",
        new BABYLON.Vector3(0, 0, 0),
        scene,
      );
      playerLight.intensity = 3;
      playerLight.diffuse   = new BABYLON.Color3(0, 0.97, 1);
      playerLight.range     = 4;

      // ── Glow ──────────────────────────────────────────────
      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = 1.8;

      // ── Helpers de material ───────────────────────────────
      const makeMat = (name, r, g, b, alpha = 1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(r, g, b);
        m.specularColor = new BABYLON.Color3(r * 0.5, g * 0.5, b * 0.5);
        m.specularPower = 512;
        if (alpha < 1) m.alpha = alpha;
        return m;
      };

      const makeBlackMat = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.02, 0.02, 0.02);
        m.emissiveColor = new BABYLON.Color3(0, 0, 0);
        m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        m.specularPower = 128;
        return m;
      };

      // ── Piso + Grid ───────────────────────────────────────
      const floor = BABYLON.MeshBuilder.CreateGround(
        "floor",
        { width: 300, height: 300, subdivisions: 1 },
        scene,
      );
      floor.material        = makeBlackMat("floorM");
      floor.checkCollisions = true;

      for (let i = -15; i <= 15; i++) {
        const line = BABYLON.MeshBuilder.CreateBox(
          `gl${i}`, { width: 0.04, height: 0.01, depth: 300 }, scene,
        );
        line.position = new BABYLON.Vector3(i * 5, 0.005, 0);
        const lm = new BABYLON.StandardMaterial(`glm${i}`, scene);
        const br = 1 - Math.abs(i) * 0.06;
        lm.emissiveColor = new BABYLON.Color3(0, 0.97 * br, 1 * br);
        line.material = lm;
      }

      for (let i = -30; i <= 30; i++) {
        const line = BABYLON.MeshBuilder.CreateBox(
          `gt${i}`, { width: 300, height: 0.01, depth: 0.04 }, scene,
        );
        line.position = new BABYLON.Vector3(0, 0.005, i * 5);
        const lm = new BABYLON.StandardMaterial(`gtm${i}`, scene);
        lm.emissiveColor = new BABYLON.Color3(0, 0.5, 0.6);
        line.material = lm;
      }

      // ── Torres ────────────────────────────────────────────
      const towerDefs = [
        [-20,-35,6,35,0], [-32,-45,5,50,1], [-14,-50,7,25,0],
        [-42,-38,4,45,0], [-25,-58,5,38,1], [-10,-65,4,55,0],
        [ 20,-35,6,35,0], [ 32,-45,5,50,1], [ 14,-50,7,25,0],
        [ 42,-38,4,45,0], [ 25,-58,5,38,1], [ 10,-65,4,55,0],
      ];

      towerDefs.forEach(([x, z, w, h, ci], i) => {
        const [r, g, b] = ci === 0 ? [0, 0.97, 1] : [1, 0.4, 0];
        const body = BABYLON.MeshBuilder.CreateBox(
          `tb${i}`, { width: w, height: h, depth: w }, scene,
        );
        body.position = new BABYLON.Vector3(x, h / 2, z);
        body.material = makeBlackMat(`tbm${i}`);

        [[w/2,w/2],[w/2,-w/2],[-w/2,w/2],[-w/2,-w/2]].forEach(([cx,cz], ci2) => {
          const edge = BABYLON.MeshBuilder.CreateBox(
            `te${i}_${ci2}`, { width: 0.06, height: h, depth: 0.06 }, scene,
          );
          edge.position = new BABYLON.Vector3(x + cx, h / 2, z + cz);
          edge.material = makeMat(`tem${i}_${ci2}`, r, g, b);
        });

        const crown = BABYLON.MeshBuilder.CreateBox(
          `tc${i}`, { width: w + 0.2, height: 0.1, depth: w + 0.2 }, scene,
        );
        crown.position = new BABYLON.Vector3(x, h + 0.05, z);
        crown.material = makeMat(`tcm${i}`, r, g * 1.2, b);

        [h*0.25, h*0.5, h*0.75].forEach((yOff, li) => {
          const circ = BABYLON.MeshBuilder.CreateBox(
            `tcirc${i}_${li}`, { width: w + 0.06, height: 0.04, depth: 0.04 }, scene,
          );
          circ.position = new BABYLON.Vector3(x, yOff, z + w / 2 + 0.02);
          circ.material = makeMat(`tcircm${i}_${li}`, r, g * 0.6, b * 0.6);
        });
      });

      const mainTower = BABYLON.MeshBuilder.CreateBox(
        "mainTower", { width: 8, height: 120, depth: 8 }, scene,
      );
      mainTower.position = new BABYLON.Vector3(0, 60, -120);
      mainTower.material = makeBlackMat("mainTowerM");

      [[4,4],[4,-4],[-4,4],[-4,-4]].forEach(([cx, cz], i) => {
        const e = BABYLON.MeshBuilder.CreateBox(
          `mte${i}`, { width: 0.1, height: 120, depth: 0.1 }, scene,
        );
        e.position = new BABYLON.Vector3(cx, 60, -120 + cz);
        e.material = makeMat(`mtem${i}`, 0, 0.97, 1);
      });

      // ── Motos ─────────────────────────────────────────────
      const motorNodes  = [];
      const motorLights = [];

      MOTOR_POSITIONS.forEach((pos, i) => {
        const [r, g, b] = IDENTITY_COLORS[i];
        const node = new BABYLON.TransformNode(`motor${i}`, scene);
        node.position = new BABYLON.Vector3(pos[0], 0.5, pos[2]);

        const body = BABYLON.MeshBuilder.CreateBox(
          `mb${i}`, { width: 0.55, height: 0.32, depth: 2.4 }, scene,
        );
        body.parent   = node;
        body.material = makeBlackMat(`mbm${i}`);

        const stripe = BABYLON.MeshBuilder.CreateBox(
          `ms${i}`, { width: 0.03, height: 0.03, depth: 2.4 }, scene,
        );
        stripe.parent   = node;
        stripe.position = new BABYLON.Vector3(0.29, 0.1, 0);
        stripe.material = makeMat(`msm${i}`, r, g, b);

        const stripe2 = BABYLON.MeshBuilder.CreateBox(
          `ms2${i}`, { width: 0.03, height: 0.03, depth: 2.4 }, scene,
        );
        stripe2.parent   = node;
        stripe2.position = new BABYLON.Vector3(-0.29, 0.1, 0);
        stripe2.material = makeMat(`ms2m${i}`, r, g, b);

        const cabin = BABYLON.MeshBuilder.CreateBox(
          `mc${i}`, { width: 0.38, height: 0.22, depth: 0.75 }, scene,
        );
        cabin.parent   = node;
        cabin.position = new BABYLON.Vector3(0, 0.28, 0.2);
        const cabMat   = new BABYLON.StandardMaterial(`cabm${i}`, scene);
        cabMat.diffuseColor  = new BABYLON.Color3(0, 0, 0);
        cabMat.emissiveColor = new BABYLON.Color3(r * 0.3, g * 0.3, b * 0.3);
        cabMat.alpha = 0.6;
        cabin.material = cabMat;

        [0.95, -0.95].forEach((zo, wi) => {
          const wheel = BABYLON.MeshBuilder.CreateTorus(
            `mw${i}_${wi}`,
            { diameter: 0.65, thickness: 0.06, tessellation: 32 },
            scene,
          );
          wheel.parent   = node;
          wheel.position = new BABYLON.Vector3(0, -0.14, zo);
          wheel.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
          wheel.material = makeMat(`mwm${i}_${wi}`, r, g, b);
        });

        const disc = BABYLON.MeshBuilder.CreateTorus(
          `md${i}`,
          { diameter: 0.45, thickness: 0.04, tessellation: 32 },
          scene,
        );
        disc.parent   = node;
        disc.position = new BABYLON.Vector3(0, 0.1, -1.3);
        disc.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
        disc.material = makeMat(`mdm${i}`, r, g * 1.2, b);

        const ml = new BABYLON.PointLight(
          `ml${i}`, new BABYLON.Vector3(pos[0], 0.05, pos[2]), scene,
        );
        ml.intensity = 3;
        ml.diffuse   = new BABYLON.Color3(r, g, b);
        ml.range     = 4;

        motorNodes.push(node);
        motorLights.push(ml);
      });

      // Exponer a los refs para que el keydown handler los use
      motorNodesRef.current  = motorNodes;
      motorLightsRef.current = motorLights;

      // Flotación de motos
      let t = 0;
      scene.registerBeforeRender(() => {
        t += engine.getDeltaTime() * 0.001;
        motorNodes.forEach((n, i) => {
          if (!n.isEnabled()) return;
          n.position.y          = 0.5 + Math.sin(t * 1.8 + i * 0.8) * 0.06;
          motorLights[i].position.y = 0.05 + Math.sin(t * 1.8 + i * 0.8) * 0.06;
        });
      });

      // ── Bots ──────────────────────────────────────────────
      const botsData   = [...bots].sort((a, b) => b.speed - a.speed);
      const botNodes   = [];
      const botTargets = [];
      const botDoneArr = [];

      const makeTronSuit = (node, r, g, b) => {
        const black = makeBlackMat(`suit_${Math.random()}`);
        const neon  = makeMat(`neon_${Math.random()}`, r, g, b);

        const torso = BABYLON.MeshBuilder.CreateBox(
          "torso", { width: 0.32, height: 0.48, depth: 0.2 }, scene,
        );
        torso.parent   = node;
        torso.position.y = 0.88;
        torso.material = black;

        const chest = BABYLON.MeshBuilder.CreateBox(
          "chest", { width: 0.04, height: 0.35, depth: 0.02 }, scene,
        );
        chest.parent   = node;
        chest.position = new BABYLON.Vector3(0, 0.92, 0.11);
        chest.material = neon;

        [-0.15, 0.15].forEach((xOff, si) => {
          const sh = BABYLON.MeshBuilder.CreateBox(
            `sh${si}`, { width: 0.02, height: 0.02, depth: 0.2 }, scene,
          );
          sh.parent   = node;
          sh.position = new BABYLON.Vector3(xOff, 1.1, 0);
          sh.material = neon;
        });

        const head = BABYLON.MeshBuilder.CreateBox(
          "head", { width: 0.22, height: 0.24, depth: 0.22 }, scene,
        );
        head.parent     = node;
        head.position.y = 1.44;
        head.material   = black;

        const visor = BABYLON.MeshBuilder.CreateBox(
          "visor", { width: 0.18, height: 0.06, depth: 0.02 }, scene,
        );
        visor.parent   = node;
        visor.position = new BABYLON.Vector3(0, 1.46, 0.12);
        visor.material = neon;

        [-0.09, 0.09].forEach((xOff, li) => {
          const leg = BABYLON.MeshBuilder.CreateBox(
            `leg${li}`, { width: 0.13, height: 0.46, depth: 0.14 }, scene,
          );
          leg.parent   = node;
          leg.position = new BABYLON.Vector3(xOff, 0.32, 0);
          leg.material = black;

          const ll = BABYLON.MeshBuilder.CreateBox(
            `ll${li}`, { width: 0.02, height: 0.4, depth: 0.02 }, scene,
          );
          ll.parent   = node;
          ll.position = new BABYLON.Vector3(xOff, 0.32, 0.08);
          ll.material = neon;
        });

        const disc = BABYLON.MeshBuilder.CreateTorus(
          "disc",
          { diameter: 0.28, thickness: 0.025, tessellation: 32 },
          scene,
        );
        disc.parent   = node;
        disc.position = new BABYLON.Vector3(0, 0.92, -0.12);
        disc.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
        disc.material = makeMat("discM", r, g * 1.3, b);
      };

      botsData.forEach((bot, i) => {
        const [r, g, b] = IDENTITY_COLORS[i % IDENTITY_COLORS.length];
        const node = new BABYLON.TransformNode(`bot${i}`, scene);
        node.position = new BABYLON.Vector3((i - 4) * 1.5, 0, 6);

        makeTronSuit(node, r, g, b);

        const bl = new BABYLON.PointLight(
          `bl${i}`, new BABYLON.Vector3(0, 1, 0), scene,
        );
        bl.parent    = node;
        bl.intensity = 1.5;
        bl.diffuse   = new BABYLON.Color3(r, g, b);
        bl.range     = 2;

        botTargets.push(new BABYLON.Vector3(
          MOTOR_POSITIONS[Math.min(i, MOTOR_POSITIONS.length - 1)][0],
          0,
          MOTOR_POSITIONS[Math.min(i, MOTOR_POSITIONS.length - 1)][2],
        ));
        botDoneArr.push(false);
        botNodes.push(node);
      });

      let runT = 0;
      scene.registerBeforeRender(() => {
        runT += engine.getDeltaTime() * 0.001;
        const delta = engine.getDeltaTime() * 0.001;
        botsData.forEach((bot, i) => {
          if (botDoneArr[i] || !bot.alive) return;
          const node = botNodes[i];
          const dir  = botTargets[i].subtract(node.position);
          dir.y = 0;
          const dist = dir.length();
          if (dist < 1.0) {
            botDoneArr[i] = true;
            if (!botMotorMap.current[bot.id]) {
              const idx = Object.keys(botMotorMap.current).length;
              botMotorMap.current[bot.id] = true;
              if (idx >= 9) {
                node.setEnabled(false);
                setDerezzed((d) => d + 1);
                setMessage("UN PROGRAMA HA SIDO DERREZADO");
                setTimeout(() => onCompleteRef.current(false), 2500);
              } else {
                if (motorNodes[idx]) motorNodes[idx].setEnabled(false);
                if (motorLights[idx]) motorLights[idx].setEnabled(false);
                setMotorsTaken((prev) => {
                  motorsTakenRef.current = prev + 1;
                  return prev + 1;
                });
              }
            }
            return;
          }
          dir.normalize();
          node.position.addInPlace(dir.scale(bot.speed * 4.5 * delta));
          node.position.y = Math.abs(Math.sin(runT * 8 + i)) * 0.05;
          node.rotation.y = Math.atan2(dir.x, dir.z);
        });
      });

      // ── Detección de proximidad — SIN leer input ──────────
      scene.registerBeforeRender(() => {
        if (playerDoneRef.current || motorsTakenRef.current >= 9) {
          if (nearMotorRef.current !== -1) {
            nearMotorRef.current = -1;
            setCanInteract(false);
          }
          return;
        }

        playerLight.position.copyFrom(camera.position);
        playerLight.position.y = 0.1;

        let found = -1;
        MOTOR_POSITIONS.forEach((mp, i) => {
          if (takenSet.current.has(i)) return;
          const dx = camera.position.x - mp[0];
          const dz = camera.position.z - mp[2];
          if (Math.sqrt(dx * dx + dz * dz) < 2.0) found = i;
        });

        if (nearMotorRef.current !== found) {
          nearMotorRef.current = found;
          setCanInteract(found !== -1);
        }
      });

      // ── Manos del jugador ─────────────────────────────────
      const lHand = BABYLON.MeshBuilder.CreateBox(
        "lhand", { width: 0.09, height: 0.055, depth: 0.24 }, scene,
      );
      lHand.material = makeBlackMat("lhandM");

      const rHand = BABYLON.MeshBuilder.CreateBox(
        "rhand", { width: 0.09, height: 0.055, depth: 0.24 }, scene,
      );
      rHand.material = makeBlackMat("rhandM");

      ["l", "r"].forEach((side, si) => {
        const circuit = BABYLON.MeshBuilder.CreateBox(
          `hc${side}`, { width: 0.006, height: 0.006, depth: 0.24 }, scene,
        );
        circuit.material = makeMat(`hcm${side}`, 0, 0.97, 1);

        scene.registerBeforeRender(() => {
          const ref = si === 0 ? lHand : rHand;
          circuit.position.copyFrom(ref.position);
          circuit.rotation.copyFrom(ref.rotation);
          const up = camera.getDirection(BABYLON.Axis.Y);
          circuit.position.addInPlace(up.scale(0.032));
        });
      });

      let bobT = 0;
      scene.registerBeforeRender(() => {
        bobT += engine.getDeltaTime() * 0.001;
        const fw  = camera.getDirection(BABYLON.Axis.Z);
        const rt  = camera.getDirection(BABYLON.Axis.X);
        const up  = camera.getDirection(BABYLON.Axis.Y);
        const bob = Math.sin(bobT * 9) * 0.009;

        lHand.position = camera.position.clone()
          .subtract(rt.scale(0.24))
          .subtract(up.scale(0.2 + bob))
          .subtract(fw.scale(0.42));
        lHand.rotation = camera.rotation.clone();

        rHand.position = camera.position.clone()
          .add(rt.scale(0.24))
          .subtract(up.scale(0.2 - bob))
          .subtract(fw.scale(0.42));
        rHand.rotation = camera.rotation.clone();
      });

      // ── Partículas ────────────────────────────────────────
      const ps = new BABYLON.ParticleSystem("data", 300, scene);
      ps.emitter    = new BABYLON.Vector3(0, 10, -20);
      ps.minEmitBox = new BABYLON.Vector3(-40, -5, -30);
      ps.maxEmitBox = new BABYLON.Vector3( 40,  5,  10);
      ps.color1     = new BABYLON.Color4(0, 0.97, 1, 0.4);
      ps.color2     = new BABYLON.Color4(0, 0.4, 0.5, 0.2);
      ps.colorDead  = new BABYLON.Color4(0, 0, 0, 0);
      ps.minSize    = 0.01;
      ps.maxSize    = 0.045;
      ps.minLifeTime = 4;
      ps.maxLifeTime = 8;
      ps.emitRate   = 45;
      ps.blendMode  = BABYLON.ParticleSystem.BLENDMODE_ADD;
      ps.gravity    = new BABYLON.Vector3(0, -0.2, 0);
      ps.direction1 = new BABYLON.Vector3(-0.3, -1, -0.3);
      ps.direction2 = new BABYLON.Vector3( 0.3, -0.3, 0.3);
      ps.minEmitPower = 0.1;
      ps.maxEmitPower = 0.5;
      ps.updateSpeed  = 0.007;
      ps.start();

      engine.runRenderLoop(() => { if (!disposed) scene.render(); });
      window.addEventListener("resize", () => engine.resize());
    };

    init().catch(console.error);

    return () => {
      disposed = true;
      if (engineRef.current) {
        engineRef.current.stopRenderLoop();
        engineRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (motorsTaken >= 9 && !playerDone) {
      setMessage("SIN MOTO — FIN DEL PROGRAMA");
      setTimeout(() => onComplete(true), 2000);
    }
  }, [motorsTaken, playerDone]);

  // ── JSX ───────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", outline: "none" }}
      />

      {/* HUD */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between",
        padding: "20px 26px", pointerEvents: "none",
        fontFamily: "'Share Tech Mono',monospace",
      }}>
        <div style={{
          fontSize: "0.58rem", color: "rgba(0,247,255,0.65)",
          letterSpacing: "0.2em", lineHeight: 2,
          borderLeft: "2px solid rgba(0,247,255,0.3)", paddingLeft: 12,
        }}>
          FASE 1 — STAGING PIT<br />
          <span style={{ color: "#ff6600" }}>MOTOS: {Math.max(0, 9 - motorsTaken)}/9</span>
        </div>
        <div style={{
          fontSize: "0.58rem", textAlign: "right",
          color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em",
          borderRight: "2px solid rgba(0,247,255,0.3)", paddingRight: 12,
        }}>
          PROGRAMAS ACTIVOS<br />
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: "1.6rem",
            color: "#00f7ff", textShadow: "0 0 20px #00f7ff",
          }}>
            {10 - derezzedCount}
          </span>
          <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.2)" }}>/10</span>
        </div>
      </div>

      {/* Crosshair */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: -10, right: -10,
          height: "1px", background: "rgba(0,247,255,0.4)", transform: "translateY(-50%)",
        }} />
        <div style={{
          position: "absolute", left: "50%", top: -10, bottom: -10,
          width: "1px", background: "rgba(0,247,255,0.4)", transform: "translateX(-50%)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 4, height: 4, borderRadius: "50%", background: "rgba(0,247,255,0.7)",
        }} />
      </div>

      {/* Aviso de interacción */}
      {canInteract && !playerDone && (
        <div style={{
          position: "absolute", top: "65%", left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: "0.9rem", color: "#00f7ff",
          textShadow: "0 0 10px #00f7ff",
          background: "rgba(0,0,0,0.7)",
          padding: "8px 20px", border: "1px solid #00f7ff",
          pointerEvents: "none", letterSpacing: "0.15em", zIndex: 10,
        }}>
          [E] ABORDAR CICLO
        </div>
      )}

      {!message && (
        <div style={{
          position: "absolute", bottom: 44, left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: "0.6rem", color: "rgba(0,247,255,0.7)",
          letterSpacing: "0.25em", textAlign: "center",
          background: "rgba(0,0,0,0.8)", padding: "10px 28px",
          borderTop: "1px solid rgba(0,247,255,0.2)",
          borderBottom: "1px solid rgba(0,247,255,0.2)",
        }}>
          CLICK PARA ACTIVAR &nbsp;·&nbsp; WASD PARA MOVERSE
        </div>
      )}

      {message && (
        <div style={{
          position: "absolute", bottom: 100, left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Orbitron',sans-serif", fontWeight: 900,
          fontSize: "clamp(0.9rem,2.5vw,1.2rem)",
          color: message.includes("TOMADA") ? "#00f7ff" : "#ff0055",
          textShadow: `0 0 30px ${message.includes("TOMADA") ? "#00f7ff" : "#ff0055"}`,
          letterSpacing: "0.15em", pointerEvents: "none",
        }}>
          {message}
        </div>
      )}
    </div>
  );
}