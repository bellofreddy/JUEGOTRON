"use client";
import React, { useEffect, useRef, useState } from "react";
import { useBattleStore } from "../useBattleStore";

// ── Configuración ─────────────────────────────────────────────
const SURVIVE_TIME   = 60;
const SHOOT_COOLDOWN = 0.22;
const BULLET_SPEED   = 130;
const BULLET_LIFE    = 2.0;
const HIT_RADIUS     = 3.0;
const FLY_SPEED      = 38;
const LATERAL_SPD    = 22;
const VERT_SPD       = 14;
const TRAIL_SEG_DIST = 1.2;   // distancia entre segmentos de estela
const TRAIL_LIFE     = 6.0;   // segundos que dura la estela

const SLOT_COLORS = [
  [0, 0.97, 1],   // jugador — cyan
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

  // Capturar supervivientes de Phase2 al montar
  const botsSnap = useRef(useBattleStore.getState().bots);

  const [timeLeft,  setTimeLeft]  = useState(SURVIVE_TIME);
  const [botsDown,  setBotsDown]  = useState(0);
  const [message,   setMessage]   = useState("");
  const [totalBots, setTotalBots] = useState(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Input nativo ──────────────────────────────────────────
  const keys = useRef({ left:false, right:false, up:false, down:false, shoot:false });
  useEffect(() => {
    const dn = (e) => {
      if (e.code==="Space")                              { e.preventDefault(); keys.current.shoot = true; }
      if (e.code==="KeyA"||e.code==="ArrowLeft")         keys.current.left  = true;
      if (e.code==="KeyD"||e.code==="ArrowRight")        keys.current.right = true;
      if (e.code==="KeyW"||e.code==="ArrowUp")           keys.current.up    = true;
      if (e.code==="KeyS"||e.code==="ArrowDown")         keys.current.down  = true;
    };
    const up = (e) => {
      if (e.code==="Space")                              keys.current.shoot = false;
      if (e.code==="KeyA"||e.code==="ArrowLeft")         keys.current.left  = false;
      if (e.code==="KeyD"||e.code==="ArrowRight")        keys.current.right = false;
      if (e.code==="KeyW"||e.code==="ArrowUp")           keys.current.up    = false;
      if (e.code==="KeyS"||e.code==="ArrowDown")         keys.current.down  = false;
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup",   up);
    };
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
      scene.fogMode    = BABYLON.Scene.FOGMODE_EXP;
      scene.fogDensity = 0.004;
      scene.fogColor   = new BABYLON.Color3(0, 0, 0);

      const glow = new BABYLON.GlowLayer("glow", scene);
      glow.intensity = 1.8;

      // ── Materiales ────────────────────────────────────────
      const neon = (name, r, g, b, a=1) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0,0,0);
        m.emissiveColor = new BABYLON.Color3(r,g,b);
        if (a<1) m.alpha = a;
        return m;
      };
      const blackMat = (name) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.01,0.01,0.01);
        m.emissiveColor = new BABYLON.Color3(0,0,0);
        return m;
      };

      // ── Iluminación ──────────────────────────────────────
      const ambL = new BABYLON.PointLight("ambL", new BABYLON.Vector3(0,0,0), scene);
      ambL.intensity = 3;
      ambL.diffuse   = new BABYLON.Color3(0, 0.97, 1);
      ambL.range     = 400;

      // ── Entorno: espacio Tron ─────────────────────────────
      // Grid inferior — da sensación de altitud
      for (let i=-30; i<=30; i+=5) {
        const h = BABYLON.MeshBuilder.CreateBox(`gh${i}`,{width:1200,height:0.02,depth:0.06},scene);
        h.position = new BABYLON.Vector3(0,-80,i*12);
        const br = 0.2 - Math.abs(i/30)*0.14;
        h.material = neon(`ghm${i}`,0,br*0.97,br);
        const v = BABYLON.MeshBuilder.CreateBox(`gv${i}`,{width:0.06,height:0.02,depth:1200},scene);
        v.position = new BABYLON.Vector3(i*12,-80,0);
        v.material = neon(`gvm${i}`,0,br*0.97,br);
      }
      // Torres en el horizonte
      for (let i=0; i<16; i++) {
        const ang = (i/16)*Math.PI*2;
        const rad = 350+Math.random()*100;
        const th  = 60+Math.random()*180;
        const tx  = Math.cos(ang)*rad;
        const tz  = Math.sin(ang)*rad;
        const tb  = BABYLON.MeshBuilder.CreateBox(`tb${i}`,{width:8,height:th,depth:8},scene);
        tb.position = new BABYLON.Vector3(tx,th/2-80,tz);
        tb.material = blackMat(`tbM${i}`);
        const [cr,cg,cb] = i%2===0?[0,0.97,1]:[1,0.4,0];
        [[4,4],[4,-4],[-4,4],[-4,-4]].forEach(([ex,ez],ei)=>{
          const e2 = BABYLON.MeshBuilder.CreateBox(`te${i}_${ei}`,{width:0.1,height:th,depth:0.1},scene);
          e2.position = new BABYLON.Vector3(tx+ex,th/2-80,tz+ez);
          e2.material = neon(`teM${i}_${ei}`,cr,cg,cb);
        });
      }

      // ── Helper: construir Light Jet ───────────────────────
      // Diseño Tron — cuerpo central + alas en delta + cabina
      const makeJet = (slotIdx) => {
        const [r,g,b] = SLOT_COLORS[slotIdx % SLOT_COLORS.length];
        const root = new BABYLON.TransformNode(`jet${slotIdx}`,scene);

        // Fuselaje central
        const fuse = BABYLON.MeshBuilder.CreateBox(`jf${slotIdx}`,
          {width:0.5,height:0.22,depth:3.8},scene);
        fuse.parent   = root;
        fuse.material = blackMat(`jfM${slotIdx}`);

        // Línea neón central
        const spine = BABYLON.MeshBuilder.CreateBox(`jsp${slotIdx}`,
          {width:0.04,height:0.04,depth:3.8},scene);
        spine.parent   = root;
        spine.position = new BABYLON.Vector3(0,0.12,0);
        spine.material = neon(`jspM${slotIdx}`,r,g,b);

        // Alas en delta — izquierda y derecha
        [-1,1].forEach((side,si)=>{
          // Ala principal
          const wing = BABYLON.MeshBuilder.CreateBox(`jw${slotIdx}_${si}`,
            {width:3.2,height:0.04,depth:1.8},scene);
          wing.parent   = root;
          wing.position = new BABYLON.Vector3(side*2.2,0,0.4);
          wing.rotation = new BABYLON.Vector3(0,side*0.18,0);
          wing.material = blackMat(`jwM${slotIdx}_${si}`);

          // Borde neón del ala
          const wingEdge = BABYLON.MeshBuilder.CreateBox(`jwe${slotIdx}_${si}`,
            {width:3.2,height:0.02,depth:0.04},scene);
          wingEdge.parent   = root;
          wingEdge.position = new BABYLON.Vector3(side*2.2,0.03,1.3);
          wingEdge.rotation = new BABYLON.Vector3(0,side*0.18,0);
          wingEdge.material = neon(`jweM${slotIdx}_${si}`,r,g,b);

          // Punta del ala
          const tip = BABYLON.MeshBuilder.CreateBox(`jwt${slotIdx}_${si}`,
            {width:0.08,height:0.5,depth:0.08},scene);
          tip.parent   = root;
          tip.position = new BABYLON.Vector3(side*3.7,0,0.4);
          tip.material = neon(`jwtM${slotIdx}_${si}`,r,g*1.2,b);
        });

        // Cabina negra con visor
        const cabin = BABYLON.MeshBuilder.CreateBox(`jc${slotIdx}`,
          {width:0.38,height:0.28,depth:0.9},scene);
        cabin.parent   = root;
        cabin.position = new BABYLON.Vector3(0,0.22,-0.3);
        cabin.material = blackMat(`jcM${slotIdx}`);

        const visor = BABYLON.MeshBuilder.CreateBox(`jv${slotIdx}`,
          {width:0.3,height:0.06,depth:0.85},scene);
        visor.parent   = root;
        visor.position = new BABYLON.Vector3(0,0.36,-0.3);
        visorMat: visor.material = neon(`jvM${slotIdx}`,r,g*0.6,b*0.6,0.7);

        // Motor trasero con brillo
        const eng = BABYLON.MeshBuilder.CreateCylinder(`je${slotIdx}`,
          {height:0.5,diameter:0.3,tessellation:12},scene);
        eng.parent   = root;
        eng.position = new BABYLON.Vector3(0,0,2.1);
        eng.rotation = new BABYLON.Vector3(Math.PI/2,0,0);
        eng.material = neon(`jeM${slotIdx}`,r,g,b);

        // Luz del jet
        const jl = new BABYLON.PointLight(`jl${slotIdx}`,
          new BABYLON.Vector3(0,0,0),scene);
        jl.parent    = root;
        jl.intensity = 5;
        jl.diffuse   = new BABYLON.Color3(r,g,b);
        jl.range     = 18;

        return root;
      };

      // ── Jet del jugador (slot 0) ───────────────────────────
      const playerJet = makeJet(0);
      playerJet.position = new BABYLON.Vector3(0,0,0);

      // Cámara tercera persona detrás del jet
      const camPivot = new BABYLON.TransformNode("camPivot",scene);
      const camera   = new BABYLON.UniversalCamera("cam",
        new BABYLON.Vector3(0,3.5,9),scene);
      camera.parent  = camPivot;
      camera.setTarget(new BABYLON.Vector3(0,0,-12));
      camera.fov  = 1.1;
      camera.minZ = 0.1;
      camera.maxZ = 800;

      // ── Jets enemigos — solo bots con hasTube ─────────────
      const enemyBots = botsSnap.current.filter(b => b.alive && b.hasTube);
      setTotalBots(enemyBots.length);

      const enemies = enemyBots.map((bot, i) => {
        const [r,g,b] = SLOT_COLORS[(i+1) % SLOT_COLORS.length];
        const jet = makeJet(i+1);
        // Spawn en arco frente al jugador
        const ang = ((i / Math.max(enemyBots.length,1)) - 0.5) * Math.PI * 1.2;
        jet.position = new BABYLON.Vector3(
          Math.sin(ang)*60,
          (Math.random()-0.5)*20,
          -80 - i*15,
        );
        return {
          jet, r, g, b,
          alive: true,
          velX: 0, velY: 0,
          evadeTimer: Math.random()*2,
          // Estela del bot
          trailSegs: [],     // {mesh, born}
          lastTrailPos: jet.position.clone(),
        };
      });

      // ── Balas ─────────────────────────────────────────────
      const bullets   = []; // {mesh, vel, life}
      let   shootTimer = 0;

      const fireBullet = (fromPos, dir) => {
        const b = BABYLON.MeshBuilder.CreateBox(`bul${Date.now()}`,
          {width:0.08,height:0.08,depth:1.2},scene);
        b.position = fromPos.clone().add(dir.scale(-2));
        b.material = neon(`bulM${Date.now()}`,0,0.97,1);
        bullets.push({ mesh:b, vel:dir.scale(-BULLET_SPEED), life:BULLET_LIFE });
      };

      // ── Estela helper ────────────────────────────────────
      const addTrail = (owner, p1, p2) => {
        const dx  = p2.x-p1.x, dy=p2.y-p1.y, dz=p2.z-p1.z;
        const len = Math.sqrt(dx*dx+dy*dy+dz*dz);
        if (len<0.1) return;
        const [r,g,b] = owner.r!==undefined
          ? [owner.r,owner.g,owner.b]
          : [0,0.97,1];
        const seg = BABYLON.MeshBuilder.CreateBox(`tr${Date.now()}_${Math.random()}`,
          {width:0.12,height:0.12,depth:len},scene);
        seg.position = new BABYLON.Vector3(
          (p1.x+p2.x)/2,(p1.y+p2.y)/2,(p1.z+p2.z)/2);
        seg.lookAt(p2);
        seg.material = neon(`trM${Date.now()}`,r,g,b,0.8);
        owner.trailSegs.push({mesh:seg, born:performance.now()/1000});
      };

      // Estado del jugador
      let jetX=0, jetY=0, jetZ=0;
      let jetVelX=0, jetVelY=0;
      let gameTime=0, gameDone=false;
      let killed=0;

      // Estela del jugador
      const playerTrail = { r:0,g:0.97,b:1, trailSegs:[] };
      let playerLastTrail = new BABYLON.Vector3(0,0,0);

      // ── RENDER LOOP ───────────────────────────────────────
      scene.registerBeforeRender(() => {
        if (disposed||gameDone) return;
        const dt  = engine.getDeltaTime()*0.001;
        const now = performance.now()/1000;
        gameTime += dt;

        // Timer
        const rem = Math.max(0, SURVIVE_TIME-gameTime);
        setTimeLeft(Math.ceil(rem));
        if (rem<=0) {
          gameDone=true;
          setMessage("¡SISTEMA OPERATIVO — MISIÓN COMPLETA!");
          setTimeout(()=>onCompleteRef.current(false),2200);
          return;
        }

        // ── Movimiento del jugador ────────────────────────
        const k = keys.current;
        const tgtVX = (k.left?1:0)-(k.right?1:0);
        const tgtVY = (k.up  ?1:0)-(k.down ?1:0);
        jetVelX = BABYLON.Scalar.Lerp(jetVelX, tgtVX*LATERAL_SPD, dt*5);
        jetVelY = BABYLON.Scalar.Lerp(jetVelY, tgtVY*VERT_SPD,    dt*5);

        jetZ -= FLY_SPEED*dt;
        jetX += jetVelX*dt;
        jetY += jetVelY*dt;
        jetX  = Math.max(-80, Math.min(80, jetX));
        jetY  = Math.max(-40, Math.min(60, jetY));

        playerJet.position = new BABYLON.Vector3(jetX,jetY,jetZ);
        // Tilt visual
        playerJet.rotation.z = BABYLON.Scalar.Lerp(
          playerJet.rotation.z, -tgtVX*0.22, dt*6);
        playerJet.rotation.x = BABYLON.Scalar.Lerp(
          playerJet.rotation.x, -tgtVY*0.1, dt*6);

        // Cámara sigue al jet
        camPivot.position = new BABYLON.Vector3(
          BABYLON.Scalar.Lerp(camPivot.position.x, jetX, dt*10),
          BABYLON.Scalar.Lerp(camPivot.position.y, jetY, dt*10),
          BABYLON.Scalar.Lerp(camPivot.position.z, jetZ, dt*10),
        );
        ambL.position.copyFrom(playerJet.position);

        // Estela del jugador
        const pPos = playerJet.position;
        if (BABYLON.Vector3.Distance(pPos, playerLastTrail) > TRAIL_SEG_DIST) {
          addTrail(playerTrail, playerLastTrail, pPos);
          playerLastTrail = pPos.clone();
        }

        // Expirar estela jugador
        for (let i=playerTrail.trailSegs.length-1;i>=0;i--) {
          if (now-playerTrail.trailSegs[i].born>TRAIL_LIFE) {
            playerTrail.trailSegs[i].mesh.dispose();
            playerTrail.trailSegs.splice(i,1);
          }
        }

        // ── Disparo ───────────────────────────────────────
        shootTimer -= dt;
        if (k.shoot && shootTimer<=0) {
          fireBullet(playerJet.position, new BABYLON.Vector3(0,0,1));
          shootTimer = SHOOT_COOLDOWN;
        }

        // ── Actualizar balas ──────────────────────────────
        for (let i=bullets.length-1;i>=0;i--) {
          const bul = bullets[i];
          bul.life -= dt;
          bul.mesh.position.addInPlace(bul.vel.scale(dt));
          if (bul.life<=0) { bul.mesh.dispose(); bullets.splice(i,1); continue; }

          // Impacto con enemigos
          for (const en of enemies) {
            if (!en.alive) continue;
            if (BABYLON.Vector3.Distance(bul.mesh.position, en.jet.position) < HIT_RADIUS) {
              en.alive = false;
              en.jet.setEnabled(false);
              en.trailSegs.forEach(s=>setTimeout(()=>s.mesh.dispose(),1500));
              bul.mesh.dispose();
              bullets.splice(i,1);
              killed++;
              setBotsDown(killed);
              setMessage("PROGRAMA DERREZADO");
              setTimeout(()=>setMessage(""),1200);

              // Respawn tras 5s
              setTimeout(()=>{
                if (disposed||gameDone) return;
                en.alive = true;
                en.jet.setEnabled(true);
                en.jet.position = new BABYLON.Vector3(
                  jetX+(Math.random()-0.5)*80,
                  jetY+(Math.random()-0.5)*30,
                  jetZ-100-Math.random()*80,
                );
                en.trailSegs = [];
                en.lastTrailPos = en.jet.position.clone();
              },5000);
              break;
            }
          }
        }

        // ── Bots: vuelan y esquivan ───────────────────────
        enemies.forEach((en,ei)=>{
          if (!en.alive) return;
          const pos = en.jet.position;

          // Cambio de dirección periódico
          en.evadeTimer -= dt;
          if (en.evadeTimer<=0) {
            en.evadeTimer = 1.0+Math.random()*2.0;
            // Alejarse del jugador lateralmente
            const awayX = (pos.x-jetX)*0.4 + (Math.random()-0.5)*30;
            const awayY = (pos.y-jetY)*0.3 + (Math.random()-0.5)*15;
            en.velX = awayX;
            en.velY = awayY;
          }

          pos.x += en.velX*dt*0.5;
          pos.y += en.velY*dt*0.5;
          pos.z += FLY_SPEED*dt; // mismo avance que el jugador

          // Reposicionar si se aleja demasiado
          const dz = pos.z-jetZ;
          if (dz>30||dz<-300) {
            pos.x = jetX+(Math.random()-0.5)*70;
            pos.y = jetY+(Math.random()-0.5)*25;
            pos.z = jetZ-90-Math.random()*80;
            en.velX = (Math.random()-0.5)*20;
            en.velY = (Math.random()-0.5)*10;
          }

          // Tilt visual del bot
          en.jet.rotation.z = BABYLON.Scalar.Lerp(en.jet.rotation.z, en.velX*0.01, dt*3);

          // Estela del bot
          if (BABYLON.Vector3.Distance(pos, en.lastTrailPos)>TRAIL_SEG_DIST) {
            addTrail(en, en.lastTrailPos, pos.clone());
            en.lastTrailPos = pos.clone();
          }
          // Expirar estela
          for (let i=en.trailSegs.length-1;i>=0;i--) {
            if (now-en.trailSegs[i].born>TRAIL_LIFE) {
              en.trailSegs[i].mesh.dispose();
              en.trailSegs.splice(i,1);
            }
          }
        });
      });

      engine.runRenderLoop(()=>{ if(!disposed) scene.render(); });
      window.addEventListener("resize",()=>engine.resize());
    };

    init().catch(console.error);
    return ()=>{
      disposed=true;
      if (engineRef.current) {
        engineRef.current.stopRenderLoop();
        engineRef.current.dispose();
      }
    };
  },[]);

  const danger = timeLeft<=10;
  const pct    = (timeLeft/SURVIVE_TIME)*100;

  return (
    <div style={{width:"100vw",height:"100vh",background:"#000",position:"relative"}}>
      <canvas ref={canvasRef}
        style={{width:"100%",height:"100%",display:"block",outline:"none"}}/>

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
          FASE 3 — COMBATE AÉREO<br/>
          <span style={{color:"#ff6600"}}>DERREZADOS: {botsDown}/{totalBots}</span>
        </div>

        {/* Timer */}
        <div style={{textAlign:"center",pointerEvents:"none"}}>
          <div style={{
            fontFamily:"'Orbitron',sans-serif",
            fontSize:"2.4rem",
            color: danger?"#ff0055":"#00f7ff",
            textShadow:`0 0 24px ${danger?"#ff0055":"#00f7ff"}`,
            lineHeight:1,
          }}>
            {String(Math.floor(timeLeft/60)).padStart(2,"0")}:{String(timeLeft%60).padStart(2,"0")}
          </div>
          <div style={{
            marginTop:6,width:120,height:3,
            background:"rgba(255,255,255,0.1)",
            borderRadius:2,overflow:"hidden",
          }}>
            <div style={{
              width:`${pct}%`,height:"100%",
              background:danger?"#ff0055":"#00f7ff",
              boxShadow:`0 0 8px ${danger?"#ff0055":"#00f7ff"}`,
              transition:"width 0.5s linear",
            }}/>
          </div>
          <div style={{
            marginTop:4,fontSize:"0.42rem",
            color:"rgba(0,247,255,0.4)",letterSpacing:"0.3em",
          }}>SUPERVIVENCIA</div>
        </div>

        <div style={{
          fontSize:"0.58rem",textAlign:"right",
          color:"rgba(255,255,255,0.35)",letterSpacing:"0.15em",
          borderRight:"2px solid rgba(0,247,255,0.3)",paddingRight:12,
        }}>
          NAVES ENEMIGAS<br/>
          <span style={{
            fontFamily:"'Orbitron',sans-serif",fontSize:"1.6rem",
            color:"#00f7ff",textShadow:"0 0 20px #00f7ff",
          }}>{Math.max(0,totalBots-botsDown)}</span>
          <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.2)"}}>/{totalBots}</span>
        </div>
      </div>

      {/* Crosshair de combate */}
      <div style={{
        position:"absolute",top:"50%",left:"50%",
        transform:"translate(-50%,-50%)",pointerEvents:"none",
      }}>
        <div style={{
          width:32,height:32,borderRadius:"50%",
          border:"1px solid rgba(0,247,255,0.45)",
          position:"absolute",top:"50%",left:"50%",
          transform:"translate(-50%,-50%)",
        }}/>
        {[0,90,180,270].map(deg=>(
          <div key={deg} style={{
            position:"absolute",top:"50%",left:"50%",
            width:9,height:1,
            background:"rgba(0,247,255,0.65)",
            transform:`translate(-50%,-50%) rotate(${deg}deg) translateX(20px)`,
          }}/>
        ))}
        <div style={{
          position:"absolute",top:"50%",left:"50%",
          transform:"translate(-50%,-50%)",
          width:3,height:3,borderRadius:"50%",
          background:"#00f7ff",boxShadow:"0 0 6px #00f7ff",
        }}/>
      </div>

      {/* Mensaje */}
      {message&&(
        <div style={{
          position:"absolute",top:"38%",left:"50%",
          transform:"translateX(-50%)",
          fontFamily:"'Orbitron',sans-serif",fontWeight:900,
          fontSize:"clamp(0.9rem,2.5vw,1.1rem)",
          color:message.includes("COMPLETA")?"#00f7ff":"#ff6600",
          textShadow:"0 0 30px currentColor",
          letterSpacing:"0.15em",pointerEvents:"none",
          whiteSpace:"nowrap",
        }}>{message}</div>
      )}

      {/* Controles */}
      <div style={{
        position:"absolute",bottom:20,left:"50%",
        transform:"translateX(-50%)",
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:"0.5rem",color:"rgba(0,247,255,0.3)",
        letterSpacing:"0.25em",pointerEvents:"none",
      }}>
        WASD — DIRECCIÓN &nbsp;·&nbsp; ESPACIO — DISPARAR
      </div>
    </div>
  );
}