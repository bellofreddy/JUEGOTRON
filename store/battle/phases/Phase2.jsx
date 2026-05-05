// Phase2.jsx — Carretera → Precipicio → 8 tubos neón
// Input: InputManager AAA — el game loop JALA el estado cada frame
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useBattleStore } from "../useBattleStore";
import { Input } from "../InputManager";

const TUBE_X = [-14, -10, -6, -2, 2, 6, 10, 14];

const ID_COLORS = [
  [0,0.97,1],[1,0.4,0],[0,0.97,1],[1,0.4,0],
  [0,0.97,1],[1,0.4,0],[0,0.97,1],[1,0.4,0],[0,0.97,1],
];

export default function Phase2({ onComplete }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const { bots, eliminate } = useBattleStore();

  const [uiPhase,     setUiPhase]     = useState("WAITING");
  const [tubesTaken,  setTubesTaken]  = useState(0);
  const [playerDone,  setPlayerDone]  = useState(false);
  const [message,     setMessage]     = useState("");
  const [survivors,   setSurvivors]   = useState(9);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;

    // Activar Input Manager — captura teclado desde ya
    Input.activate();

    const init = async () => {
      const BABYLON = await import("@babylonjs/core");

      // ── Motor ──────────────────────────────────────────────────
      const engine = new BABYLON.Engine(canvasRef.current, true, {
        adaptToDeviceRatio: true,
      });
      engineRef.current = engine;

      // ── Escena ─────────────────────────────────────────────────
      const scene = new BABYLON.Scene(engine);
      scene.clearColor   = new BABYLON.Color4(0,0,0,1);
      scene.ambientColor = new BABYLON.Color3(0,0,0);
      scene.fogMode      = BABYLON.Scene.FOGMODE_EXP;
      scene.fogDensity   = 0.005;
      scene.fogColor     = new BABYLON.Color3(0,0,0);

      // ── Cámara — perspectiva de piloto ────────────────────────
      const camera = new BABYLON.UniversalCamera("cam",
        new BABYLON.Vector3(0, 2.5, 8), scene);
      camera.setTarget(new BABYLON.Vector3(0, 1, -50));
      camera.fov  = 1.1;
      camera.minZ = 0.05;
      camera.maxZ = 300;

      // ── Glow ───────────────────────────────────────────────────
      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = 1.8;

      // ── Helpers ────────────────────────────────────────────────
      const neon = (name, r, g, b, a=1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0,0,0);
        m.emissiveColor = new BABYLON.Color3(r,g,b);
        if (a < 1) m.alpha = a;
        return m;
      };
      const black = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.015,0.015,0.015);
        m.emissiveColor = new BABYLON.Color3(0,0,0);
        m.specularColor = new BABYLON.Color3(0.04,0.04,0.04);
        return m;
      };

      // ── LUCES ──────────────────────────────────────────────────
      const roadL = new BABYLON.PointLight("rl",
        new BABYLON.Vector3(0,0.1,-50), scene);
      roadL.intensity=8; roadL.diffuse=new BABYLON.Color3(0,0.97,1); roadL.range=130;

      const cliffL = new BABYLON.PointLight("cl",
        new BABYLON.Vector3(0,3,-200), scene);
      cliffL.intensity=20; cliffL.diffuse=new BABYLON.Color3(0,0.97,1); cliffL.range=90;

      // ── CARRETERA ─────────────────────────────────────────────
      // Piso negro
      const road = BABYLON.MeshBuilder.CreateBox("road",
        {width:18, height:0.1, depth:230}, scene);
      road.position = new BABYLON.Vector3(0,-0.05,-107);
      road.material = black("roadM");
      road.checkCollisions = true;

      // Bordes laterales neón
      [-9,9].forEach((x,i) => {
        const e = BABYLON.MeshBuilder.CreateBox(`re${i}`,
          {width:0.07,height:0.07,depth:230}, scene);
        e.position = new BABYLON.Vector3(x,0.04,-107);
        e.material = neon(`rem${i}`,0,0.97,1);
      });

      // Línea central punteada
      for (let i=0; i<42; i++) {
        const d = BABYLON.MeshBuilder.CreateBox(`d${i}`,
          {width:0.04,height:0.02,depth:2.8}, scene);
        d.position = new BABYLON.Vector3(0,0.01,-i*5.2-2);
        d.material = neon(`dm${i}`,0,0.55,0.65);
      }

      // Líneas transversales perspectiva
      for (let i=0; i<46; i++) {
        const c = BABYLON.MeshBuilder.CreateBox(`c${i}`,
          {width:18,height:0.01,depth:0.04}, scene);
        c.position = new BABYLON.Vector3(0,0.005,-i*5);
        c.material = neon(`cm${i}`,0,0.28,0.36);
      }

      // ── ABISMO A LOS LADOS ────────────────────────────────────
      [-10,10].forEach((x,si) => {
        for (let j=0; j<22; j++) {
          const v = BABYLON.MeshBuilder.CreateBox(`vl${si}_${j}`,
            {width:0.035,height:55,depth:0.035}, scene);
          v.position = new BABYLON.Vector3(
            x+(si===0?-j*2.2:j*2.2), -27.5, -j*9-15);
          const br = 1-j*0.042;
          v.material = neon(`vlm${si}_${j}`,0,0.97*br,br);
        }
      });

      // Fondo del abismo
      const abyss = BABYLON.MeshBuilder.CreateBox("ab",
        {width:500,height:0.1,depth:500}, scene);
      abyss.position.y=-58; abyss.material=black("abM");

      // ── BORDE DEL PRECIPICIO ──────────────────────────────────
      const cliffEdge = BABYLON.MeshBuilder.CreateBox("ce",
        {width:18,height:0.4,depth:0.25}, scene);
      cliffEdge.position = new BABYLON.Vector3(0,0.2,-218);
      cliffEdge.material = neon("ceM",0,0.97,1);

      // ── TUBOS NEÓN ────────────────────────────────────────────
      const tubeNodes  = [];
      const tubeLights = [];

      TUBE_X.forEach((x,i) => {
        const [r,g,b] = i%2===0?[0,0.97,1]:[1,0.4,0];
        const node = new BABYLON.TransformNode(`tube${i}`, scene);
        node.position = new BABYLON.Vector3(x, 5, -220);

        // Cable
        const cable = BABYLON.MeshBuilder.CreateBox(`cab${i}`,
          {width:0.025,height:7,depth:0.025}, scene);
        cable.parent=node; cable.position.y=3.5;
        cable.material=neon(`cabM${i}`,r*0.4,g*0.4,b*0.4);

        // Cuerpo negro
        const body = BABYLON.MeshBuilder.CreateCylinder(`tb${i}`,
          {height:3.2,diameter:0.32,tessellation:16}, scene);
        body.parent=node; body.material=black(`tbM${i}`);

        // Anillos de circuito
        [1.1,0.2,-0.7,-1.5].forEach((y,ri) => {
          const ring = BABYLON.MeshBuilder.CreateTorus(`tr${i}_${ri}`,
            {diameter:0.42,thickness:0.038,tessellation:24}, scene);
          ring.parent=node; ring.position.y=y;
          ring.material=neon(`trM${i}_${ri}`,r,g,b);
        });

        // Agarre
        const grip = BABYLON.MeshBuilder.CreateBox(`tg${i}`,
          {width:0.48,height:0.1,depth:0.48}, scene);
        grip.parent=node; grip.position.y=-1.7;
        grip.material=neon(`tgM${i}`,r,g*1.2,b);

        // Luz
        const tl = new BABYLON.PointLight(`tl${i}`,
          new BABYLON.Vector3(x,3,-220), scene);
        tl.intensity=5; tl.diffuse=new BABYLON.Color3(r,g,b); tl.range=7;

        tubeNodes.push(node); tubeLights.push(tl);
      });

      // ── MOTO DEL JUGADOR ──────────────────────────────────────
      const pMoto = new BABYLON.TransformNode("pMoto", scene);
      pMoto.position = new BABYLON.Vector3(0,0.5,5);

      const pmB = BABYLON.MeshBuilder.CreateBox("pmB",
        {width:0.5,height:0.28,depth:2.2}, scene);
      pmB.parent=pMoto; pmB.material=black("pmBM");

      const pmS = BABYLON.MeshBuilder.CreateBox("pmS",
        {width:0.025,height:0.025,depth:2.2}, scene);
      pmS.parent=pMoto; pmS.position.x=0.27; pmS.position.y=0.08;
      pmS.material=neon("pmSM",0,0.97,1);

      [0.85,-0.85].forEach((zo,wi) => {
        const w = BABYLON.MeshBuilder.CreateTorus(`pmW${wi}`,
          {diameter:0.55,thickness:0.055,tessellation:20}, scene);
        w.parent=pMoto; w.position=new BABYLON.Vector3(0,-0.12,zo);
        w.rotation.z=Math.PI/2; w.material=neon(`pmWM${wi}`,0,0.97,1);
      });

      // ── MANOS ─────────────────────────────────────────────────
      const lH = BABYLON.MeshBuilder.CreateBox("lH",
        {width:0.08,height:0.05,depth:0.22}, scene);
      lH.material=black("lHM");
      const lC = BABYLON.MeshBuilder.CreateBox("lC",
        {width:0.005,height:0.005,depth:0.22}, scene);
      lC.material=neon("lCM",0,0.97,1);

      const rH = BABYLON.MeshBuilder.CreateBox("rH",
        {width:0.08,height:0.05,depth:0.22}, scene);
      rH.material=black("rHM");
      const rC = BABYLON.MeshBuilder.CreateBox("rC",
        {width:0.005,height:0.005,depth:0.22}, scene);
      rC.material=neon("rCM",0,0.97,1);

      // ── BOTS EN SUS MOTOS ─────────────────────────────────────
      const botsAlive = [...bots].filter(b=>b.alive)
                                  .sort((a,b)=>b.speed-a.speed);
      const botNodes = [];
      const botVelZ  = [];
      const botState = []; // "RIDING"|"BRAKING"|"JUMPING"|"DONE"

      botsAlive.forEach((bot,i) => {
        const [r,g,b_] = ID_COLORS[i%ID_COLORS.length];
        const startX = (i - Math.floor(botsAlive.length/2)) * 1.9;
        const node = new BABYLON.TransformNode(`bm${i}`, scene);
        node.position = new BABYLON.Vector3(startX, 0.5, 5+i*0.4);

        const mb = BABYLON.MeshBuilder.CreateBox(`bmb${i}`,
          {width:0.45,height:0.25,depth:2.0}, scene);
        mb.parent=node; mb.material=black(`bmbM${i}`);

        const ms = BABYLON.MeshBuilder.CreateBox(`bms${i}`,
          {width:0.022,height:0.022,depth:2.0}, scene);
        ms.parent=node; ms.position.x=0.24; ms.position.y=0.07;
        ms.material=neon(`bmsM${i}`,r,g,b_);

        [0.8,-0.8].forEach((zo,wi) => {
          const w = BABYLON.MeshBuilder.CreateTorus(`bmw${i}_${wi}`,
            {diameter:0.5,thickness:0.05,tessellation:16}, scene);
          w.parent=node; w.position=new BABYLON.Vector3(0,-0.11,zo);
          w.rotation.z=Math.PI/2; w.material=neon(`bmwM${i}_${wi}`,r,g,b_);
        });

        botNodes.push(node);
        botVelZ.push(bot.speed*11+8);
        botState.push("RIDING");
      });

      // ── ESTADO DEL JUEGO ──────────────────────────────────────
      let gPhase     = "WAITING"; // AAA: variable local leída cada frame
      let mountT     = 0;
      let rideZ      = 8;
      let rideSpd    = 0;
      let fallVel    = 0;
      let playerY    = 1.1;
      let tubeCount  = 0;
      let botTubes   = {};
      let shakeT     = 0;

      const BRAKE_Z  = -175;
      const CLIFF_Z  = -212;
      const TUBES_Z  = -220;

      // ── LOOP PRINCIPAL AAA — jala input cada frame ─────────────
      scene.registerBeforeRender(() => {
        const dt = engine.getDeltaTime() * 0.001;
        shakeT += dt;

        // Animaciones constantes
        let tt = shakeT;
        tubeNodes.forEach((n,i) => {
          if (!n.isEnabled()) return;
          n.position.y = 5 + Math.sin(tt*1.5+i*0.7)*0.1;
          tubeLights[i].position.y = 3 + Math.sin(tt*1.5+i*0.7)*0.1;
          tubeLights[i].intensity  = 5 + Math.sin(tt*3+i)*1.5;
        });
        cliffL.intensity = 20 + Math.sin(tt*2.5)*6;

        // ── WAITING: InputManager.wasPressed — AAA pattern ───────
        if (gPhase === "WAITING") {
          // Moto flota frente al jugador
          pMoto.position.z = rideZ - 2.5;
          pMoto.position.y = 0.5 + Math.sin(tt*2)*0.05;
          camera.position  = new BABYLON.Vector3(0, 2.2, rideZ);
          camera.setTarget(new BABYLON.Vector3(0, 1.2, rideZ-8));

          // Input Manager — wasPressed consume el evento una sola vez
          if (Input.wasPressed("KeyE") || Input.wasPressed("Space")) {
            gPhase = "MOUNTING";
            mountT = 0;
            setUiPhase("MOUNTING");
          }
          return;
        }

        // ── MOUNTING ──────────────────────────────────────────────
        if (gPhase === "MOUNTING") {
          mountT += dt;
          const p = Math.min(mountT/2.2, 1);
          const e = p<0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
          camera.position.y = 2.2 + (1.1-2.2)*e;
          camera.position.z = rideZ;
          pMoto.position.z  = rideZ-1;
          pMoto.position.y  = 0.5;
          camera.setTarget(new BABYLON.Vector3(0,0.8,-50));
          if (mountT >= 2.2) {
            gPhase="RIDING"; rideSpd=0; setUiPhase("RIDING");
          }
          return;
        }

        // ── RIDING ────────────────────────────────────────────────
        if (gPhase === "RIDING") {
          rideSpd = Math.min(rideSpd+18*dt, 22);
          rideZ  -= rideSpd*dt;
          pMoto.position.z = rideZ-1;
          pMoto.position.y = 0.5+Math.sin(tt*18)*0.008;
          camera.position  = new BABYLON.Vector3(
            Math.sin(tt*18)*0.006, 1.1+Math.sin(tt*22)*0.005, rideZ);

          // Manos sobre manubrio
          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);

          // Bots corren
          _updateBots(botsAlive, botNodes, botVelZ, botState, dt,
            BRAKE_Z, CLIFF_Z, TUBES_Z, TUBE_X, tubeNodes, tubeLights,
            botTubes, tubeCount, (count) => {
              tubeCount = count;
              setTubesTaken(count);
            }, eliminate, setMessage, setSurvivors);

          if (rideZ < BRAKE_Z) { gPhase="BRAKING"; }
          return;
        }

        // ── BRAKING ───────────────────────────────────────────────
        if (gPhase === "BRAKING") {
          rideSpd = Math.max(rideSpd-32*dt, 0);
          rideZ  -= rideSpd*dt;
          pMoto.position.z = rideZ-1;
          pMoto.position.y = 0.5;
          camera.position  = new BABYLON.Vector3(0, 1.1, rideZ);
          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);

          _updateBots(botsAlive, botNodes, botVelZ, botState, dt,
            BRAKE_Z, CLIFF_Z, TUBES_Z, TUBE_X, tubeNodes, tubeLights,
            botTubes, tubeCount, (count) => {
              tubeCount = count;
              setTubesTaken(count);
            }, eliminate, setMessage, setSurvivors);

          if (rideSpd <= 0 || rideZ < CLIFF_Z+3) {
            gPhase="CLIFF"; rideSpd=0;
            pMoto.setEnabled(false);
            setUiPhase("CLIFF");
            setMessage("¡SALTA! — ESPACIO O E");
          }
          return;
        }

        // ── CLIFF — InputManager para saltar ─────────────────────
        if (gPhase === "CLIFF") {
          camera.position = new BABYLON.Vector3(0,1.1,rideZ);
          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);

          _updateBots(botsAlive, botNodes, botVelZ, botState, dt,
            BRAKE_Z, CLIFF_Z, TUBES_Z, TUBE_X, tubeNodes, tubeLights,
            botTubes, tubeCount, (count) => {
              tubeCount = count;
              setTubesTaken(count);
            }, eliminate, setMessage, setSurvivors);

          // Input Manager — wasPressed one-shot
          if (Input.wasPressed("Space") || Input.wasPressed("KeyE")) {
            gPhase = "JUMPING";
            setMessage("");
          }

          // Si todos los tubos están tomados → caer
          if (tubeCount >= 8) {
            gPhase = "FALLING";
            fallVel = 0;
            playerY = 1.1;
            setMessage("SIN TUBO...");
          }
          return;
        }

        // ── JUMPING ───────────────────────────────────────────────
        if (gPhase === "JUMPING") {
          // Encontrar tubo disponible más cercano a X=0
          let closestIdx = -1;
          let closestDist = 999;
          TUBE_X.forEach((x,i) => {
            if (!tubeNodes[i].isEnabled()) return;
            const d = Math.abs(x);
            if (d < closestDist) { closestDist=d; closestIdx=i; }
          });

          if (closestIdx < 0) { gPhase="FALLING"; return; }

          const tx = TUBE_X[closestIdx];
          camera.position.x += (tx - camera.position.x)*dt*3.5;
          camera.position.z += (TUBES_Z - camera.position.z)*dt*4;
          camera.position.y += (5.5 - camera.position.y)*dt*3;
          _updateHands(camera, lH, lC, rH, rC, BABYLON, false);

          const distZ = Math.abs(camera.position.z - TUBES_Z);
          if (distZ < 1.8) {
            tubeNodes[closestIdx].setEnabled(false);
            tubeLights[closestIdx].setEnabled(false);
            tubeCount++;
            setTubesTaken(tubeCount);
            setPlayerDone(true);
            gPhase = "DONE";
            setUiPhase("DONE");
            setMessage("¡TUBO TOMADO!");
            setTimeout(() => onCompleteRef.current(false), 2200);
          }
          return;
        }

        // ── FALLING ───────────────────────────────────────────────
        if (gPhase === "FALLING") {
          fallVel -= 14*dt;
          playerY += fallVel*dt;
          camera.position = new BABYLON.Vector3(
            camera.position.x, playerY, camera.position.z);
          camera.rotation.z += dt*1.8;
          if (playerY < -28) {
            gPhase = "DONE";
            onCompleteRef.current(true);
          }
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
    if (tubesTaken >= 8 && !playerDone) {
      setTimeout(() => onComplete(true), 2500);
    }
  }, [tubesTaken, playerDone]);

  return (
    <div style={{width:"100vw",height:"100vh",background:"#000",position:"relative"}}>
      <canvas ref={canvasRef} style={{width:"100%",height:"100%",display:"block",outline:"none"}}/>

      {/* HUD */}
      <div style={{
        position:"absolute",top:0,left:0,right:0,
        display:"flex",justifyContent:"space-between",
        padding:"20px 26px",pointerEvents:"none",
        fontFamily:"'Share Tech Mono',monospace",
      }}>
        <div style={{
          fontSize:"0.58rem",color:"rgba(0,247,255,0.65)",
          letterSpacing:"0.2em",lineHeight:2,
          borderLeft:"2px solid rgba(0,247,255,0.3)",paddingLeft:12,
        }}>
          FASE 2 — PRECIPICIO<br/>
          <span style={{color:"#ff6600"}}>TUBOS: {Math.max(0,8-tubesTaken)}/8</span>
        </div>
        <div style={{
          fontSize:"0.58rem",textAlign:"right",
          color:"rgba(255,255,255,0.35)",letterSpacing:"0.15em",
          borderRight:"2px solid rgba(0,247,255,0.3)",paddingRight:12,
        }}>
          PROGRAMAS ACTIVOS<br/>
          <span style={{
            fontFamily:"'Orbitron',sans-serif",
            fontSize:"1.6rem",color:"#00f7ff",
            textShadow:"0 0 20px #00f7ff",
          }}>{survivors}</span>
          <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.2)"}}>/9</span>
        </div>
      </div>

      {/* Crosshair */}
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"50%",left:-9,right:-9,height:"1px",background:"rgba(0,247,255,0.35)",transform:"translateY(-50%)"}}/>
        <div style={{position:"absolute",left:"50%",top:-9,bottom:-9,width:"1px",background:"rgba(0,247,255,0.35)",transform:"translateX(-50%)"}}/>
      </div>

      {/* WAITING — botón grande, siempre visible */}
      {uiPhase === "WAITING" && (
        <div style={{
          position:"absolute",inset:0,
          display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",
          gap:16,
        }}>
          <div style={{
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:"0.55rem",color:"rgba(0,247,255,0.4)",
            letterSpacing:"0.45em",marginBottom:4,pointerEvents:"none",
          }}>LIGHT CYCLE LISTO</div>

          <button
            onClick={() => Input.simulatePress("KeyE")}
            style={{
              background:"rgba(0,247,255,0.08)",
              border:"2px solid rgba(0,247,255,0.6)",
              color:"#00f7ff",
              fontFamily:"'Orbitron',sans-serif",fontWeight:900,
              fontSize:"clamp(1rem,3vw,1.5rem)",
              letterSpacing:"0.25em",padding:"18px 48px",
              cursor:"pointer",
              textShadow:"0 0 20px #00f7ff",
              boxShadow:"0 0 30px rgba(0,247,255,0.2), inset 0 0 20px rgba(0,247,255,0.05)",
            }}
          >▶ MONTAR</button>

          <div style={{
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:"0.5rem",color:"rgba(0,247,255,0.25)",
            letterSpacing:"0.3em",pointerEvents:"none",
          }}>ESPACIO · E · CLICK</div>
        </div>
      )}

      {/* MOUNTING */}
      {uiPhase === "MOUNTING" && (
        <div style={{
          position:"absolute",bottom:60,left:"50%",transform:"translateX(-50%)",
          textAlign:"center",pointerEvents:"none",
        }}>
          <div style={{
            fontFamily:"'Orbitron',sans-serif",fontWeight:900,
            fontSize:"clamp(1rem,3vw,1.3rem)",
            color:"#00f7ff",letterSpacing:"0.15em",
            textShadow:"0 0 20px #00f7ff",
          }}>MONTANDO LIGHT CYCLE...</div>
        </div>
      )}

      {/* CLIFF */}
      {uiPhase === "CLIFF" && (
        <div style={{
          position:"absolute",inset:0,
          display:"flex",alignItems:"flex-end",justifyContent:"center",
          paddingBottom:60,
        }}>
          <button
            onClick={() => Input.simulatePress("Space")}
            style={{
              background:"rgba(255,102,0,0.12)",
              border:"2px solid rgba(255,102,0,0.7)",
              color:"#ff6600",
              fontFamily:"'Orbitron',sans-serif",fontWeight:900,
              fontSize:"clamp(1rem,3vw,1.4rem)",
              letterSpacing:"0.2em",padding:"16px 42px",
              cursor:"pointer",
              textShadow:"0 0 20px #ff6600",
              boxShadow:"0 0 30px rgba(255,102,0,0.2)",
              animation:"pulse 0.8s ease infinite",
            }}
          >⬆ SALTAR AL TUBO</button>
        </div>
      )}

      {/* Mensaje */}
      {message && uiPhase !== "CLIFF" && (
        <div style={{
          position:"absolute",bottom:90,left:"50%",transform:"translateX(-50%)",
          fontFamily:"'Orbitron',sans-serif",fontWeight:900,
          fontSize:"clamp(0.9rem,2.5vw,1.2rem)",
          color:message.includes("TOMADO")?"#00f7ff":message.includes("SIN")?"#ff0055":"#ff6600",
          textShadow:"0 0 30px currentColor",
          letterSpacing:"0.15em",pointerEvents:"none",
        }}>{message}</div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
      `}</style>
    </div>
  );
}

// ── Helpers externos al componente para no recrearlos cada frame ───
function _updateHands(camera, lH, lC, rH, rC, BABYLON, running) {
  const fw = camera.getDirection(BABYLON.Axis.Z);
  const rt = camera.getDirection(BABYLON.Axis.X);
  const up = camera.getDirection(BABYLON.Axis.Y);
  lH.position = camera.position.clone()
    .subtract(rt.scale(0.22)).subtract(up.scale(0.19)).subtract(fw.scale(0.38));
  lH.rotation = camera.rotation.clone();
  lC.position = lH.position.clone().add(up.scale(0.028));
  lC.rotation = lH.rotation.clone();
  rH.position = camera.position.clone()
    .add(rt.scale(0.22)).subtract(up.scale(0.19)).subtract(fw.scale(0.38));
  rH.rotation = camera.rotation.clone();
  rC.position = rH.position.clone().add(up.scale(0.028));
  rC.rotation = rH.rotation.clone();
}

function _updateBots(bots, nodes, vels, states, dt,
  brakeZ, cliffZ, tubesZ, tubeX, tubeNodes, tubeLights,
  botTubes, tubeCount, setCount, eliminate, setMsg, setSurv) {
  bots.forEach((bot,i) => {
    if (states[i]==="DONE") return;
    const node = nodes[i];
    if (states[i]==="RIDING") {
      node.position.z -= vels[i]*dt;
      if (node.position.z < brakeZ) states[i]="BRAKING";
    }
    if (states[i]==="BRAKING") {
      vels[i] = Math.max(vels[i]-28*dt, 0);
      node.position.z -= vels[i]*dt;
      if (vels[i]<=0 || node.position.z < cliffZ+4) states[i]="JUMPING";
    }
    if (states[i]==="JUMPING") {
      const tIdx = Math.min(i, tubeX.length-1);
      const tx = tubeX[tIdx];
      node.position.x += (tx-node.position.x)*dt*4;
      node.position.z += (tubesZ-node.position.z)*dt*4.5;
      node.position.y += (5-node.position.y)*dt*3;
      if (Math.abs(node.position.z-tubesZ)<1.5) {
        states[i]="DONE"; node.setEnabled(false);
        if (!botTubes[bot.id]) {
          const idx = Object.keys(botTubes).length;
          botTubes[bot.id]=true;
          if (idx<8) {
            if (tubeNodes[idx]) tubeNodes[idx].setEnabled(false);
            if (tubeLights[idx]) tubeLights[idx].setEnabled(false);
            tubeCount++; setCount(tubeCount);
          } else {
            eliminate(bot.id);
            setMsg("UN PROGRAMA HA SIDO DERREZADO");
            setSurv(s=>Math.max(0,s-1));
          }
        }
      }
    }
  });
}