"use client";
import React, { useEffect, useRef, useState } from "react";
import { useBattleStore } from "../useBattleStore";

// ── Configuración ─────────────────────────────────────────────
const ARENA_SIZE   = 120;
const CYCLE_SPEED  = 22;
const TRAIL_SEG    = 0.4;
const TRAIL_HEIGHT = 1.4;
const BOT_THINK    = 0.55;
const TRAIL_MAX_AGE = 8.0;  // segundos que dura la estela (nuevo)

const DIR = {
  N: { x:  0, z: -1 },
  S: { x:  0, z:  1 },
  E: { x:  1, z:  0 },
  W: { x: -1, z:  0 },
};
const OPPOSITE   = { N:"S", S:"N", E:"W", W:"E" };
const TURN_LEFT  = { N:"W", W:"S", S:"E", E:"N" };
const TURN_RIGHT = { N:"E", E:"S", S:"W", W:"N" };

const SLOT_COLORS = [
  [0, 0.97, 1],
  [1, 0.4,  0],
  [0.6, 0,  1],
  [1, 0.9,  0],
  [0, 1,  0.4],
  [1, 0,  0.5],
  [0.4, 0.8, 1],
  [1, 0.6,  0],
];

export default function Phase3({ onComplete }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const { bots }  = useBattleStore();

  const [survivors, setSurvivors] = useState(0);
  const [message,   setMessage]   = useState("");
  const [countdown, setCountdown] = useState(3);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Input nativo ──────────────────────────────────────────
  const pendingTurn = useRef(null);

  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft")  pendingTurn.current = "L";
      if (e.code === "KeyD" || e.code === "ArrowRight") pendingTurn.current = "R";
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // ── Babylon ───────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;

    const init = async () => {
      const BABYLON = await import("@babylonjs/core");

      const engine = new BABYLON.Engine(canvasRef.current, true, {
        adaptToDeviceRatio: true,
      });
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      scene.clearColor   = new BABYLON.Color4(0, 0, 0, 1);
      scene.ambientColor = new BABYLON.Color3(0, 0, 0);

      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = 1.8;

      // ── Materiales ────────────────────────────────────────
      const neon = (name, r, g, b, a = 1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(r, g, b);
        if (a < 1) m.alpha = a;
        return m;
      };
      const blackMat = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.01, 0.01, 0.01);
        m.emissiveColor = new BABYLON.Color3(0, 0, 0);
        return m;
      };

      // ── Iluminación ──────────────────────────────────────
      const gridLight = new BABYLON.PointLight("gl", new BABYLON.Vector3(0, 5, 0), scene);
      gridLight.intensity = 4;
      gridLight.diffuse   = new BABYLON.Color3(0, 0.97, 1);
      gridLight.range     = 300;

      // ── Arena ────────────────────────────────────────────
      const floor = BABYLON.MeshBuilder.CreateGround(
        "floor", { width: ARENA_SIZE * 2 + 10, height: ARENA_SIZE * 2 + 10, subdivisions: 1 }, scene,
      );
      floor.material = blackMat("floorM");

      const S = ARENA_SIZE;
      for (let i = -S; i <= S; i += 8) {
        const h = BABYLON.MeshBuilder.CreateBox(`gh${i}`, { width: S * 2, height: 0.02, depth: 0.05 }, scene);
        h.position = new BABYLON.Vector3(0, 0.01, i);
        const br = 0.25 - Math.abs(i / S) * 0.15;
        h.material = neon(`ghm${i}`, 0, br * 0.97, br);
        const v = BABYLON.MeshBuilder.CreateBox(`gv${i}`, { width: 0.05, height: 0.02, depth: S * 2 }, scene);
        v.position = new BABYLON.Vector3(i, 0.01, 0);
        v.material = neon(`gvm${i}`, 0, br * 0.97, br);
      }

      const wallDefs = [
        [0,  S,  S * 2, 0.2, 0.4],
        [0, -S,  S * 2, 0.2, 0.4],
        [ S, 0,  0.4, 0.2, S * 2],
        [-S, 0,  0.4, 0.2, S * 2],
      ];
      wallDefs.forEach(([x, z, w, h, d], i) => {
        const wall = BABYLON.MeshBuilder.CreateBox(`wall${i}`, { width: w, height: h, depth: d }, scene);
        wall.position = new BABYLON.Vector3(x, 0.1, z);
        wall.material = neon(`wallM${i}`, 0, 0.97, 1);
      });

      [[S,S],[S,-S],[-S,S],[-S,-S]].forEach(([x, z], i) => {
        const c = BABYLON.MeshBuilder.CreateBox(`cor${i}`, { width: 0.5, height: 2, depth: 0.5 }, scene);
        c.position = new BABYLON.Vector3(x, 1, z);
        c.material = neon(`corM${i}`, 0, 0.97, 1);
      });

      // ── Participantes ────────────────────────────────────
      const aliveBots    = bots.filter(b => b.alive && b.hasTube);
      const totalRiders  = 1 + aliveBots.length;
      const startPositions = [];
      for (let i = 0; i < totalRiders; i++) {
        const angle = (i / totalRiders) * Math.PI * 2;
        startPositions.push({ x: Math.cos(angle) * 18, z: Math.sin(angle) * 18 });
      }

      const riders = [];

      const makeCycle = (slotIdx, sx, sz, startDir) => {
        const [r, g, b] = SLOT_COLORS[slotIdx % SLOT_COLORS.length];
        const node = new BABYLON.TransformNode(`cycle${slotIdx}`, scene);
        node.position = new BABYLON.Vector3(sx, 0.5, sz);

        const body = BABYLON.MeshBuilder.CreateBox(`cb${slotIdx}`,
          { width: 0.55, height: 0.32, depth: 2.2 }, scene);
        body.parent   = node;
        body.material = blackMat(`cbM${slotIdx}`);

        const stripe = BABYLON.MeshBuilder.CreateBox(`cs${slotIdx}`,
          { width: 0.04, height: 0.04, depth: 2.2 }, scene);
        stripe.parent   = node;
        stripe.position = new BABYLON.Vector3(0, 0.18, 0);
        stripe.material = neon(`csM${slotIdx}`, r, g, b);

        [0.85, -0.85].forEach((zo, wi) => {
          const w = BABYLON.MeshBuilder.CreateTorus(`cw${slotIdx}_${wi}`,
            { diameter: 0.58, thickness: 0.055, tessellation: 18 }, scene);
          w.parent   = node;
          w.position = new BABYLON.Vector3(0, -0.1, zo);
          w.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
          w.material = neon(`cwM${slotIdx}_${wi}`, r, g, b);
        });

        const cl = new BABYLON.PointLight(`cl${slotIdx}`, new BABYLON.Vector3(0, 0, 0), scene);
        cl.parent    = node;
        cl.intensity = 4;
        cl.diffuse   = new BABYLON.Color3(r, g, b);
        cl.range     = 10;

        return {
          x: sx, z: sz,
          dir: startDir,
          alive: true,
          isPlayer: slotIdx === 0,
          r, g, b,
          node,
          // ── Estela: cada entrada es { mesh, x1, z1, x2, z2, born }
          trailSegs: [],
          lastSegPos: { x: sx, z: sz },
          botTimer: Math.random() * BOT_THINK,
        };
      };

      const startDirs = ["N", "S", "E", "W", "N", "S", "E", "W"];
      riders.push(makeCycle(0, startPositions[0].x, startPositions[0].z, startDirs[0]));
      aliveBots.forEach((bot, i) => {
        riders.push(makeCycle(
          i + 1,
          startPositions[i + 1].x,
          startPositions[i + 1].z,
          startDirs[(i + 1) % startDirs.length],
        ));
      });

      setSurvivors(riders.length);

      // ── CAMBIO 1: Cámara DETRÁS del jugador ──────────────
      // camPivot se posiciona en el jugador y rota según su dirección.
      // La cámara está en local (0, 14, -12) = ATRÁS del pivot
      // y mira hacia (0, 0, 8) = ADELANTE del pivot.
      const camPivot = new BABYLON.TransformNode("camPivot", scene);
      const camera   = new BABYLON.UniversalCamera("cam",
        new BABYLON.Vector3(0, 14, -12), scene);  // <-- negativo Z = atrás
      camera.parent  = camPivot;
      camera.setTarget(new BABYLON.Vector3(0, 0, 8)); // <-- positivo Z = adelante
      camera.fov     = 1.05;
      camera.minZ    = 0.1;
      camera.maxZ    = 500;

      // ── Helper: añadir segmento de estela ─────────────────
      // CAMBIO 2: cada segmento guarda `born` para expiración
      const addTrailSeg = (rider, x1, z1, x2, z2) => {
        const dx  = x2 - x1;
        const dz  = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.05) return;

        const cx    = (x1 + x2) / 2;
        const cz    = (z1 + z2) / 2;
        const angle = Math.atan2(dx, dz);
        const uid   = `${Date.now()}_${Math.random()}`;

        const seg = BABYLON.MeshBuilder.CreateBox(`tr_${uid}`,
          { width: 0.18, height: TRAIL_HEIGHT, depth: len }, scene);
        seg.position = new BABYLON.Vector3(cx, TRAIL_HEIGHT / 2, cz);
        seg.rotation.y = angle;
        const mat = neon(`trM_${uid}`, rider.r, rider.g, rider.b, 0.85);
        seg.material = mat;

        rider.trailSegs.push({
          mesh: seg,
          mat,
          x1, z1, x2, z2,
          born: performance.now() / 1000,  // timestamp de creación
        });
      };

      // ── Helper: colisión — ignora segmentos caducados ─────
      const checkCollision = (rider, nx, nz) => {
        if (Math.abs(nx) >= ARENA_SIZE || Math.abs(nz) >= ARENA_SIZE) return true;
        const now = performance.now() / 1000;

        for (const r2 of riders) {
          if (!r2.alive) continue;
          for (let si = 0; si < r2.trailSegs.length; si++) {
            if (r2 === rider && si >= r2.trailSegs.length - 2) continue;
            const seg = r2.trailSegs[si];
            // Segmento caducado no cuenta para colisión
            if (now - seg.born > TRAIL_MAX_AGE) continue;
            const dist = pointToSegDist(nx, nz, seg.x1, seg.z1, seg.x2, seg.z2);
            if (dist < 0.5) return true;
          }
        }
        return false;
      };

      // ── IA de bots ────────────────────────────────────────
      const botDecide = (rider) => {
        const d  = DIR[rider.dir];
        const spd = CYCLE_SPEED * 0.5;
        const nx = rider.x + d.x * spd;
        const nz = rider.z + d.z * spd;
        if (!checkCollision(rider, nx, nz)) return;

        const opts = [TURN_LEFT[rider.dir], TURN_RIGHT[rider.dir]];
        if (Math.random() > 0.5) opts.reverse();
        for (const newDir of opts) {
          const nd  = DIR[newDir];
          const nnx = rider.x + nd.x * spd;
          const nnz = rider.z + nd.z * spd;
          if (!checkCollision(rider, nnx, nnz)) { rider.dir = newDir; return; }
        }
        rider.dir = opts[0];
      };

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

      // ── RENDER LOOP ───────────────────────────────────────
      let gameDone = false;

      scene.registerBeforeRender(() => {
        if (disposed || gameDone || !gameStarted) return;
        const dt  = engine.getDeltaTime() * 0.001;
        const now = performance.now() / 1000;

        // ── Input jugador ───────────────────────────────
        const player = riders[0];
        if (player.alive && pendingTurn.current) {
          const turn = pendingTurn.current;
          pendingTurn.current = null;
          const newDir = turn === "L" ? TURN_LEFT[player.dir] : TURN_RIGHT[player.dir];
          if (newDir !== OPPOSITE[player.dir]) player.dir = newDir;
        }

        // ── Mover cada rider ─────────────────────────────
        riders.forEach((rider) => {
          if (!rider.alive) return;

          // ── CAMBIO 2: expirar segmentos de estela ──────
          // Fade-out gradual + limpieza de colisión
          for (let i = rider.trailSegs.length - 1; i >= 0; i--) {
            const seg = rider.trailSegs[i];
            const age = now - seg.born;
            if (age >= TRAIL_MAX_AGE) {
              seg.mesh.dispose();
              rider.trailSegs.splice(i, 1);
            } else if (age > TRAIL_MAX_AGE * 0.6) {
              // Comienza fade cuando queda 40% de vida
              const fade = 1 - (age - TRAIL_MAX_AGE * 0.6) / (TRAIL_MAX_AGE * 0.4);
              seg.mat.alpha = Math.max(0, fade * 0.85);
            }
          }

          if (!rider.isPlayer) {
            rider.botTimer -= dt;
            if (rider.botTimer <= 0) {
              rider.botTimer = BOT_THINK * (0.7 + Math.random() * 0.6);
              botDecide(rider);
            }
          }

          const d  = DIR[rider.dir];
          const nx = rider.x + d.x * CYCLE_SPEED * dt;
          const nz = rider.z + d.z * CYCLE_SPEED * dt;

          if (checkCollision(rider, nx, nz)) {
            rider.alive = false;
            rider.node.setEnabled(false);
            rider.trailSegs.forEach(s => setTimeout(() => { if (!disposed) s.mesh.dispose(); }, 1200));
            rider.trailSegs = [];

            const alive = riders.filter(r => r.alive).length;
            setSurvivors(alive);

            if (rider.isPlayer) {
              gameDone = true;
              setMessage("DERREZADO — FIN DEL CICLO");
              setTimeout(() => onCompleteRef.current(true), 2000);
              return;
            }
            if (alive <= 1) {
              gameDone = true;
              setMessage("¡ÚLTIMO PROGRAMA EN PIE!");
              setTimeout(() => onCompleteRef.current(false), 2000);
            }
            return;
          }

          rider.x = nx;
          rider.z = nz;
          rider.node.position.x = nx;
          rider.node.position.z = nz;
          rider.node.rotation.y = Math.atan2(d.x, d.z);

          const dx = nx - rider.lastSegPos.x;
          const dz = nz - rider.lastSegPos.z;
          if (Math.sqrt(dx * dx + dz * dz) >= TRAIL_SEG) {
            addTrailSeg(rider, rider.lastSegPos.x, rider.lastSegPos.z, nx, nz);
            rider.lastSegPos = { x: nx, z: nz };
          }
        });

        // ── CAMBIO 1: Cámara detrás del jugador ──────────
        // El pivot se posiciona en el jugador y rota en la misma
        // dirección de avance. La cámara local (0,14,-12) queda atrás.
        if (player.alive) {
          const pd = DIR[player.dir];
          camPivot.position.x = BABYLON.Scalar.Lerp(camPivot.position.x, player.x, dt * 8);
          camPivot.position.z = BABYLON.Scalar.Lerp(camPivot.position.z, player.z, dt * 8);
          // Rotar el pivot para que -Z local apunte OPUESTO a la dirección de avance
          // atan2(pd.x, pd.z) da el ángulo de avance; le sumamos PI para invertir
          const forwardAngle = Math.atan2(pd.x, pd.z);
          camPivot.rotation.y = lerpAngle(camPivot.rotation.y, forwardAngle + Math.PI, dt * 6);
        }

        gridLight.position.x = riders[0].x;
        gridLight.position.z = riders[0].z;
      });

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

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#000", position:"relative" }}>
      <canvas ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block", outline:"none" }} />

      {/* HUD */}
      <div style={{
        position:"absolute", top:0, left:0, right:0,
        display:"flex", justifyContent:"space-between",
        padding:"20px 26px", pointerEvents:"none",
        fontFamily:"'Share Tech Mono',monospace",
      }}>
        <div style={{
          fontSize:"0.58rem", color:"rgba(0,247,255,0.65)",
          letterSpacing:"0.2em", lineHeight:2,
          borderLeft:"2px solid rgba(0,247,255,0.3)", paddingLeft:12,
        }}>
          FASE 3 — LIGHT CYCLES<br/>
          <span style={{ color:"#ff6600" }}>EN PISTA: {survivors}</span>
        </div>
        <div style={{
          fontSize:"0.58rem", textAlign:"right",
          color:"rgba(255,255,255,0.35)", letterSpacing:"0.15em",
          borderRight:"2px solid rgba(0,247,255,0.3)", paddingRight:12,
        }}>
          PROGRAMAS ACTIVOS<br/>
          <span style={{
            fontFamily:"'Orbitron',sans-serif", fontSize:"1.6rem",
            color:"#00f7ff", textShadow:"0 0 20px #00f7ff",
          }}>{survivors}</span>
        </div>
      </div>

      {/* Countdown */}
      {countdown > 0 && (
        <div style={{
          position:"absolute", inset:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          pointerEvents:"none",
        }}>
          <div style={{
            fontFamily:"'Orbitron',sans-serif", fontWeight:900,
            fontSize:"clamp(5rem,18vw,10rem)",
            color:"#00f7ff",
            textShadow:"0 0 60px #00f7ff, 0 0 120px #00f7ff44",
            letterSpacing:"0.1em",
            animation:"pulse 0.9s ease infinite",
          }}>
            {countdown}
          </div>
        </div>
      )}

      {/* Mensaje */}
      {message && (
        <div style={{
          position:"absolute", top:"42%", left:"50%",
          transform:"translateX(-50%)",
          fontFamily:"'Orbitron',sans-serif", fontWeight:900,
          fontSize:"clamp(1rem,3vw,1.4rem)",
          color: message.includes("ÚLTIMO") ? "#00f7ff" : "#ff0055",
          textShadow:"0 0 30px currentColor",
          letterSpacing:"0.15em", pointerEvents:"none",
          whiteSpace:"nowrap",
        }}>
          {message}
        </div>
      )}

      {/* Controles */}
      {countdown < 0 && !message && (
        <div style={{
          position:"absolute", bottom:20, left:"50%",
          transform:"translateX(-50%)",
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:"0.5rem", color:"rgba(0,247,255,0.3)",
          letterSpacing:"0.25em", pointerEvents:"none",
        }}>
          A / ← — GIRAR IZQUIERDA &nbsp;·&nbsp; D / → — GIRAR DERECHA
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1) }
          50%      { opacity:0.7; transform:scale(0.92) }
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
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
