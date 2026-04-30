"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../useGameStore";
import * as THREE from "three";

// ── Paleta ultra-realista ─────────────────────────────────────────────────────
const ASPHALT_BASE   = "#18181c";
const ASPHALT_MID    = "#222228";
const ASPHALT_PATCH  = "#2a2a32";
const LINE_YEL       = "#d4a800";
const LINE_YEL_FADE  = "#a07800";
const LINE_WHT       = "#cccccc";
const LINE_WHT_FADE  = "#777777";
const SHOULDER_DARK  = "#2e2e32";
const SHOULDER_LIGHT = "#38383e";
const GRASS_RICH     = "#2e6b28";
const GRASS_MID      = "#3a7230";
const GRASS_DRY      = "#6a8040";
const GRASS_DEAD     = "#8a9055";
const DIRT_COL       = "#7a6248";
const BARK_DARK      = "#3a2820";
const BARK_MID       = "#4e3828";
const LEAF_DARK      = "#1a4a1a";
const LEAF_MID       = "#235c23";
const LEAF_LIGHT     = "#2e7a2e";
const LEAF_YELLOW    = "#6a8c28";
const PINE_DARK      = "#0e3018";
const PINE_MID       = "#1a4822";
const PINE_LIGHT     = "#226030";
const SKY_ZENITH     = "#1e6bc8";
const SKY_MID        = "#4a9ee0";
const SKY_HOR        = "#8ecaee";
const SKY_LOW        = "#b8d8f0";
const CLOUD_BRIGHT   = "#ffffff";
const CLOUD_SHADOW   = "#d8e8f4";
const CLOUD_BASE     = "#c0d4e8";
const MOUNTAIN_FAR   = "#5a6878";
const MOUNTAIN_MID   = "#6a7a8a";
const MOUNTAIN_NEAR  = "#7a8a9a";
const MOUNTAIN_SNOW  = "#eef4f8";
const POLE_BASE      = "#70707e";
const POLE_MID       = "#888898";
const POLE_SHINE     = "#a0a0b0";
const LAMP_HOT       = "#fff8e0";
const LAMP_WARM      = "#ffe8a0";
const ROCK_DARK      = "#484858";
const ROCK_MID       = "#585868";
const ROCK_LIGHT     = "#686878";
const SUN_COL        = "#fff5c0";
const SUN_HALO       = "#ffeea0";
const CURB_TOP       = "#c8c8cc";
const CURB_FACE      = "#a0a0a8";

// ── Dimensiones de carretera ──────────────────────────────────────────────────
const ROAD_W         = 14;
const ROAD_L         = 2400;
const ROAD_BACK_EXT  = 500;
const ROAD_TOTAL_L   = ROAD_L + ROAD_BACK_EXT;
const ROAD_Z_CENTER  = (-ROAD_L + ROAD_BACK_EXT) / 2;
const SHOULDER_W     = 3.5;

// ── Marcas viales ─────────────────────────────────────────────────────────────
const DASH_LEN       = 4;
const DASH_GAP       = 6;
const DASH_CYCLE     = DASH_LEN + DASH_GAP;
const DASH_COUNT     = 55;

// ── Postes ────────────────────────────────────────────────────────────────────
const POLE_SPACING   = 40;
const POLE_COUNT     = 24;

// ── Árboles ───────────────────────────────────────────────────────────────────
const TREE_COUNT     = 30;
const TREE_SPACING   = 20;

// ── Nubes ─────────────────────────────────────────────────────────────────────
const CLOUD_COUNT    = 14;
const CLOUD_RECYCLE  = 350;

