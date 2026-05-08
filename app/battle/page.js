"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBattleStore } from "../../store/battle/useBattleStore";
import Lobby        from "../../store/battle/phases/Lobby";
import CapsulePhase from "../../store/battle/phases/Capsule";
import Phase1       from "../../store/battle/phases/Phase1";
import Phase2       from "../../store/battle/phases/Phase2";
import Phase3       from "../../store/battle/phases/Phase3";  // Combate aéreo naves
import Phase4       from "../../store/battle/phases/Phase4";  // Gran Estadio Light Cycles

/* -- Eliminado --------------------------------------------------- */
function EliminatedScreen({ onRetry }) {
  return (
    <div style={{
      width:"100vw", height:"100vh",
      background:"rgba(0,0,0,0.96)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Orbitron',sans-serif",
    }}>
      <div style={{
        fontSize:"clamp(2.5rem,7vw,4.5rem)", fontWeight:900,
        color:"#ff0055", textShadow:"0 0 50px #ff0055, 0 0 100px #ff005544",
        letterSpacing:"0.06em", marginBottom:14,
      }}>DERREZADO</div>
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:"0.65rem", color:"rgba(255,255,255,0.28)",
        letterSpacing:"0.35em", marginBottom:48,
      }}>TU PROGRAMA HA SIDO ELIMINADO DE LA RED</div>
      <button onClick={onRetry} style={{
        background:"transparent",
        border:"1px solid rgba(255,0,85,0.45)",
        color:"#ff0055", fontFamily:"'Orbitron',sans-serif",
        fontSize:"0.7rem", letterSpacing:"0.25em",
        padding:"14px 40px", cursor:"pointer",
      }}
        onMouseEnter={e=>{e.target.style.background="rgba(255,0,85,0.1)";e.target.style.boxShadow="0 0 20px rgba(255,0,85,0.3)";}}
        onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.boxShadow="none";}}
      >REINTENTAR</button>
    </div>
  );
}

/* -- Victoria ---------------------------------------------------- */
function VictoryScreen({ onBack }) {
  return (
    <div style={{
      width:"100vw", height:"100vh", background:"#010509",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Orbitron',sans-serif", position:"relative", overflow:"hidden",
    }}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.06}}>
        <defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0L0 0 0 60" fill="none" stroke="#00f7ff" strokeWidth="0.5"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>
      <div style={{fontSize:"3.5rem", marginBottom:24, color:"#00f7ff", textShadow:"0 0 40px #00f7ff"}}>◈</div>
      <div style={{
        fontSize:"clamp(1.4rem,4vw,2.4rem)", fontWeight:900,
        color:"#fff", letterSpacing:"0.08em", marginBottom:10,
        textShadow:"0 0 30px rgba(0,247,255,0.6)",
      }}>ÚLTIMO PROGRAMA EN PIE</div>
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:"0.6rem", color:"rgba(0,247,255,0.45)",
        letterSpacing:"0.3em", marginBottom:48,
      }}>HAS SOBREVIVIDO LAS 4 FASES — LA RED ES TUYA</div>
      <button onClick={onBack} style={{
        background:"transparent",
        border:"1px solid rgba(0,247,255,0.25)",
        color:"rgba(0,247,255,0.55)",
        fontFamily:"'Orbitron',sans-serif",
        fontSize:"0.65rem", letterSpacing:"0.2em",
        padding:"12px 32px", cursor:"pointer",
      }}
        onMouseEnter={e=>{e.target.style.borderColor="rgba(0,247,255,0.6)";e.target.style.color="#00f7ff";}}
        onMouseLeave={e=>{e.target.style.borderColor="rgba(0,247,255,0.25)";e.target.style.color="rgba(0,247,255,0.55)";}}
      >← VOLVER AL MENÚ</button>
    </div>
  );
}

/* -- Orquestador ------------------------------------------------- */
export default function BattlePage() {
  const router = useRouter();
  const { phase, setPhase, resetBattle } = useBattleStore();

  useEffect(() => { resetBattle(); }, []);

  return (
    <>
      {phase === "LOBBY" && (
        <Lobby onReady={() => setPhase("CAPSULE")} />
      )}

      {phase === "CAPSULE" && (
        <CapsulePhase onLand={() => setPhase("PHASE1")} />
      )}

      {/* Phase1 — Sprint a las motos */}
      {phase === "PHASE1" && (
        <Phase1 onComplete={(eliminated) =>
          setPhase(eliminated ? "ELIMINATED" : "PHASE2")
        }/>
      )}

      {/* Phase2 — Precipicio + tubos → llave para la nave */}
      {phase === "PHASE2" && (
        <Phase2 onComplete={(eliminated) =>
          setPhase(eliminated ? "ELIMINATED" : "PHASE3")
        }/>
      )}

      {/* Phase3 — Combate aéreo con naves (sobrevivir 60s) */}
      {phase === "PHASE3" && (
        <Phase3 onComplete={(eliminated) =>
          setPhase(eliminated ? "ELIMINATED" : "PHASE4")
        }/>
      )}

      {/* Phase4 — Gran Estadio Light Cycles (último en pie) */}
      {phase === "PHASE4" && (
        <Phase4 onComplete={(eliminated) =>
          setPhase(eliminated ? "ELIMINATED" : "VICTORY")
        }/>
      )}

      {phase === "ELIMINATED" && (
        <EliminatedScreen onRetry={() => resetBattle()} />
      )}

      {phase === "VICTORY" && (
        <VictoryScreen onBack={() => { resetBattle(); router.push("/"); }} />
      )}
    </>
  );
}