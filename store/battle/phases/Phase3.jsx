"use client";
import React, { useEffect, useRef, useState } from "react";
import { useBattleStore } from "../useBattleStore";

// ── Config ─────────────────────────────────────────────────────────────────
const SURVIVE_TIME      = 60;
const SHOOT_COOLDOWN    = 0.18;
const BULLET_SPEED      = 280;
const BULLET_LIFE       = 1.8;
const HIT_RADIUS        = 3.2;
const JET_MIN_SPEED     = 18;
const JET_MAX_SPEED     = 62;
const JET_THROTTLE_STEP = 0.5;
const JET_SPEED_LERP    = 3.2;
const JET_YAW_RATE      = 1.8;
const JET_PITCH_RATE    = 1.3;
const JET_MAX_PITCH     = 0.62;
const JET_BANK_MAX      = 0.85;
const JET_TURN_LERP     = 5.2;
const JET_BANK_LERP     = 6.0;
const JET_GRAVITY       = 4.2;
const JET_DRAG          = 1.8;
const TRAIL_SEG_DIST    = 1.0;
const TRAIL_LIFE        = 5.5;
const CAM_LERP          = 9.0;

const SLOT_COLORS = [
  [0, 0.97, 1],
  [1, 0.22, 0.55],
  [0.95, 0.55, 0],
  [0.55, 0, 1],
  [0, 1, 0.45],
  [1, 0.85, 0],
  [0.3, 0.75, 1],
  [1, 0.3, 0.1],
];

// ── Obstáculos tipo Tron: portales / estructuras de datos ──────────────────
const OBSTACLE_DEFS = [
  [-20, 0,  -110,  10, 28, 4],
  [ 22, -4, -170,  10, 28, 4],
  [ -8, 12, -240,  12, 32, 4],
  [ 26,  0, -310,  10, 26, 4],
  [  0,-10, -390,  14, 36, 4],
  [-28, 10, -460,  10, 28, 4],
  [ 24, -2, -540,  10, 24, 4],
  [-12,  8, -620,   9, 22, 4],
  [ 18,-12, -700,  12, 30, 4],
  [  0, 18, -780,  10, 26, 4],
  [-32,  0, -870,   9, 20, 4],
  [ 30, 10, -960,  10, 28, 4],
  [-20, -6,-1060,  10, 24, 4],
  [ 22, 14,-1160,  12, 32, 4],
  [  0, -2,-1280,  14, 34, 4],
  [-24, 12,-1400,  10, 28, 4],
  [ 24,-10,-1530,  10, 28, 4],
  [-12, 16,-1660,  12, 32, 4],
  [ 28,  2,-1800,  10, 26, 4],
  [-26, -2,-1950,  10, 28, 4],
  [  0, 16,-2100,  16, 38, 4],
  [-20,  6,-2260,  10, 24, 4],
  [ 20,-12,-2420,  12, 32, 4],
  [  0,  0,-2600,  14, 36, 4],
];

// ── HUD ────────────────────────────────────────────────────────────────────
const C = {
  cyan:       "#00f7ff",
  cyanDim:    "rgba(0,247,255,0.35)",
  cyanFaint:  "rgba(0,247,255,0.12)",
  orange:     "#ff6600",
  white:      "rgba(255,255,255,0.85)",
  whiteDim:   "rgba(255,255,255,0.25)",
  bg:         "#000",
};

const FONT_MONO  = "'Share Tech Mono', monospace";
const FONT_HEAD  = "'Orbitron', sans-serif";

// ── Materiales ─────────────────────────────────────────────────────────────
function neonMat(B, scene, name, r, g, b, a = 1) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor  = new B.Color3(0, 0, 0);
  m.emissiveColor = new B.Color3(r, g, b);
  if (a < 1) m.alpha = a;
  return m;
}
function darkMat(B, scene, name, em = 0.04) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor  = new B.Color3(em, em, em + 0.01);
  m.emissiveColor = new B.Color3(0, 0, 0);
  return m;
}
function glowMat(B, scene, name, r, g, b, a = 0.72) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor  = new B.Color3(r * 0.06, g * 0.06, b * 0.06);
  m.emissiveColor = new B.Color3(r, g, b);
  m.specularColor = new B.Color3(1, 1, 1);
  m.alpha = a;
  return m;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function rotateAroundAxis(B, vec, axis, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dot = B.Vector3.Dot(vec, axis);
  const cross = B.Vector3.Cross(axis, vec);
  return new B.Vector3(
    vec.x * cos + cross.x * sin + axis.x * dot * (1 - cos),
    vec.y * cos + cross.y * sin + axis.y * dot * (1 - cos),
    vec.z * cos + cross.z * sin + axis.z * dot * (1 - cos),
  );
}

function getFrame(B, yaw, pitch, roll = 0) {
  const cp = Math.cos(pitch);
  const forward = new B.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
  forward.normalize();
  const worldRight = new B.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  worldRight.normalize();
  let up = B.Vector3.Cross(worldRight, forward);
  if (up.lengthSquared() < 1e-6) up = new B.Vector3(0, 1, 0);
  else up.normalize();
  const right = roll !== 0 ? rotateAroundAxis(B, worldRight, forward, roll) : worldRight.clone();
  const upR   = roll !== 0 ? rotateAroundAxis(B, up, forward, roll) : up.clone();
  return { forward, right, up: upR };
}