// ── Shader de asfalto procedural ──────────────────────────────────────────────
const asphaltVertexShader = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv  = uv;
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const asphaltFragShader = `
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float uTime;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.50 * noise(p);
    v += 0.25 * noise(p * 2.1 + vec2(3.7, 1.9));
    v += 0.12 * noise(p * 4.3 + vec2(1.3, 8.2));
    v += 0.06 * noise(p * 8.7 + vec2(5.1, 2.4));
    return v;
  }

  void main() {
    vec2 uv = vUv;

    // Base asfalto con variacion granulada
    float base = fbm(uv * vec2(8.0, 120.0));
    vec3 col = mix(vec3(0.094, 0.094, 0.106), vec3(0.130, 0.130, 0.148), base);

    // Parches de reparacion (zonas mas claras rectangulares)
    float patchA = step(0.42, fract(uv.y * 14.0 + 0.1)) * step(0.0, uv.x - 0.22) * step(uv.x, 0.78);
    float patchB = step(0.71, fract(uv.y * 9.0  + 0.6)) * step(0.0, uv.x - 0.35) * step(uv.x, 0.65);
    col = mix(col, vec3(0.155, 0.155, 0.172), patchA * 0.4 + patchB * 0.3);

    // Tracks de neumaticos (bandas oscuras)
    float trackLeft  = smoothstep(0.02, 0.0, abs(uv.x - 0.28));
    float trackRight = smoothstep(0.02, 0.0, abs(uv.x - 0.72));
    col = mix(col, vec3(0.06, 0.06, 0.07), (trackLeft + trackRight) * 0.5);

    // Manchas de aceite
    float oilX = fract(uv.x * 3.0 + 0.4);
    float oilY = fract(uv.y * 40.0 + 0.2);
    float oil  = smoothstep(0.45, 0.35, length(vec2(oilX - 0.5, oilY - 0.5) * vec2(1.0, 0.5)));
    col = mix(col, vec3(0.05, 0.04, 0.06), oil * 0.35);

    // Grietas finas
    float crackH = step(0.98, noise(uv * vec2(1.5, 60.0)));
    float crackV = step(0.97, noise(uv * vec2(40.0, 1.5) + 9.3));
    col = mix(col, vec3(0.03, 0.03, 0.04), (crackH + crackV) * 0.8);

    // Humedad/destellos en los picos del granulado
    float spec = pow(noise(uv * 22.0), 6.0) * 0.15;
    col += spec;

    // Degradado de profundidad (fog por shader)
    float depthFade = clamp(uv.y * 1.4, 0.0, 1.0);
    col = mix(col, vec3(0.14, 0.14, 0.16), depthFade * 0.55);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Shader de hierba procedural ───────────────────────────────────────────────
const grassVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const grassFragShader = `
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.50 * noise(p);
    v += 0.25 * noise(p * 2.0 + vec2(1.8, 9.2));
    v += 0.12 * noise(p * 4.2 + vec2(7.3, 2.1));
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float n = fbm(uv * vec2(12.0, 80.0));

    // Paleta de hierba
    vec3 richGrass = vec3(0.18, 0.42, 0.16);
    vec3 midGrass  = vec3(0.23, 0.45, 0.19);
    vec3 dryGrass  = vec3(0.42, 0.50, 0.25);
    vec3 deadGrass = vec3(0.54, 0.56, 0.33);
    vec3 dirt      = vec3(0.48, 0.38, 0.28);

    vec3 col = mix(richGrass, midGrass, n);
    float dry  = noise(uv * vec2(3.5, 20.0) + 4.7);
    float dead = noise(uv * vec2(2.0, 12.0) + 8.3);
    col = mix(col, dryGrass,  smoothstep(0.55, 0.80, dry)  * 0.7);
    col = mix(col, deadGrass, smoothstep(0.70, 0.90, dead) * 0.4);
    col = mix(col, dirt,      smoothstep(0.82, 0.95, dead) * 0.3);

    // Variacion de luminosidad fina
    col += (n - 0.5) * 0.06;

    // Fog de distancia
    float depthFade = clamp(uv.y * 1.2, 0.0, 1.0);
    col = mix(col, vec3(0.52, 0.66, 0.76), depthFade * 0.45);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Materiales memoizados ─────────────────────────────────────────────────────
function useAsphaltMaterial() {
  return useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   asphaltVertexShader,
    fragmentShader: asphaltFragShader,
    uniforms:       { uTime: { value: 0 } },
  }), []);
}

function useGrassMaterial() {
  return useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   grassVertexShader,
    fragmentShader: grassFragShader,
  }), []);
}

