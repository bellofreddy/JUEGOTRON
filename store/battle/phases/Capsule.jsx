// Capsule.jsx — Caída cinemática en Babylon.js
// Negro absoluto + grid cyan + partículas — mismo universo que Phase1/Phase2
"use client";
import React, { useEffect, useRef } from "react";

export default function CapsulePhase({ onLand }) {
  const canvasRef  = useRef(null);
  const engineRef  = useRef(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = React.useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;

    const init = async () => {
      const BABYLON = await import("@babylonjs/core");

      // ── Motor ──────────────────────────────────────────────────
      const engine = new BABYLON.Engine(canvasRef.current, true, {
        preserveDrawingBuffer: true,
        stencil: false,
        adaptToDeviceRatio: true,
      });
      engineRef.current = engine;

      // ── Escena — negro absoluto ─────────────────────────────────
      const scene = new BABYLON.Scene(engine);
      scene.clearColor   = new BABYLON.Color4(0, 0, 0, 1);
      scene.ambientColor = new BABYLON.Color3(0, 0, 0);

      // ── Cámara fija — primera persona cayendo ──────────────────
      const camera = new BABYLON.UniversalCamera("cam",
        new BABYLON.Vector3(0, 0, 0), scene);
      camera.setTarget(new BABYLON.Vector3(0, -1, 0)); // mirando hacia abajo
      camera.fov  = 1.2;
      camera.minZ = 0.01;
      camera.maxZ = 300;

      // ── GLOW ───────────────────────────────────────────────────
      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = 2.0;

      // ── ILUMINACIÓN — solo luz puntual cyan desde abajo ────────
      const gridLight = new BABYLON.PointLight("gl",
        new BABYLON.Vector3(0, -20, 0), scene);
      gridLight.intensity = 12;
      gridLight.diffuse   = new BABYLON.Color3(0, 0.97, 1);
      gridLight.range     = 120;

      // ── HELPER materiales ──────────────────────────────────────
      const makeMat = (name, r, g, b, alpha = 1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0, 0, 0);
        m.emissiveColor = new BABYLON.Color3(r, g, b);
        if (alpha < 1) m.alpha = alpha;
        return m;
      };

      // ── GRID QUE SUBE — mismo que Phase1 ──────────────────────
      // El grid empieza lejos abajo y sube hacia el jugador
      const gridNode = new BABYLON.TransformNode("grid", scene);
      gridNode.position.y = -80; // empieza lejos

      // Líneas longitudinales
      for (let i = -15; i <= 15; i++) {
        const line = BABYLON.MeshBuilder.CreateBox(`gl${i}`, {
          width: 0.05, height: 0.01, depth: 300,
        }, scene);
        line.parent   = gridNode;
        line.position = new BABYLON.Vector3(i * 5, 0, 0);
        const brightness = 1 - Math.abs(i) * 0.055;
        line.material = makeMat(`glm${i}`,
          0, 0.97 * brightness, 1 * brightness);
      }

      // Líneas transversales
      for (let i = -30; i <= 30; i++) {
        const line = BABYLON.MeshBuilder.CreateBox(`gt${i}`, {
          width: 300, height: 0.01, depth: 0.05,
        }, scene);
        line.parent   = gridNode;
        line.position = new BABYLON.Vector3(0, 0, i * 5);
        line.material = makeMat(`gtm${i}`, 0, 0.35, 0.45);
      }

      // Líneas centrales más brillantes
      const centerH = BABYLON.MeshBuilder.CreateBox("ch", {
        width: 0.08, height: 0.01, depth: 300,
      }, scene);
      centerH.parent   = gridNode;
      centerH.material = makeMat("chm", 0, 0.97, 1);

      const centerV = BABYLON.MeshBuilder.CreateBox("cv", {
        width: 300, height: 0.01, depth: 0.08,
      }, scene);
      centerV.parent   = gridNode;
      centerV.material = makeMat("cvm", 0, 0.97, 1);

      // ── ANILLOS DE LA CÁPSULA ──────────────────────────────────
      // 3 anillos alrededor del jugador que se abren al aterrizar
      const ringNode = new BABYLON.TransformNode("rings", scene);
      const rings    = [];

      [0.9, 1.1, 1.35].forEach((r, i) => {
        const ring = BABYLON.MeshBuilder.CreateTorus(`ring${i}`, {
          diameter: r * 2, thickness: 0.035, tessellation: 64,
        }, scene);
        ring.parent   = ringNode;
        ring.rotation = new BABYLON.Vector3(Math.PI/2, 0, 0);
        ring.material = makeMat(`ringM${i}`, 0, 0.97, 1, 0.55);
        rings.push(ring);
      });

      // ── MANOS EN PRIMERA PERSONA — traje Tron ─────────────────
      // Negro con línea de circuito cyan — igual que Phase1
      const makeBlack = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.015, 0.015, 0.015);
        m.emissiveColor = new BABYLON.Color3(0, 0, 0);
        return m;
      };

      const lHand = BABYLON.MeshBuilder.CreateBox("lhand",
        { width: 0.08, height: 0.05, depth: 0.22 }, scene);
      lHand.material = makeBlack("lhandM");
      lHand.position = new BABYLON.Vector3(-0.22, -0.28, -0.32);

      const lCircuit = BABYLON.MeshBuilder.CreateBox("lc",
        { width: 0.005, height: 0.005, depth: 0.22 }, scene);
      lCircuit.material = makeMat("lcM", 0, 0.97, 1);
      lCircuit.position = new BABYLON.Vector3(-0.22, -0.253, -0.32);

      const rHand = BABYLON.MeshBuilder.CreateBox("rhand",
        { width: 0.08, height: 0.05, depth: 0.22 }, scene);
      rHand.material = makeBlack("rhandM");
      rHand.position = new BABYLON.Vector3(0.22, -0.28, -0.32);

      const rCircuit = BABYLON.MeshBuilder.CreateBox("rc",
        { width: 0.005, height: 0.005, depth: 0.22 }, scene);
      rCircuit.material = makeMat("rcM", 0, 0.97, 1);
      rCircuit.position = new BABYLON.Vector3(0.22, -0.253, -0.32);

      // ── PARTÍCULAS DE DATOS — mismo sistema que Phase1 ────────
      const ps = new BABYLON.ParticleSystem("data", 300, scene);
      ps.emitter    = new BABYLON.Vector3(0, 0, 0);
      ps.minEmitBox = new BABYLON.Vector3(-3, -4, -3);
      ps.maxEmitBox = new BABYLON.Vector3( 3,  4,  3);
      ps.color1     = new BABYLON.Color4(0, 0.97, 1, 0.6);
      ps.color2     = new BABYLON.Color4(0, 0.4, 0.5, 0.2);
      ps.colorDead  = new BABYLON.Color4(0, 0, 0, 0);
      ps.minSize    = 0.012; ps.maxSize = 0.045;
      ps.minLifeTime = 1.5; ps.maxLifeTime = 3.5;
      ps.emitRate    = 80;
      ps.blendMode   = BABYLON.ParticleSystem.BLENDMODE_ADD;
      ps.gravity     = new BABYLON.Vector3(0, 0.5, 0); // suben al caer
      ps.direction1  = new BABYLON.Vector3(-0.5, 1, -0.5);
      ps.direction2  = new BABYLON.Vector3( 0.5, 2,  0.5);
      ps.minEmitPower = 0.5; ps.maxEmitPower = 2;
      ps.updateSpeed  = 0.01;
      ps.start();

      // ── ESTRELLAS — puntos blancos en el fondo ─────────────────
      const starCount = 2000;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPositions[i*3]   = (Math.random()-0.5) * 200;
        starPositions[i*3+1] = (Math.random()-0.5) * 200;
        starPositions[i*3+2] = (Math.random()-0.5) * 200;
      }
      const starSystem = new BABYLON.ParticleSystem("stars", starCount, scene);
      starSystem.emitter    = new BABYLON.Vector3(0, 0, 0);
      starSystem.minEmitBox = new BABYLON.Vector3(-100, -100, -100);
      starSystem.maxEmitBox = new BABYLON.Vector3( 100,  100,  100);
      starSystem.color1     = new BABYLON.Color4(0.8, 1, 1, 0.8);
      starSystem.color2     = new BABYLON.Color4(0, 0.8, 0.9, 0.4);
      starSystem.colorDead  = new BABYLON.Color4(0, 0, 0, 0);
      starSystem.minSize    = 0.05; starSystem.maxSize = 0.15;
      starSystem.minLifeTime = 8; starSystem.maxLifeTime = 15;
      starSystem.emitRate    = 200;
      starSystem.blendMode   = BABYLON.ParticleSystem.BLENDMODE_ADD;
      starSystem.gravity     = new BABYLON.Vector3(0, 0, 0);
      starSystem.direction1  = new BABYLON.Vector3(-0.1, 0.1, -0.1);
      starSystem.direction2  = new BABYLON.Vector3( 0.1, 0.2,  0.1);
      starSystem.minEmitPower = 0; starSystem.maxEmitPower = 0.1;
      starSystem.updateSpeed  = 0.005;
      starSystem.start();

      // ── ANIMACIÓN PRINCIPAL ────────────────────────────────────
      const DURATION = 4.5; // segundos totales de caída
      let elapsed    = 0;
      let shakeT     = 0;

      scene.registerBeforeRender(() => {
        const delta = engine.getDeltaTime() * 0.001;
        elapsed    += delta;
        shakeT     += delta;
        const p     = Math.min(elapsed / DURATION, 1);

        progressRef.current = p;
        setProgress(p);

        // ── Grid sube hacia el jugador ───────────────────────────
        // Empieza en y:-80, llega a y:0 cuando p=1
        gridNode.position.y = -80 + p * 80;

        // ── Anillos de la cápsula ────────────────────────────────
        // Rotan y se abren al final
        const openProgress = Math.max(0, (p - 0.65) / 0.35);
        rings.forEach((ring, i) => {
          ring.rotation.z = shakeT * (0.4 + i * 0.15);
          const scale = 1 + openProgress * 4;
          ring.scaling.setAll(scale);
          ring.material.alpha = Math.max(0, 0.55 - openProgress * 0.55);
        });

        // ── Sacudida de cámara — aumenta con la velocidad ────────
        const shake = Math.min(p * 0.015, 0.012);
        camera.position.x = Math.sin(shakeT * 18) * shake;
        camera.position.y = Math.cos(shakeT * 22) * shake;

        // ── Manos siguen levemente el shake ──────────────────────
        lHand.position.x    = -0.22 + Math.sin(shakeT * 18) * shake * 0.3;
        lCircuit.position.x = lHand.position.x;
        rHand.position.x    = 0.22 + Math.sin(shakeT * 18) * shake * 0.3;
        rCircuit.position.x = rHand.position.x;

        // ── Luz del grid se intensifica al acercarse ─────────────
        gridLight.intensity = 12 + p * 20;
        gridLight.position.y = -80 + p * 82;

        // ── Fin de la caída ──────────────────────────────────────
        if (p >= 1 && !disposed) {
          disposed = true;
          setTimeout(onLand, 600);
        }
      });

      engine.runRenderLoop(() => {
        if (!disposed) scene.render();
      });
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
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block" }}
      />

      {/* HUD de caída */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"flex-end",
        paddingBottom:52,
      }}>
        <div style={{
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:"0.52rem", color:"rgba(0,247,255,0.45)",
          letterSpacing:"0.35em", marginBottom:8,
        }}>VELOCIDAD DE DIGITALIZACIÓN</div>

        {/* Barra de progreso */}
        <div style={{
          width:"min(280px,60vw)", height:2,
          background:"rgba(0,247,255,0.08)",
        }}>
          <div style={{
            height:"100%", width:`${progress * 100}%`,
            background:"linear-gradient(90deg, #00f7ff, #fff)",
            boxShadow:"0 0 8px #00f7ff",
            transition:"width 0.1s linear",
          }}/>
        </div>

        <div style={{
          fontFamily:"'Orbitron',sans-serif",
          fontSize:"clamp(0.7rem,2vw,0.95rem)",
          color:"#00f7ff",
          letterSpacing:"0.2em", marginTop:10,
          textShadow:"0 0 12px #00f7ff",
        }}>
          {progress < 0.95 ? "ENTRANDO A LA RED..." : "¡IMPACTO!"}
        </div>
      </div>

      {/* Viñeta — igual que Phase1 */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)",
      }}/>
    </div>
  );
}