// ── Entorno Tron ────────────────────────────────────────────────────────────
function buildEnvironment(B, scene) {
  // Suelo cuadriculado cyan
  for (let i = -40; i <= 40; i += 4) {
    const br = Math.max(0.06, 0.28 - Math.abs(i / 40) * 0.22);
    const h  = B.MeshBuilder.CreateBox(`gh${i}`, { width: 1400, height: 0.015, depth: 0.05 }, scene);
    h.position = new B.Vector3(0, -55, i * 14);
    h.material = neonMat(B, scene, `ghm${i}`, 0, br * 0.95, br);
    const v  = B.MeshBuilder.CreateBox(`gv${i}`, { width: 0.05, height: 0.015, depth: 1400 }, scene);
    v.position = new B.Vector3(i * 14, -55, 0);
    v.material = neonMat(B, scene, `gvm${i}`, 0, br * 0.95, br);
  }

  // Plano suelo oscuro
  const ground = B.MeshBuilder.CreateGround("ground", { width: 1400, height: 1400 }, scene);
  ground.position.y = -55.01;
  const gm = new B.StandardMaterial("groundMat", scene);
  gm.diffuseColor  = new B.Color3(0, 0, 0);
  gm.emissiveColor = new B.Color3(0, 0.008, 0.012);
  ground.material  = gm;

  // Torres en horizonte — estilo rascacielos Tron
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2;
    const rad = 280 + Math.random() * 160;
    const th  = 80  + Math.random() * 220;
    const tx  = Math.cos(ang) * rad;
    const tz  = Math.sin(ang) * rad;
    const tw  = 6 + Math.random() * 8;
    const td  = 6 + Math.random() * 8;

    const body = B.MeshBuilder.CreateBox(`tb${i}`, { width: tw, height: th, depth: td }, scene);
    body.position = new B.Vector3(tx, th / 2 - 55, tz);
    body.material = darkMat(B, scene, `tbM${i}`, 0.02);

    const [cr, cg, cb] = i % 3 === 0 ? [0, 0.97, 1] : i % 3 === 1 ? [0, 0.45, 0.9] : [0.85, 0.22, 1];

    // Aristas verticales luminosas
    [[tw / 2, td / 2], [tw / 2, -td / 2], [-tw / 2, td / 2], [-tw / 2, -td / 2]].forEach(([ex, ez], ei) => {
      const edge = B.MeshBuilder.CreateBox(`te${i}_${ei}`, { width: 0.08, height: th + 0.2, depth: 0.08 }, scene);
      edge.position = new B.Vector3(tx + ex, th / 2 - 55, tz + ez);
      edge.material = neonMat(B, scene, `teM${i}_${ei}`, cr, cg, cb);
    });

    // Franjas horizontales cada ciertos pisos
    const stripeCount = Math.floor(th / 20);
    for (let s = 0; s < stripeCount; s++) {
      const sy = -55 + (s + 0.5) * (th / stripeCount);
      const stripe = B.MeshBuilder.CreateBox(`tstr${i}_${s}`, { width: tw + 0.1, height: 0.06, depth: td + 0.1 }, scene);
      stripe.position = new B.Vector3(tx, sy, tz);
      stripe.material = neonMat(B, scene, `tstrM${i}_${s}`, cr * 0.6, cg * 0.6, cb * 0.6);
    }
  }

  // Neblina de fondo — cuadros de datos en el horizonte
  for (let i = 0; i < 8; i++) {
    const bw = 80 + Math.random() * 120;
    const bh = 40 + Math.random() * 80;
    const ang = (i / 8) * Math.PI * 2;
    const rad = 420;
    const bg = B.MeshBuilder.CreateBox(`bg${i}`, { width: bw, height: bh, depth: 0.5 }, scene);
    bg.position = new B.Vector3(Math.cos(ang) * rad, bh / 2 - 55, Math.sin(ang) * rad);
    bg.lookAt(new B.Vector3(0, bh / 2 - 55, 0));
    const [cr, cg, cb] = i % 2 === 0 ? [0, 0.97, 1] : [0.35, 0, 0.9];
    bg.material = neonMat(B, scene, `bgM${i}`, cr * 0.12, cg * 0.12, cb * 0.12, 0.18);
  }
}

// ── Obstáculos tipo portal Tron ─────────────────────────────────────────────
function buildObstacles(B, scene) {
  const obstacles = [];

  OBSTACLE_DEFS.forEach((def, idx) => {
    const [x, y, z, w, h] = def;
    const isCyan  = idx % 2 === 0;
    const [r, g, b] = isCyan ? [0, 0.97, 1] : [0.85, 0.22, 1];

    const root = new B.TransformNode(`obs${idx}`, scene);
    root.position = new B.Vector3(x, y, z);

    const depth = 2.8;

    // Marco exterior — panel de datos
    const frameW = Math.max(6, w);
    const frameH = Math.max(14, h);

    // Cuerpo interior oscuro
    const inner = B.MeshBuilder.CreateBox(`obsInner${idx}`, {
      width: frameW - 1.2, height: frameH - 1.2, depth: depth * 0.6,
    }, scene);
    inner.parent = root;
    inner.material = darkMat(B, scene, `obsInnerM${idx}`, 0.015);
    inner.isPickable = false;

    // Membrana de energía translúcida
    const membrane = B.MeshBuilder.CreateBox(`obsMem${idx}`, {
      width: frameW - 1.4, height: frameH - 1.4, depth: 0.12,
    }, scene);
    membrane.parent = root;
    membrane.material = glowMat(B, scene, `obsMemM${idx}`, r, g, b, 0.28);
    membrane.isPickable = false;

    // Rieles laterales
    const railMat = neonMat(B, scene, `obsRailM${idx}`, r, g, b);
    const railW   = 0.22;

    const leftRail = B.MeshBuilder.CreateBox(`obsLR${idx}`, {
      width: railW, height: frameH + 0.3, depth: depth,
    }, scene);
    leftRail.parent = root;
    leftRail.position.x = -(frameW / 2) + railW / 2;
    leftRail.material = railMat;
    leftRail.isPickable = false;

    const rightRail = B.MeshBuilder.CreateBox(`obsRR${idx}`, {
      width: railW, height: frameH + 0.3, depth: depth,
    }, scene);
    rightRail.parent = root;
    rightRail.position.x = (frameW / 2) - railW / 2;
    rightRail.material = railMat;
    rightRail.isPickable = false;

    const topRail = B.MeshBuilder.CreateBox(`obsTR${idx}`, {
      width: frameW + 0.3, height: railW, depth: depth,
    }, scene);
    topRail.parent = root;
    topRail.position.y = (frameH / 2) - railW / 2;
    topRail.material = railMat;
    topRail.isPickable = false;

    const bottomRail = B.MeshBuilder.CreateBox(`obsBR${idx}`, {
      width: frameW + 0.3, height: railW, depth: depth,
    }, scene);
    bottomRail.parent = root;
    bottomRail.position.y = -(frameH / 2) + railW / 2;
    bottomRail.material = railMat;
    bottomRail.isPickable = false;

    // Esquinas — detalles de circuito
    const cornerMat = neonMat(B, scene, `obsCornerM${idx}`, r * 1.3, g * 1.3, b * 1.3);
    [
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ].forEach(([sx, sy], ci) => {
      const corner = B.MeshBuilder.CreateBox(`obsCorn${idx}_${ci}`, {
        width: 1.2, height: 1.2, depth: depth + 0.5,
      }, scene);
      corner.parent = root;
      corner.position.x = sx * (frameW / 2 - 0.6);
      corner.position.y = sy * (frameH / 2 - 0.6);
      corner.material = cornerMat;
      corner.isPickable = false;
    });

    // Núcleo brillante vertical — "barra de datos"
    const core = B.MeshBuilder.CreateBox(`obsCore${idx}`, {
      width: 0.18, height: frameH * 0.85, depth: 0.18,
    }, scene);
    core.parent = root;
    core.material = neonMat(B, scene, `obsCoreM${idx}`, r * 1.4, g * 1.4, b * 1.4, 0.9);
    core.isPickable = false;

    // Segundo núcleo horizontal
    const coreH = B.MeshBuilder.CreateBox(`obsCoreH${idx}`, {
      width: frameW * 0.8, height: 0.18, depth: 0.18,
    }, scene);
    coreH.parent = root;
    coreH.material = neonMat(B, scene, `obsCoreHM${idx}`, r * 1.4, g * 1.4, b * 1.4, 0.9);
    coreH.isPickable = false;

    // Luz puntual del portal
    const light = new B.PointLight(`obsL${idx}`, new B.Vector3(x, y, z), scene);
    light.diffuse   = new B.Color3(r, g, b);
    light.intensity = 4.5;
    light.range     = 28;

    obstacles.push({
      x, y, z,
      halfW: Math.max(3, frameW / 2),
      halfH: Math.max(7, frameH / 2),
      halfD: Math.max(2, depth / 2 + 1.0),
      color: [r, g, b],
      mesh: root,
      light,
    });
  });

  return obstacles;
}