// ─────────────────────────────────────────────────────────────────────────────
// PINO REALISTA (4 capas de follaje, tronco ahusado)
// ─────────────────────────────────────────────────────────────────────────────
function PineTree({ position, scale = 1, lean = 0 }) {
  const leanRad = (lean * Math.PI) / 180;
  return (
    <group position={position} scale={scale} rotation={[leanRad, Math.random() * Math.PI * 2, 0]}>
      {/* Raices */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3]} rotation={[0, 0, Math.cos(a) * 0.4]}>
            <cylinderGeometry args={[0.04, 0.12, 0.5, 4]} />
            <meshLambertMaterial color={BARK_DARK} />
          </mesh>
        );
      })}
      {/* Tronco ahusado */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.12, 0.32, 4.4, 6]} />
        <meshLambertMaterial color={BARK_DARK} />
      </mesh>
      {/* Detalle corteza */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.22, 0.30, 1.2, 6]} />
        <meshLambertMaterial color={BARK_MID} />
      </mesh>
      {/* Capa 1 - base ancha */}
      <mesh position={[0, 2.8, 0]}>
        <coneGeometry args={[2.6, 2.8, 7]} />
        <meshLambertMaterial color={PINE_DARK} />
      </mesh>
      {/* Capa 2 */}
      <mesh position={[0, 4.2, 0]}>
        <coneGeometry args={[2.1, 2.6, 7]} />
        <meshLambertMaterial color={PINE_MID} />
      </mesh>
      {/* Capa 3 */}
      <mesh position={[0, 5.5, 0]}>
        <coneGeometry args={[1.55, 2.4, 7]} />
        <meshLambertMaterial color={PINE_LIGHT} />
      </mesh>
      {/* Capa 4 - punta */}
      <mesh position={[0, 6.7, 0]}>
        <coneGeometry args={[0.95, 2.2, 6]} />
        <meshLambertMaterial color={PINE_MID} />
      </mesh>
      {/* Aguja terminal */}
      <mesh position={[0, 8.2, 0]}>
        <coneGeometry args={[0.22, 1.2, 5]} />
        <meshLambertMaterial color={PINE_DARK} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARBOL CADUCO REALISTA (roble/castaño, ramas ramificadas)
// ─────────────────────────────────────────────────────────────────────────────
function OakTree({ position, scale = 1 }) {
  const angle = useMemo(() => Math.random() * Math.PI * 2, []);
  return (
    <group position={position} scale={scale} rotation={[0, angle, 0]}>
      {/* Tronco principal */}
      <mesh position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.22, 0.45, 5.6, 7]} />
        <meshLambertMaterial color={BARK_DARK} />
      </mesh>
      {/* Detalle corteza */}
      <mesh position={[0.05, 1.6, 0.08]}>
        <cylinderGeometry args={[0.30, 0.42, 2.0, 6]} />
        <meshLambertMaterial color={BARK_MID} />
      </mesh>
      {/* Ramas principales */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a  = (i / 5) * Math.PI * 2;
        const tilt = 0.5 + Math.random() * 0.3;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.0, 5.5, Math.sin(a) * 1.0]}
            rotation={[Math.cos(a) * tilt, a, Math.sin(a) * tilt]}
          >
            <cylinderGeometry args={[0.05, 0.14, 2.2, 5]} />
            <meshLambertMaterial color={BARK_MID} />
          </mesh>
        );
      })}
      {/* Copa principal - capa interior densa */}
      <mesh position={[0, 7.2, 0]}>
        <sphereGeometry args={[2.8, 8, 6]} />
        <meshLambertMaterial color={LEAF_DARK} />
      </mesh>
      {/* Copa - capa media */}
      <mesh position={[0.4, 7.8, 0.3]}>
        <sphereGeometry args={[2.4, 7, 5]} />
        <meshLambertMaterial color={LEAF_MID} />
      </mesh>
      {/* Copa - lóbulos laterales */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.8, 6.8 + Math.random() * 0.8, Math.sin(a) * 1.8]}>
            <sphereGeometry args={[1.6 + Math.random() * 0.5, 6, 5]} />
            <meshLambertMaterial color={i % 2 === 0 ? LEAF_LIGHT : LEAF_DARK} />
          </mesh>
        );
      })}
      {/* Copa - toques de amarillo otoñal */}
      <mesh position={[-0.6, 8.4, 0.5]}>
        <sphereGeometry args={[1.1, 5, 4]} />
        <meshLambertMaterial color={LEAF_YELLOW} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATORRAL/ARBUSTO