// ── Jet estilo Tron ─────────────────────────────────────────────────────────
function buildJet(B, scene, slotIdx) {
  const [r, g, b] = SLOT_COLORS[slotIdx % SLOT_COLORS.length];
  const root = new B.TransformNode(`jet${slotIdx}`, scene);

  // Fuselaje central — delgado y alargado
  const fuse = B.MeshBuilder.CreateBox(`jf${slotIdx}`, {
    width: 0.42, height: 0.18, depth: 4.2,
  }, scene);
  fuse.parent = root;
  fuse.material = darkMat(B, scene, `jfM${slotIdx}`, 0.03);

  // Línea de identidad — spine central
  const spine = B.MeshBuilder.CreateBox(`jsp${slotIdx}`, {
    width: 0.03, height: 0.03, depth: 4.2,
  }, scene);
  spine.parent = root;
  spine.position.y = 0.10;
  spine.material = neonMat(B, scene, `jspM${slotIdx}`, r, g, b);

  // Nose tip
  const nose = B.MeshBuilder.CreateBox(`jn${slotIdx}`, {
    width: 0.22, height: 0.12, depth: 0.8,
  }, scene);
  nose.parent = root;
  nose.position.z = -2.5;
  nose.material = darkMat(B, scene, `jnM${slotIdx}`, 0.04);

  const noseTip = B.MeshBuilder.CreateBox(`jnt${slotIdx}`, {
    width: 0.05, height: 0.03, depth: 0.05,
  }, scene);
  noseTip.parent = root;
  noseTip.position.z = -2.95;
  noseTip.material = neonMat(B, scene, `jntM${slotIdx}`, r, g, b);

  // Alas — forma delta recta estilo Tron
  [-1, 1].forEach((side, si) => {
    const wing = B.MeshBuilder.CreateBox(`jw${slotIdx}_${si}`, {
      width: 4.0, height: 0.03, depth: 2.2,
    }, scene);
    wing.parent = root;
    wing.position.x = side * 2.2;
    wing.position.z = 0.6;
    wing.material = darkMat(B, scene, `jwM${slotIdx}_${si}`, 0.02);

    // Borde de ala iluminado
    const wEdgeFront = B.MeshBuilder.CreateBox(`jwef${slotIdx}_${si}`, {
      width: 4.2, height: 0.025, depth: 0.04,
    }, scene);
    wEdgeFront.parent = root;
    wEdgeFront.position.x = side * 2.2;
    wEdgeFront.position.z = -0.5;
    wEdgeFront.position.y = 0.02;
    wEdgeFront.material = neonMat(B, scene, `jwefM${slotIdx}_${si}`, r, g, b);

    const wEdgeBack = B.MeshBuilder.CreateBox(`jweb${slotIdx}_${si}`, {
      width: 4.2, height: 0.025, depth: 0.04,
    }, scene);
    wEdgeBack.parent = root;
    wEdgeBack.position.x = side * 2.2;
    wEdgeBack.position.z = 1.7;
    wEdgeBack.position.y = 0.02;
    wEdgeBack.material = neonMat(B, scene, `jwebM${slotIdx}_${si}`, r * 0.7, g * 0.7, b * 0.7);

    // Tip de ala vertical
    const tip = B.MeshBuilder.CreateBox(`jwt${slotIdx}_${si}`, {
      width: 0.06, height: 0.6, depth: 0.06,
    }, scene);
    tip.parent = root;
    tip.position.x = side * 4.4;
    tip.position.z = 0.6;
    tip.material = neonMat(B, scene, `jwtM${slotIdx}_${si}`, r, g, b);

    // Pod de arma — desde donde sale el disparo
    const pod = B.MeshBuilder.CreateBox(`jpod${slotIdx}_${si}`, {
      width: 0.12, height: 0.10, depth: 1.4,
    }, scene);
    pod.parent = root;
    pod.position.x = side * 1.4;
    pod.position.z = -1.2;
    pod.position.y = -0.06;
    pod.material = darkMat(B, scene, `jpodM${slotIdx}_${si}`, 0.03);

    const podTip = B.MeshBuilder.CreateBox(`jpodT${slotIdx}_${si}`, {
      width: 0.04, height: 0.04, depth: 0.06,
    }, scene);
    podTip.parent = root;
    podTip.position.x = side * 1.4;
    podTip.position.z = -1.94;
    podTip.position.y = -0.06;
    podTip.material = neonMat(B, scene, `jpodTM${slotIdx}_${si}`, r, g, b);
  });

  // Cabina — vidrio con reflejo
  const cabin = B.MeshBuilder.CreateBox(`jc${slotIdx}`, {
    width: 0.35, height: 0.22, depth: 1.0,
  }, scene);
  cabin.parent = root;
  cabin.position.y = 0.18;
  cabin.position.z = -0.4;
  cabin.material = darkMat(B, scene, `jcM${slotIdx}`, 0.04);

  const visor = B.MeshBuilder.CreateBox(`jv${slotIdx}`, {
    width: 0.28, height: 0.05, depth: 0.92,
  }, scene);
  visor.parent = root;
  visor.position.y = 0.30;
  visor.position.z = -0.4;
  visor.material = neonMat(B, scene, `jvM${slotIdx}`, r * 0.4, g * 0.4, b * 0.8, 0.65);

  // Tobera — motor
  const eng = B.MeshBuilder.CreateCylinder(`je${slotIdx}`, {
    height: 0.45, diameter: 0.28, tessellation: 10,
  }, scene);
  eng.parent = root;
  eng.position.z = 2.2;
  eng.rotation.x = Math.PI / 2;
  eng.material = neonMat(B, scene, `jeM${slotIdx}`, r, g, b);

  const engOuter = B.MeshBuilder.CreateCylinder(`jeo${slotIdx}`, {
    height: 0.18, diameter: 0.40, tessellation: 10,
  }, scene);
  engOuter.parent = root;
  engOuter.position.z = 2.12;
  engOuter.rotation.x = Math.PI / 2;
  engOuter.material = neonMat(B, scene, `jeoM${slotIdx}`, r * 0.6, g * 0.6, b * 0.6, 0.5);

  // Luz
  const jl = new B.PointLight(`jl${slotIdx}`, B.Vector3.Zero(), scene);
  jl.parent    = root;
  jl.intensity = 4.5;
  jl.diffuse   = new B.Color3(r, g, b);
  jl.range     = 20;

  return root;
}

// ── Explosión de datos ─────────────────────────────────────────────────────
function makeExplosionMat(B, scene, r, g, b) {
  return glowMat(B, scene, `exMat_${Date.now()}_${Math.random().toFixed(4)}`, r, g, b, 0.92);
}

// ── Componente principal ────────────────────────────────────────────────────
export default function Phase3({ onComplete }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const botsSnap = useRef(useBattleStore.getState().bots);
  const initialEnemyCount = botsSnap.current.filter((b) => b.alive && b.hasTube).length;

  const [timeLeft,  setTimeLeft]  = useState(SURVIVE_TIME);
  const [kills,     setKills]     = useState(0);
  const [message,   setMessage]   = useState("");
  const [totalBots, setTotalBots] = useState(initialEnemyCount);
  const [aliveBots, setAliveBots] = useState(initialEnemyCount);
  const [speed,     setSpeed]     = useState(0);

  const onCompleteRef   = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const timeLeftRef     = useRef(SURVIVE_TIME);
  const aliveBotsRef    = useRef(initialEnemyCount);
  const timeoutsRef     = useRef([]);
  const resizeRef       = useRef(null);

  const keys = useRef({
    turnLeft: false, turnRight: false,
    pitchUp: false, pitchDown: false,
    throttleUp: false, throttleDown: false,
    shoot: false,
  });

  useEffect(() => {
    const MAP = {
      Space: "shoot",
      KeyA: "turnLeft",  ArrowLeft:  "turnLeft",
      KeyD: "turnRight", ArrowRight: "turnRight",
      KeyW: "pitchUp",   ArrowUp:    "pitchUp",
      KeyS: "pitchDown", ArrowDown:  "pitchDown",
      KeyQ: "throttleUp",
      KeyE: "throttleDown",
    };
    const dn = (e) => { const a = MAP[e.code]; if (a) { e.preventDefault(); keys.current[a] = true; } };
    const up = (e) => { const a = MAP[e.code]; if (a) keys.current[a] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;

    const safeTimeout = (fn, ms) => {
      const id = setTimeout(() => { if (!disposed) fn(); }, ms);
      timeoutsRef.current.push(id);
      return id;
    };

    const init = async () => {
      const B = await import("@babylonjs/core");
      if (disposed) return;

      const engine = new B.Engine(canvasRef.current, true, { adaptToDeviceRatio: true });
      engineRef.current = engine;

      const scene = new B.Scene(engine);
      scene.clearColor   = new B.Color4(0, 0, 0.015, 1);
      scene.ambientColor = new B.Color3(0, 0, 0);
      scene.fogMode      = B.Scene.FOGMODE_EXP;
      scene.fogDensity   = 0.003;
      scene.fogColor     = new B.Color3(0, 0.008, 0.018);

      const glow = new B.GlowLayer("glow", scene);
      glow.intensity = 2.2;

      // Iluminación ambiental — azul fría tipo The Grid
      const ambL = new B.PointLight("ambL", B.Vector3.Zero(), scene);
      ambL.intensity = 2.8;
      ambL.diffuse   = new B.Color3(0, 0.85, 1);
      ambL.range     = 500;

      buildEnvironment(B, scene);
      const obstacles = buildObstacles(B, scene);

      // Material bala — compartido
      const bulletMat = neonMat(B, scene, "sharedBulletMat", 0, 0.97, 1);

      const getObstacleHit = (x, y, z, rad = 0) => {
        for (const o of obstacles) {
          if (Math.abs(x - o.x) > o.halfW + rad) continue;
          if (Math.abs(y - o.y) > o.halfH + rad) continue;
          if (Math.abs(z - o.z) > o.halfD + rad) continue;
          return o;
        }
        return null;
      };

      // ── Explosiones de datos ──────────────────────────────────────────
      const bursts = [];

      const spawnBurst = (pos, color, scale = 1, count = 20) => {
        const [r, g, b] = color;
        const burst = [];
        const mat = makeExplosionMat(B, scene, r, g, b);
        for (let i = 0; i < count; i++) {
          const piece = B.MeshBuilder.CreateBox(`exP_${Date.now()}_${i}`, {
            width:  (0.08 + Math.random() * 0.18) * scale,
            height: (0.1  + Math.random() * 0.3)  * scale,
            depth:  (0.03 + Math.random() * 0.1)  * scale,
          }, scene);
          piece.position = pos.clone();
          piece.rotation = new B.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
          );
          piece.material  = mat;
          piece.isPickable = false;
          const dir = new B.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 1.6 - 0.3,
            Math.random() * 2 - 1,
          ).normalize();
          burst.push({
            mesh: piece,
            vel:  dir.scale((14 + Math.random() * 20) * scale),
            spin: new B.Vector3(
              (Math.random() - 0.5) * 11,
              (Math.random() - 0.5) * 14,
              (Math.random() - 0.5) * 11,
            ),
            life: 0.4 + Math.random() * 0.6,
            mat,
          });
        }
        bursts.push(burst);
      };

      const updateBursts = (dt) => {
        for (let bi = bursts.length - 1; bi >= 0; bi--) {
          const burst = bursts[bi];
          for (let pi = burst.length - 1; pi >= 0; pi--) {
            const p = burst[pi];
            p.life -= dt;
            if (p.life <= 0) { p.mesh.dispose(); burst.splice(pi, 1); continue; }
            p.vel.y -= 22 * dt;
            p.mesh.position.addInPlace(p.vel.scale(dt));
            p.mesh.rotation.addInPlace(p.spin.scale(dt));
            if (p.mat) p.mat.alpha = Math.max(0, p.life / 0.95);
          }
          if (burst.length === 0) {
            bursts.splice(bi, 1);
          }
        }
      };

      // ── Spawn seguro ──────────────────────────────────────────────────
      const safeSpawn = (bx, by, bz, rad = 2.5) => {
        for (let a = 0; a < 16; a++) {
          const x = a === 0 ? bx : bx + (Math.random() - 0.5) * 100;
          const y = a === 0 ? by : by + (Math.random() - 0.5) * 40;
          const z = a === 0 ? bz : bz - Math.random() * 60;
          if (!getObstacleHit(x, y, z, rad)) return new B.Vector3(x, y, z);
        }
        return new B.Vector3(bx, by, bz);
      };

      // ── Jet del jugador ───────────────────────────────────────────────
      const playerJet = buildJet(B, scene, 0);
      playerJet.position = B.Vector3.Zero();

      const camPivot = new B.TransformNode("camPivot", scene);
      const camera   = new B.UniversalCamera("cam", new B.Vector3(0, 4.0, 10), scene);
      camera.parent  = camPivot;
      camera.setTarget(new B.Vector3(0, 0, -14));
      camera.fov  = 1.08;
      camera.minZ = 0.1;
      camera.maxZ = 900;

      const enemyBots = botsSnap.current.filter((b) => b.alive && b.hasTube);
      setTotalBots(enemyBots.length);
      aliveBotsRef.current = enemyBots.length;
      setAliveBots(enemyBots.length);

      const enemies = enemyBots.map((bot, i) => {
        const jet = buildJet(B, scene, i + 1);
        const ang = ((i / Math.max(enemyBots.length, 1)) - 0.5) * Math.PI * 1.3;
        jet.position = safeSpawn(Math.sin(ang) * 65, (Math.random() - 0.5) * 22, -90 - i * 18);
        jet.rotation.y = Math.PI;
        const [r, g, b_] = SLOT_COLORS[(i + 1) % SLOT_COLORS.length];
        return {
          jet, r, g, b: b_,
          alive: true,
          velX: 0, velY: 0,
          evadeTimer: Math.random() * 2.5,
          trailSegs: [],
          lastTrailPos: jet.position.clone().add(new B.Vector3(0, 0, 2.2)),
        };
      });

      // ── Balas ─────────────────────────────────────────────────────────
      const bullets  = [];
      let shootTimer = 0;
      let camKickback = 0;

      // DISPARO HACIA EL FRENTE
      // La dirección es `flight.forward` (hacia donde apunta la nariz)
      // Los pods de arma están delante del fuselaje (z negativa = frente)
      const fireBullet = (pos, dir, velInherit) => {
        const d = dir.clone().normalize();

        // Dos disparos — pod izquierdo y derecho
        const offsets = [
          new B.Vector3(-1.4, -0.06, 0),
          new B.Vector3( 1.4, -0.06, 0),
        ];

        offsets.forEach((localOffset, oi) => {
          // Transformar offset local al espacio mundo usando la orientación de la nave
          const frame = getFrame(B, jetYaw, jetPitch, jetRoll);
          const worldOffset = frame.right.scale(localOffset.x)
            .add(frame.up.scale(localOffset.y));

          const muzzle = pos.clone().add(worldOffset);

          const b_ = B.MeshBuilder.CreateBox(`bul_${Date.now()}_${oi}`, {
            width: 0.07, height: 0.07, depth: 1.6,
          }, scene);
          b_.position = muzzle.clone();

          // Orientar la bala hacia el frente
          const lookTarget = muzzle.clone().add(d.scale(10));
          b_.lookAt(lookTarget);

          b_.material  = bulletMat;
          b_.isPickable = false;

          // Velocidad = velocidad de la bala + herencia de movimiento de la nave
          const finalVel = d.scale(BULLET_SPEED).add(velInherit);

          bullets.push({ mesh: b_, vel: finalVel, life: BULLET_LIFE });
        });

        camKickback = 0.018;
      };

      // ── Estela ────────────────────────────────────────────────────────
      const trailCache = new Map();
      const getTrailMat = (r, g, b_) => {
        const key = `${r.toFixed(2)}_${g.toFixed(2)}_${b_.toFixed(2)}`;
        if (!trailCache.has(key)) {
          trailCache.set(key, neonMat(B, scene, `trailM_${key}`, r, g, b_, 0.75));
        }
        return trailCache.get(key);
      };

      const addTrail = (owner, p1, p2, upHint) => {
        const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 0.1) return;
        const [r, g, b_] = [owner.r ?? 0, owner.g ?? 0.97, owner.b ?? 1];
        const seg = B.MeshBuilder.CreateBox(`tr_${Date.now()}_${Math.random().toFixed(5)}`, {
          width: 0.10, height: 0.10, depth: len,
        }, scene);
        seg.position = new B.Vector3(
          (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2,
        );
        const dir = new B.Vector3(dx, dy, dz).normalize();
        const safeUp = (upHint && upHint.lengthSquared() > 1e-6)
          ? upHint.normalize() : B.Vector3.Up();
        seg.rotationQuaternion = B.Quaternion.FromLookDirectionLH(dir, safeUp);
        seg.material  = getTrailMat(r, g, b_);
        seg.isPickable = false;
        owner.trailSegs.push({ mesh: seg, born: performance.now() / 1000 });
      };

      // ── Estado de vuelo ───────────────────────────────────────────────
      let jetX = 0, jetY = 0, jetZ = 0;
      let jetVX = 0, jetVY = 0, jetVZ = 0;       // velocidad vectorial acumulada
      let jetYaw = 0, jetPitch = 0, jetRoll = 0;
      let jetYawVel = 0, jetPitchVel = 0;
      let jetThrottle = 0.60;
      let jetSpeed = 30;
      let gameTime = 0, gameDone = false;
      let killed = 0;

      const playerTrail = { r: 0, g: 0.97, b: 1, trailSegs: [] };
      let playerLastTrail = new B.Vector3(0, 0, 2.35);

      // ── Respawn ───────────────────────────────────────────────────────
      const respawnEnemy = (en) => {
        if (disposed || gameDone) return;
        const sp = safeSpawn(
          jetX + (Math.random() - 0.5) * 90,
          jetY + (Math.random() - 0.5) * 35,
          jetZ - 110 - Math.random() * 90,
        );
        en.alive = true;
        en.jet.setEnabled(true);
        en.jet.position.copyFrom(sp);
        en.jet.rotation.y = Math.PI;
        en.jet.rotation.x = 0;
        en.jet.rotation.z = 0;
        en.velX = (Math.random() - 0.5) * 22;
        en.velY = (Math.random() - 0.5) * 12;
        en.evadeTimer = 1 + Math.random() * 2;
        en.trailSegs  = [];
        en.lastTrailPos = sp.clone().add(new B.Vector3(0, 0, 2.2));
        aliveBotsRef.current = Math.min(enemyBots.length, aliveBotsRef.current + 1);
        setAliveBots(aliveBotsRef.current);
      };

      const crashEnemy = (en, pos, obs) => {
        if (!en.alive) return;
        en.alive = false;
        en.jet.setEnabled(false);
        en.trailSegs.forEach((s) => s.mesh.dispose());
        en.trailSegs = [];
        aliveBotsRef.current = Math.max(0, aliveBotsRef.current - 1);
        setAliveBots(aliveBotsRef.current);
        spawnBurst(pos, obs?.color ?? [0, 0.97, 1], 1, 24);
        safeTimeout(() => respawnEnemy(en), 4000);
      };

      const crashPlayer = (pos, obs) => {
        if (gameDone) return;
        gameDone = true;
        playerJet.setEnabled(false);
        playerTrail.trailSegs.forEach((s) => s.mesh.dispose());
        playerTrail.trailSegs = [];
        spawnBurst(pos, obs?.color ?? [0, 0.97, 1], 1.4, 32);
        setMessage("PROGRAMA DERREZADO");
        safeTimeout(() => onCompleteRef.current(true), 2200);
      };

      // ── Render loop ───────────────────────────────────────────────────
      scene.registerBeforeRender(() => {
        if (disposed) return;
        const dt  = Math.min(engine.getDeltaTime() * 0.001, 0.05);
        const now = performance.now() / 1000;

        if (gameDone) { updateBursts(dt); return; }

        gameTime += dt;

        const rem = Math.max(0, SURVIVE_TIME - gameTime);
        const ceil = Math.ceil(rem);
        if (timeLeftRef.current !== ceil) {
          timeLeftRef.current = ceil;
          setTimeLeft(ceil);
        }
        if (rem <= 0) {
          gameDone = true;
          setMessage("SISTEMA OPERATIVO - MISION COMPLETA");
          safeTimeout(() => onCompleteRef.current(false), 2200);
          return;
        }

        // ── Input ────────────────────────────────────────────────────
        const k = keys.current;
        const turnIn     = (k.turnLeft    ? 1 : 0) - (k.turnRight    ? 1 : 0);
        const pitchIn    = (k.pitchUp     ? 1 : 0) - (k.pitchDown    ? 1 : 0);
        const throttleIn = (k.throttleUp  ? 1 : 0) - (k.throttleDown ? 1 : 0);

        // ── Throttle y velocidad escalar ─────────────────────────────
        jetThrottle = B.Scalar.Clamp(
          jetThrottle + throttleIn * JET_THROTTLE_STEP * dt, 0, 1,
        );
        const targetSpeed = JET_MIN_SPEED + jetThrottle * (JET_MAX_SPEED - JET_MIN_SPEED);
        jetSpeed = B.Scalar.Lerp(jetSpeed, targetSpeed, dt * JET_SPEED_LERP);

        // ── Yaw / Pitch / Roll ───────────────────────────────────────
        const speedRatio    = B.Scalar.Clamp((jetSpeed - JET_MIN_SPEED) / (JET_MAX_SPEED - JET_MIN_SPEED), 0, 1);
        const turnAuthority = 0.50 + speedRatio * 0.50;

        jetYawVel   = B.Scalar.Lerp(jetYawVel,   -turnIn  * JET_YAW_RATE   * turnAuthority, dt * JET_TURN_LERP);
        jetPitchVel = B.Scalar.Lerp(jetPitchVel,  pitchIn * JET_PITCH_RATE * turnAuthority, dt * JET_TURN_LERP);
        jetYaw   += jetYawVel   * dt;
        jetPitch  = B.Scalar.Clamp(jetPitch + jetPitchVel * dt, -JET_MAX_PITCH, JET_MAX_PITCH);
        jetRoll   = B.Scalar.Lerp(jetRoll, -turnIn * JET_BANK_MAX * turnAuthority, dt * JET_BANK_LERP);

        const frame = getFrame(B, jetYaw, jetPitch, jetRoll);

        // ── Física vectorial acumulada ────────────────────────────────
        // Fuerza de empuje en dirección hacia donde apunta la nariz
        const thrustMag = jetSpeed;
        const targetVX  = frame.forward.x * thrustMag;
        const targetVY  = frame.forward.y * thrustMag;
        const targetVZ  = frame.forward.z * thrustMag;

        // Arrastre + gravedad
        jetVX = B.Scalar.Lerp(jetVX, targetVX, dt * JET_DRAG);
        jetVY = B.Scalar.Lerp(jetVY, targetVY - JET_GRAVITY * (1 - jetThrottle), dt * JET_DRAG);
        jetVZ = B.Scalar.Lerp(jetVZ, targetVZ, dt * JET_DRAG);

        jetX += jetVX * dt;
        jetY += jetVY * dt;
        jetZ += jetVZ * dt;

        // Límites con rebote suave
        if (jetX < -85) { jetX = -85; jetVX = Math.abs(jetVX) * 0.3; }
        if (jetX >  85) { jetX =  85; jetVX = -Math.abs(jetVX) * 0.3; }
        if (jetY < -45) { jetY = -45; jetVY = Math.abs(jetVY) * 0.3; }
        if (jetY >  65) { jetY =  65; jetVY = -Math.abs(jetVY) * 0.3; }
        if (jetZ < -2700) { jetZ = -2700; jetVZ = Math.abs(jetVZ) * 0.4; }
        if (jetZ >   45)  { jetZ =   45;  jetVZ = -Math.abs(jetVZ) * 0.4; }

        const pPos = new B.Vector3(jetX, jetY, jetZ);
        const obs  = getObstacleHit(jetX, jetY, jetZ, 2.6);
        if (obs) { crashPlayer(pPos, obs); return; }

        playerJet.position.copyFrom(pPos);
        playerJet.rotation.y = jetYaw;
        playerJet.rotation.x = jetPitch;
        playerJet.rotation.z = jetRoll;

        setSpeed(Math.round(Math.sqrt(jetVX * jetVX + jetVY * jetVY + jetVZ * jetVZ)));

        // Estela: origen en la tobera (trasera) — z positiva = trasero de la nave
        const trailOrigin = pPos.clone()
          .add(frame.forward.scale(-2.35))
          .add(frame.up.scale(0.10));

        // Cámara con retroceso de disparo
        camKickback = B.Scalar.Lerp(camKickback, 0, dt * 18);
        camPivot.position = new B.Vector3(
          B.Scalar.Lerp(camPivot.position.x, jetX, dt * CAM_LERP),
          B.Scalar.Lerp(camPivot.position.y, jetY, dt * CAM_LERP),
          B.Scalar.Lerp(camPivot.position.z, jetZ, dt * CAM_LERP),
        );
        camPivot.rotation.y = B.Scalar.Lerp(camPivot.rotation.y, jetYaw, dt * 7.5);
        camPivot.rotation.x = B.Scalar.Lerp(camPivot.rotation.x, jetPitch * 0.30 + camKickback, dt * 7.5);
        camPivot.rotation.z = B.Scalar.Lerp(camPivot.rotation.z, jetRoll * 0.15, dt * 5.0);
        ambL.position.copyFrom(pPos);

        if (B.Vector3.Distance(trailOrigin, playerLastTrail) > TRAIL_SEG_DIST) {
          addTrail(playerTrail, playerLastTrail, trailOrigin, frame.up);
          playerLastTrail = trailOrigin.clone();
        }
        for (let i = playerTrail.trailSegs.length - 1; i >= 0; i--) {
          if (now - playerTrail.trailSegs[i].born > TRAIL_LIFE) {
            playerTrail.trailSegs[i].mesh.dispose();
            playerTrail.trailSegs.splice(i, 1);
          }
        }

        // ── Disparo HACIA EL FRENTE ──────────────────────────────────
        // El muzzle está en la punta de los pods: frente de la nave = frame.forward
        shootTimer -= dt;
        if (k.shoot && shootTimer <= 0) {
          // Posición de boca de fuego = nariz de la nave + adelante
          const muzzleBase = pPos.clone()
            .add(frame.forward.scale(3.0))    // punta del nose (frente)
            .add(frame.up.scale(-0.06));

          // Velocidad heredada de la nave
          const velInherit = new B.Vector3(jetVX, jetVY, jetVZ);

          fireBullet(muzzleBase, frame.forward, velInherit);
          shootTimer = SHOOT_COOLDOWN;
        }

        // Actualizar balas — vuelan hacia el frente con gravedad leve
        for (let i = bullets.length - 1; i >= 0; i--) {
          const bul = bullets[i];
          bul.life -= dt;
          bul.vel.y -= 8 * dt;   // gravedad leve en el proyectil
          bul.mesh.position.addInPlace(bul.vel.scale(dt));

          if (bul.life <= 0) {
            bul.mesh.dispose();
            bullets.splice(i, 1);
            continue;
          }

          // Colisión bala con obstáculo
          const bObs = getObstacleHit(bul.mesh.position.x, bul.mesh.position.y, bul.mesh.position.z, 0.3);
          if (bObs) {
            spawnBurst(bul.mesh.position.clone(), bObs.color, 0.7, 10);
            bul.mesh.dispose();
            bullets.splice(i, 1);
            continue;
          }

          // Colisión bala con enemigos
          let hit = false;
          for (const en of enemies) {
            if (!en.alive) continue;
            if (B.Vector3.Distance(bul.mesh.position, en.jet.position) < HIT_RADIUS) {
              en.alive = false;
              en.jet.setEnabled(false);
              en.trailSegs.forEach((s) => { safeTimeout(() => s.mesh.dispose(), 1200); });
              en.trailSegs = [];
              bul.mesh.dispose();
              bullets.splice(i, 1);
              killed++;
              aliveBotsRef.current = Math.max(0, aliveBotsRef.current - 1);
              setKills(killed);
              setAliveBots(aliveBotsRef.current);
              setMessage("PROGRAMA DERREZADO");
              spawnBurst(en.jet.position.clone(), [en.r, en.g, en.b], 1.1, 26);
              safeTimeout(() => setMessage(""), 1200);
              safeTimeout(() => respawnEnemy(en), 5000);
              hit = true;
              break;
            }
          }
          if (hit) continue;
        }

        // ── IA enemiga ───────────────────────────────────────────────
        enemies.forEach((en) => {
          if (!en.alive) return;
          const pos      = en.jet.position;
          const eYaw     = en.jet.rotation.y;
          const eRoll    = en.jet.rotation.z;
          const eFwd     = new B.Vector3(Math.sin(eYaw), 0, -Math.cos(eYaw)).normalize();
          const eUp      = rotateAroundAxis(B, B.Vector3.Up(), eFwd, eRoll);
          const eTOrigin = pos.clone().add(eFwd.scale(-2.2)).add(eUp.scale(0.08));

          en.evadeTimer -= dt;
          if (en.evadeTimer <= 0) {
            en.evadeTimer = 1.0 + Math.random() * 2.2;
            en.velX = (pos.x - jetX) * 0.35 + (Math.random() - 0.5) * 32;
            en.velY = (pos.y - jetY) * 0.25 + (Math.random() - 0.5) * 16;
          }

          const nx = pos.x + en.velX * dt * 0.5;
          const ny = pos.y + en.velY * dt * 0.5;
          const nz = pos.z + jetSpeed * dt;
          const eObs = getObstacleHit(nx, ny, nz, 2.2);
          if (eObs) { crashEnemy(en, new B.Vector3(nx, ny, nz), eObs); return; }

          pos.x = nx; pos.y = ny; pos.z = nz;

          const dz = pos.z - jetZ;
          if (dz > 35 || dz < -320) {
            pos.x = jetX + (Math.random() - 0.5) * 75;
            pos.y = jetY + (Math.random() - 0.5) * 28;
            pos.z = jetZ - 100 - Math.random() * 90;
            en.velX = (Math.random() - 0.5) * 22;
            en.velY = (Math.random() - 0.5) * 12;
          }

          en.jet.rotation.y = B.Scalar.Lerp(
            en.jet.rotation.y, Math.PI + Math.atan2(en.velX, jetSpeed), dt * 3.2,
          );
          en.jet.rotation.z = B.Scalar.Lerp(en.jet.rotation.z, en.velX * 0.012, dt * 3.2);

          if (B.Vector3.Distance(eTOrigin, en.lastTrailPos) > TRAIL_SEG_DIST) {
            addTrail(en, en.lastTrailPos, eTOrigin, eUp);
            en.lastTrailPos = eTOrigin.clone();
          }
          for (let i = en.trailSegs.length - 1; i >= 0; i--) {
            if (now - en.trailSegs[i].born > TRAIL_LIFE) {
              en.trailSegs[i].mesh.dispose();
              en.trailSegs.splice(i, 1);
            }
          }
        });

        updateBursts(dt);
      });

      engine.runRenderLoop(() => { if (!disposed) scene.render(); });

      const onResize = () => engine.resize();
      resizeRef.current = onResize;
      window.addEventListener("resize", onResize);
    };

    init().catch(console.error);

    return () => {
      disposed = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (resizeRef.current) {
        window.removeEventListener("resize", resizeRef.current);
        resizeRef.current = null;
      }
      if (engineRef.current) {
        engineRef.current.stopRenderLoop();
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  // ── HUD ─────────────────────────────────────────────────────────────────
  const pct    = (timeLeft / SURVIVE_TIME) * 100;
  const danger = timeLeft <= 10;
  const tColor = danger ? "#ff6600" : C.cyan;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", outline: "none" }} />

      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0.10) 4px)",
      }} />

      {/* Viñeta */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.72) 100%)",
      }} />

      {/* Borde HUD superior */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 1, background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)`,
        opacity: 0.5, pointerEvents: "none",
      }} />

      {/* HUD */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "18px 28px", pointerEvents: "none",
      }}>
        {/* Izquierda */}
        <div style={{
          fontFamily: FONT_MONO, fontSize: "0.55rem",
          color: C.cyanDim, letterSpacing: "0.22em", lineHeight: 2.0,
          borderLeft: `1px solid ${C.cyanFaint}`, paddingLeft: 12,
        }}>
          <div style={{ color: C.cyan, fontSize: "0.48rem", marginBottom: 4 }}>THE GRID - COMBAT SECTOR</div>
          FASE 3 — COMBATE AEREO
          <br />
          <span style={{ color: C.orange }}>DERRIBOS: {kills}</span>
          <br />
          <span style={{ color: "rgba(0,247,255,0.5)" }}>VEL: {speed} u/s</span>
        </div>

        {/* Centro — timer */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: FONT_HEAD, fontSize: "2.6rem",
            color: tColor, textShadow: `0 0 28px ${tColor}, 0 0 60px ${tColor}44`,
            lineHeight: 1, letterSpacing: "0.08em",
          }}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
          </div>
          <div style={{
            marginTop: 8, width: 130, height: 2,
            background: "rgba(0,247,255,0.08)",
            borderRadius: 1, overflow: "hidden", margin: "8px auto 0",
          }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: `linear-gradient(90deg, ${tColor}88, ${tColor})`,
              boxShadow: `0 0 8px ${tColor}`,
              transition: "width 0.5s linear",
            }} />
          </div>
          <div style={{
            marginTop: 5, fontFamily: FONT_MONO,
            fontSize: "0.4rem", color: "rgba(0,247,255,0.3)",
            letterSpacing: "0.35em",
          }}>SUPERVIVENCIA</div>
        </div>

        {/* Derecha */}
        <div style={{
          fontFamily: FONT_MONO, fontSize: "0.55rem",
          textAlign: "right", color: C.whiteDim, letterSpacing: "0.15em", lineHeight: 2.0,
          borderRight: `1px solid ${C.cyanFaint}`, paddingRight: 12,
        }}>
          <div style={{ color: C.cyan, fontSize: "0.48rem", marginBottom: 4 }}>PROGRAMAS ACTIVOS</div>
          <span style={{
            fontFamily: FONT_HEAD, fontSize: "1.7rem",
            color: C.cyan, textShadow: `0 0 18px ${C.cyan}`,
          }}>{aliveBots}</span>
          <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.18)" }}>/{totalBots}</span>
        </div>
      </div>

      {/* Mira estilo Tron */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)", pointerEvents: "none",
      }}>
        {/* Cuadrado exterior */}
        <div style={{
          width: 38, height: 38,
          border: `1px solid rgba(0,247,255,0.25)`,
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%) rotate(45deg)",
        }} />
        {/* Cruces */}
        {[0, 90, 180, 270].map((deg) => (
          <div key={deg} style={{
            position: "absolute", top: "50%", left: "50%",
            width: 11, height: 1,
            background: `rgba(0,247,255,0.7)`,
            boxShadow: `0 0 4px ${C.cyan}`,
            transform: `translate(-50%,-50%) rotate(${deg}deg) translateX(22px)`,
          }} />
        ))}
        {/* Punto central */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 3, height: 3, borderRadius: "50%",
          background: C.cyan, boxShadow: `0 0 8px ${C.cyan}, 0 0 16px ${C.cyan}44`,
        }} />
      </div>

      {/* Mensaje central */}
      {message && (
        <div style={{
          position: "absolute", top: "36%", left: "50%",
          transform: "translateX(-50%)",
          fontFamily: FONT_HEAD, fontWeight: 900,
          fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)",
          color: message.includes("COMPLETA") ? C.cyan : C.orange,
          textShadow: message.includes("COMPLETA")
            ? `0 0 24px ${C.cyan}, 0 0 60px ${C.cyan}44`
            : `0 0 24px ${C.orange}, 0 0 60px ${C.orange}44`,
          letterSpacing: "0.18em", pointerEvents: "none",
          whiteSpace: "nowrap",
          animation: "none",
        }}>{message}</div>
      )}

      {/* Línea inferior HUD */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 1, background: `linear-gradient(90deg, transparent, ${C.cyan}44, transparent)`,
        pointerEvents: "none",
      }} />

      {/* Controles */}
      <div style={{
        position: "absolute", bottom: 16, left: "50%",
        transform: "translateX(-50%)",
        fontFamily: FONT_MONO, fontSize: "0.45rem",
        color: "rgba(0,247,255,0.25)", letterSpacing: "0.22em",
        pointerEvents: "none", whiteSpace: "nowrap",
      }}>
        W/S CABECEO &nbsp; A/D GUINAR &nbsp; Q/E POTENCIA &nbsp; ESPACIO DISPARAR
      </div>
    </div>
  );
}