// ─────────────────────────────────────────────────────────────────────────────
function Bush({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[1.0, 6, 4]} />
        <meshLambertMaterial color={LEAF_DARK} />
      </mesh>
      <mesh position={[0.6, 0.35, 0.2]}>
        <sphereGeometry args={[0.7, 5, 4]} />
        <meshLambertMaterial color={LEAF_MID} />
      </mesh>
      <mesh position={[-0.5, 0.4, 0.1]}>
        <sphereGeometry args={[0.65, 5, 4]} />
        <meshLambertMaterial color={PINE_DARK} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROCA REALISTA (varias caras)
// ─────────────────────────────────────────────────────────────────────────────
function Rock({ position, scale = 1, rotation = [0, 0, 0] }) {
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshLambertMaterial color={ROCK_MID} />
      </mesh>
      <mesh position={[0.3, -0.2, 0.2]} scale={[0.6, 0.5, 0.7]}>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshLambertMaterial color={ROCK_DARK} />
      </mesh>
      {/* Destello superior */}
      <mesh position={[0, 0.7, 0]} scale={[0.5, 0.15, 0.5]}>
        <sphereGeometry args={[0.5, 5, 3]} />
        <meshLambertMaterial color={ROCK_LIGHT} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTE DE LUZ — CUELLO DE GANSO REALISTA (sin guardarraíl)
// ─────────────────────────────────────────────────────────────────────────────
function LampPost({ position, side = 1 }) {
  const s = side;   // 1 = derecho, -1 = izquierdo
  return (
    <group position={position}>
      {/* Base / plinto */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.24, 6]} />
        <meshLambertMaterial color={ROCK_DARK} />
      </mesh>
      {/* Fuste inferior grueso */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.10, 0.18, 4.8, 7]} />
        <meshLambertMaterial color={POLE_BASE} />
      </mesh>
      {/* Fuste superior */}
      <mesh position={[0, 5.8, 0]}>
        <cylinderGeometry args={[0.07, 0.10, 2.4, 6]} />
        <meshLambertMaterial color={POLE_MID} />
      </mesh>
      {/* Cuello curvado seg 1 (diagonal) */}
      <mesh
        position={[s * 0.5, 7.3, 0]}
        rotation={[0, 0, s * (-Math.PI / 5)]}
      >
        <cylinderGeometry args={[0.055, 0.07, 1.5, 5]} />
        <meshLambertMaterial color={POLE_MID} />
      </mesh>
      {/* Cuello curvado seg 2 (más horizontal) */}
      <mesh
        position={[s * 1.4, 7.7, 0]}
        rotation={[0, 0, s * (-Math.PI / 2.8)]}
      >
        <cylinderGeometry args={[0.05, 0.055, 1.2, 5]} />
        <meshLambertMaterial color={POLE_MID} />
      </mesh>
      {/* Codo final curvo */}
      <mesh position={[s * 2.0, 7.5, 0]}>
        <torusGeometry args={[0.28, 0.045, 5, 8, Math.PI / 2]} />
        <meshLambertMaterial color={POLE_MID} />
      </mesh>
      {/* Cabezal de la luminaria */}
      <mesh position={[s * 2.35, 7.3, 0]}>
        <cylinderGeometry args={[0.20, 0.16, 0.55, 7]} />
        <meshLambertMaterial color={POLE_BASE} />
      </mesh>
      {/* Visera anti-deslumbramiento */}
      <mesh position={[s * 2.35, 7.56, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 7]} />
        <meshLambertMaterial color={POLE_SHINE} />
      </mesh>
      {/* Difusor LED encendido */}
      <mesh position={[s * 2.35, 7.04, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 7]} />
        <meshBasicMaterial color={LAMP_HOT} />
      </mesh>
      {/* Halo suave */}
      <mesh position={[s * 2.35, 7.02, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.02, 7]} />
        <meshBasicMaterial color={LAMP_WARM} transparent opacity={0.45} />
      </mesh>
      {/* Cable de alimentacion (baja del poste) */}
      <mesh position={[s * 1.1, 7.3, 0]} rotation={[0, 0, s * 0.6]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 3]} />
        <meshLambertMaterial color="#333338" />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NUBE VOLUMETRICA (7 blobs con opacidad diferenciada)
// ─────────────────────────────────────────────────────────────────────────────
function Cloud({ position }) {
  return (
    <group position={position}>
      {/* Nucleo central */}
      <mesh>
        <sphereGeometry args={[4.2, 7, 5]} />
        <meshBasicMaterial color={CLOUD_BRIGHT} transparent opacity={0.92} />
      </mesh>
      {/* Lobulos superiores */}
      <mesh position={[2.8, 1.4, 0.3]}>
        <sphereGeometry args={[2.8, 6, 5]} />
        <meshBasicMaterial color={CLOUD_BRIGHT} transparent opacity={0.88} />
      </mesh>
      <mesh position={[-3.0, 1.0, -0.2]}>
        <sphereGeometry args={[2.4, 6, 4]} />
        <meshBasicMaterial color={CLOUD_BRIGHT} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0.5, 2.4, 0]}>
        <sphereGeometry args={[2.0, 5, 4]} />
        <meshBasicMaterial color={CLOUD_BRIGHT} transparent opacity={0.80} />
      </mesh>
      {/* Bordes extendidos */}
      <mesh position={[5.0, 0.2, 0.5]}>
        <sphereGeometry args={[1.8, 5, 4]} />
        <meshBasicMaterial color={CLOUD_SHADOW} transparent opacity={0.70} />
      </mesh>
      <mesh position={[-5.2, -0.3, 0]}>
        <sphereGeometry args={[1.6, 5, 4]} />
        <meshBasicMaterial color={CLOUD_SHADOW} transparent opacity={0.65} />
      </mesh>
      {/* Base oscurecida (sombra propia) */}
      <mesh position={[0, -1.8, 0]} scale={[1.1, 0.35, 1.0]}>
        <sphereGeometry args={[4.0, 7, 4]} />
        <meshBasicMaterial color={CLOUD_BASE} transparent opacity={0.40} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCO SOLAR CON HALO
// ─────────────────────────────────────────────────────────────────────────────
function Sun({ position }) {
  return (
    <group position={position}>
      {/* Halo exterior grande */}
      <mesh>
        <circleGeometry args={[12, 20]} />
        <meshBasicMaterial color={SUN_HALO} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Halo medio */}
      <mesh>
        <circleGeometry args={[7, 18]} />
        <meshBasicMaterial color={SUN_HALO} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Disco solar */}
      <mesh>
        <circleGeometry args={[4.2, 24]} />
        <meshBasicMaterial color={SUN_COL} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function RealWorldLandscape() {
  const treeGroupRef  = useRef();
  const poleGroupRef  = useRef();
  const cloudGroupRef = useRef();
  const dashGroupRef  = useRef();
  const skyRef        = useRef();
  const asphaltMat    = useAsphaltMaterial();
  const grassMat      = useGrassMaterial();

  // ── Arboles: mix de pinos y robles ─────────────────────────────────────────
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const z      = -i * TREE_SPACING;
      const scale  = 0.75 + Math.random() * 0.60;
      const jitterR = 3.5 + Math.random() * 5;
      const jitterL = 3.5 + Math.random() * 5;
      const typeR  = Math.random() > 0.45 ? "pine" : "oak";
      const typeL  = Math.random() > 0.45 ? "pine" : "oak";
      const leanR  = (Math.random() - 0.5) * 4;
      const leanL  = (Math.random() - 0.5) * 4;
      arr.push({
        id: `r${i}`,
        position: [ROAD_W / 2 + SHOULDER_W + jitterR, 0, z],
        scale,
        type: typeR,
        lean: leanR,
      });
      arr.push({
        id: `l${i}`,
        position: [-(ROAD_W / 2 + SHOULDER_W + jitterL), 0, z],
        scale,
        type: typeL,
        lean: leanL,
      });
    }
    return arr;
  }, []);

  // ── Arbustos de berma ───────────────────────────────────────────────────────
  const bushes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 18; i++) {
      const z     = -i * 28 - 10;
      const scale = 0.5 + Math.random() * 0.5;
      arr.push({ id: `br${i}`, position: [ROAD_W / 2 + SHOULDER_W + 1.0 + Math.random() * 2, 0, z], scale });
      arr.push({ id: `bl${i}`, position: [-(ROAD_W / 2 + SHOULDER_W + 1.0 + Math.random() * 2), 0, z], scale });
    }
    return arr;
  }, []);

  // ── Rocas dispersas ─────────────────────────────────────────────────────────
  const rocks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 14; i++) {
      const z = -i * 38 - 15;
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = ROAD_W / 2 + SHOULDER_W + 0.5 + Math.random() * 8;
      arr.push({
        id: `rock${i}`,
        position: [side * dist, 0, z],
        scale: 0.4 + Math.random() * 0.7,
        rotation: [0, Math.random() * Math.PI, Math.random() * 0.3],
      });
    }
    return arr;
  }, []);

  // ── Postes de luz (alternados lado a lado) ──────────────────────────────────
  const poles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < POLE_COUNT; i++) {
      const z = -i * POLE_SPACING;
      arr.push({
        id:       `pr${i}`,
        position: [ROAD_W / 2 + SHOULDER_W - 0.3, 0, z],
        side:     1,
      });
      const zL = -(i * POLE_SPACING + POLE_SPACING / 2);
      arr.push({
        id:       `pl${i}`,
        position: [-(ROAD_W / 2 + SHOULDER_W - 0.3), 0, zL],
        side:     -1,
      });
    }
    return arr;
  }, []);

  // ── Trazos discontinuos de carril ───────────────────────────────────────────
  const dashPositions = useMemo(() => {
    const arr = [];
    const xOffsets = [-ROAD_W / 6, ROAD_W / 6];
    for (const xOff of xOffsets) {
      for (let i = 0; i < DASH_COUNT; i++) {
        arr.push({ id: `d${xOff}_${i}`, x: xOff, z: -i * DASH_CYCLE });
      }
    }
    return arr;
  }, []);

  // ── Nubes ────────────────────────────────────────────────────────────────────
  const clouds = useMemo(() =>
    Array.from({ length: CLOUD_COUNT }, (_, i) => ({
      id: i,
      x:  (Math.random() - 0.5) * 200,
      y:  30 + Math.random() * 22,
      z:  -i * (ROAD_L / CLOUD_COUNT) + Math.random() * 40,
    }))
  , []);

  // ── Montanas en capas (fondo + medio) ───────────────────────────────────────
  const mountainsFar = useMemo(() => [
    { x: -220, z: -380, r: 42, h: 78, sides: 5, snow: true },
    { x: -140, z: -360, r: 36, h: 62, sides: 5, snow: true },
    { x:  -70, z: -370, r: 30, h: 55, sides: 5, snow: false },
    { x:   50, z: -375, r: 34, h: 60, sides: 5, snow: true },
    { x:  130, z: -360, r: 38, h: 66, sides: 5, snow: true },
    { x:  210, z: -390, r: 44, h: 80, sides: 5, snow: true },
  ], []);

  const mountainsMid = useMemo(() => [
    { x: -170, z: -240, r: 28, h: 44, sides: 5 },
    { x:  -90, z: -230, r: 22, h: 36, sides: 5 },
    { x:   20, z: -245, r: 24, h: 40, sides: 5 },
    { x:  110, z: -235, r: 26, h: 42, sides: 5 },
    { x:  185, z: -250, r: 30, h: 48, sides: 5 },
  ], []);

  // ── Animacion por frame ──────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const { speed, isPaused } = useGameStore.getState();

    // El cielo sigue a la camara
    if (skyRef.current) {
      skyRef.current.position.copy(state.camera.position);
    }

    if (isPaused) return;

    const dz = speed * delta;

    if (treeGroupRef.current) {
      treeGroupRef.current.position.z += dz;
      if (treeGroupRef.current.position.z > TREE_SPACING)
        treeGroupRef.current.position.z -= TREE_SPACING;
    }

    if (poleGroupRef.current) {
      poleGroupRef.current.position.z += dz;
      if (poleGroupRef.current.position.z > POLE_SPACING)
        poleGroupRef.current.position.z -= POLE_SPACING;
    }

    if (dashGroupRef.current) {
      dashGroupRef.current.position.z += dz;
      if (dashGroupRef.current.position.z > DASH_CYCLE)
        dashGroupRef.current.position.z -= DASH_CYCLE;
    }

    if (cloudGroupRef.current) {
      cloudGroupRef.current.position.z += dz * 0.05;
      cloudGroupRef.current.position.x += delta * 0.28;
      if (cloudGroupRef.current.position.z > CLOUD_RECYCLE)
        cloudGroupRef.current.position.z = 0;
    }
  });

  return (
    <>
      {/* ── Niebla atmosferica ── */}
      <fog attach="fog" args={["#c0d8f0", 120, 520]} />

      {/* ═══ CIELO MULTICAPA ═══ */}
      <group ref={skyRef}>
        {/* Domo zenital */}
        <mesh>
          <sphereGeometry args={[500, 28, 14]} />
          <meshBasicMaterial color={SKY_ZENITH} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        {/* Capa media */}
        <mesh>
          <sphereGeometry args={[498, 24, 10]} />
          <meshBasicMaterial color={SKY_MID} side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} />
        </mesh>
        {/* Banda del horizonte */}
        <mesh>
          <cylinderGeometry args={[494, 494, 130, 28, 1, true]} />
          <meshBasicMaterial color={SKY_HOR} side={THREE.BackSide} transparent opacity={0.60} depthWrite={false} />
        </mesh>
        {/* Zona baja (caldea el horizonte) */}
        <mesh rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[496, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3.5]} />
          <meshBasicMaterial color={SKY_LOW} side={THREE.BackSide} transparent opacity={0.50} depthWrite={false} />
        </mesh>
        {/* Disco solar con halo */}
        <group position={[80, 130, -450]} rotation={[0, 0, 0]}>
          <Sun position={[0, 0, 0]} />
        </group>
      </group>

      {/* ═══ MONTANAS LEJANAS ═══ */}
      {mountainsFar.map((m, i) => (
        <group key={`mf${i}`} position={[m.x, 10, m.z]}>
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[m.r, m.h, m.sides]} />
            <meshLambertMaterial color={MOUNTAIN_FAR} />
          </mesh>
          {m.snow && (
            <mesh position={[0, m.h * 0.32, 0]}>
              <coneGeometry args={[m.r * 0.35, m.h * 0.36, m.sides]} />
              <meshLambertMaterial color={MOUNTAIN_SNOW} />
            </mesh>
          )}
        </group>
      ))}

      {/* ═══ MONTANAS MEDIAS ═══ */}
      {mountainsMid.map((m, i) => (
        <mesh key={`mm${i}`} position={[m.x, 4, m.z]}>
          <coneGeometry args={[m.r, m.h, m.sides]} />
          <meshLambertMaterial color={MOUNTAIN_MID} />
        </mesh>
      ))}

      {/* ═══ NUBES ═══ */}
      <group ref={cloudGroupRef}>
        {clouds.map((c) => (
          <Cloud key={c.id} position={[c.x, c.y, c.z]} />
        ))}
      </group>

      {/* ═══ PLANO BLOQUEADOR BASE ═══ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshBasicMaterial color={ASPHALT_BASE} />
      </mesh>

      {/* ═══ GRUPO CARRETERA COMPLETO ═══ */}
      <group>

        {/* ── Hierba procedural ── */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, ROAD_Z_CENTER]}>
          <planeGeometry args={[700, ROAD_TOTAL_L]} />
          <primitive object={grassMat} attach="material" />
        </mesh>

        {/* ── Berma derecha (zona de transicion asfalto->hierba) ── */}
        {[-1, 1].map((side) => (
          <mesh
            key={`sh${side}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[side * (ROAD_W / 2 + SHOULDER_W / 2), 0.003, ROAD_Z_CENTER]}
          >
            <planeGeometry args={[SHOULDER_W, ROAD_TOTAL_L]} />
            <meshLambertMaterial color={SHOULDER_DARK} />
          </mesh>
        ))}

        {/* ── Franja de tierra sucia junto al asfalto ── */}
        {[-1, 1].map((side) => (
          <mesh
            key={`dirt${side}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[side * (ROAD_W / 2 + SHOULDER_W - 0.4), 0.004, ROAD_Z_CENTER]}
          >
            <planeGeometry args={[0.6, ROAD_TOTAL_L]} />
            <meshLambertMaterial color={DIRT_COL} />
          </mesh>
        ))}

        {/* ── Asfalto procedural (ShaderMaterial) ── */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, ROAD_Z_CENTER]}>
          <planeGeometry args={[ROAD_W, ROAD_TOTAL_L]} args2={[1, 1]} />
          <primitive object={asphaltMat} attach="material" />
        </mesh>

        {/* ── Bordillo 3D superior ── */}
        {[-1, 1].map((side) => (
          <mesh
            key={`ct${side}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[side * (ROAD_W / 2 - 0.14), 0.010, ROAD_Z_CENTER]}
          >
            <planeGeometry args={[0.28, ROAD_TOTAL_L]} />
            <meshLambertMaterial color={CURB_TOP} />
          </mesh>
        ))}
        {/* Cara vertical del bordillo */}
        {[-1, 1].map((side) => (
          <mesh
            key={`cv${side}`}
            position={[side * (ROAD_W / 2 + 0.02), 0.06, ROAD_Z_CENTER]}
          >
            <planeGeometry args={[ROAD_TOTAL_L, 0.14]} />
            <meshLambertMaterial color={CURB_FACE} side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* ── Doble linea amarilla central ── */}
        {[-0.20, 0.20].map((x) => (
          <mesh key={`yc${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, ROAD_Z_CENTER]}>
            <planeGeometry args={[0.12, ROAD_TOTAL_L]} />
            <meshLambertMaterial color={LINE_YEL} />
          </mesh>
        ))}
        {/* Linea desgastada entre las dos amarillas */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, ROAD_Z_CENTER]}>
          <planeGeometry args={[0.32, ROAD_TOTAL_L]} />
          <meshLambertMaterial color={LINE_YEL_FADE} transparent opacity={0.18} />
        </mesh>

        {/* ── Lineas blancas de borde de carril (continuas) ── */}
        {[-1, 1].map((side) => (
          <mesh
            key={`lw${side}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[side * (ROAD_W / 2 - 0.55), 0.011, ROAD_Z_CENTER]}
          >
            <planeGeometry args={[0.16, ROAD_TOTAL_L]} />
            <meshLambertMaterial color={LINE_WHT} />
          </mesh>
        ))}

        {/* ── Trazos discontinuos de carril (animados) ── */}
        <group ref={dashGroupRef}>
          {dashPositions.map((d) => (
            <mesh
              key={d.id}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[d.x, 0.011, d.z]}
            >
              <planeGeometry args={[0.14, DASH_LEN]} />
              <meshBasicMaterial color={LINE_WHT_FADE} />
            </mesh>
          ))}
        </group>

        {/* ── Rocas dispersas ── */}
        {rocks.map((r) => (
          <Rock key={r.id} position={r.position} scale={r.scale} rotation={r.rotation} />
        ))}

        {/* ── Arbustos de berma ── */}
        {bushes.map((b) => (
          <Bush key={b.id} position={b.position} scale={b.scale} />
        ))}

        {/* ── Arboles (se reciclan) ── */}
        <group ref={treeGroupRef}>
          {trees.map((t) =>
            t.type === "pine" ? (
              <PineTree key={t.id} position={t.position} scale={t.scale} lean={t.lean} />
            ) : (
              <OakTree key={t.id} position={t.position} scale={t.scale} />
            )
          )}
        </group>

        {/* ── Postes de luz con cuello de ganso (se reciclan) ── */}
        <group ref={poleGroupRef}>
          {poles.map((p) => (
            <LampPost key={p.id} position={p.position} side={p.side} />
          ))}
        </group>

      </group>

      {/* ═══ ILUMINACION FISICA ═══ */}
      {/* Sol principal (alta intensidad, angulo de tarde) */}
      <directionalLight
        position={[60, 80, 30]}
        intensity={2.2}
        color="#fff5d8"
        castShadow={false}
      />
      {/* Relleno de cielo azulado (opuesto al sol) */}
      <directionalLight
        position={[-40, 30, -20]}
        intensity={0.55}
        color="#a0c8f0"
      />
      {/* Luz ambiental calida */}
      <ambientLight intensity={0.60} color="#ffe8cc" />
      {/* Hemisferica cielo/tierra */}
      <hemisphereLight
        skyColor={SKY_MID}
        groundColor={GRASS_MID}
        intensity={0.50}
      />
    </>
  );
}