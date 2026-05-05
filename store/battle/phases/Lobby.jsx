// phases/Lobby.jsx — Flynn's Arcade
// Sala oscura con máquinas recreativas neón.
// Bots se "conectan" progresivamente hasta llegar a 10.
// Cuando están todos → cuenta regresiva → DIGITALIZACIÓN
"use client";
import React, { useEffect, useState } from "react";
import { useBattleStore, BOT_NAMES } from "../useBattleStore";

const CSS = `
  @keyframes flicker { 0%,100%{opacity:1} 91%{opacity:1} 92%{opacity:.3} 93%{opacity:1} 96%{opacity:.6} 97%{opacity:1} }
  @keyframes fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse   { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes scanline{ 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes connect { from{width:0} to{width:100%} }
  @keyframes glow-pulse { 0%,100%{text-shadow:0 0 8px #00f7ff88} 50%{text-shadow:0 0 24px #00f7ffcc, 0 0 48px #00f7ff44} }
`;

// Máquina recreativa de TRON estilizada en SVG
function ArcadeMachine({ active, label }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      opacity: active ? 1 : 0.25,
      transition: "opacity 0.4s",
      animation: active ? "fade-in 0.3s ease" : "none",
    }}>
      <svg width="48" height="72" viewBox="0 0 48 72">
        {/* Cuerpo */}
        <rect x="4" y="18" width="40" height="50" rx="3"
          fill="#050a0f" stroke={active ? "#00f7ff" : "#1a2a30"} strokeWidth="1"/>
        {/* Pantalla */}
        <rect x="8" y="22" width="32" height="22" rx="2"
          fill={active ? "#001820" : "#050a0f"}
          stroke={active ? "#00f7ff" : "#0a1a20"} strokeWidth="0.8"/>
        {active && (
          <>
            {/* Contenido pantalla */}
            <line x1="14" y1="28" x2="34" y2="28" stroke="#00f7ff" strokeWidth="0.5" opacity="0.5"/>
            <line x1="14" y1="32" x2="28" y2="32" stroke="#00f7ff" strokeWidth="0.5" opacity="0.3"/>
            <circle cx="24" cy="38" r="4" fill="none" stroke="#00f7ff" strokeWidth="0.8" opacity="0.7"/>
          </>
        )}
        {/* Marquee superior */}
        <rect x="6" y="4" width="36" height="12" rx="2"
          fill={active ? "#001825" : "#050a0f"}
          stroke={active ? "#00f7ff" : "#0a1a20"} strokeWidth="0.8"/>
        {active && (
          <text x="24" y="13" textAnchor="middle"
            fill="#00f7ff" fontSize="5" fontFamily="monospace" opacity="0.9">
            TRON
          </text>
        )}
        {/* Controles */}
        <circle cx="18" cy="56" r="3" fill={active ? "#003040" : "#0a0a0a"}
          stroke={active ? "#00f7ff" : "#111"} strokeWidth="0.5"/>
        <rect x="26" y="53" width="4" height="3" rx="1"
          fill={active ? "#00f7ff33" : "#0a0a0a"}
          stroke={active ? "#00f7ff" : "#111"} strokeWidth="0.5"/>
        <rect x="32" y="53" width="4" height="3" rx="1"
          fill={active ? "#ff660033" : "#0a0a0a"}
          stroke={active ? "#ff6600" : "#111"} strokeWidth="0.5"/>
        {/* Base */}
        <rect x="8" y="64" width="32" height="6" rx="1"
          fill="#030608" stroke={active ? "#00f7ff33" : "#0a0f12"} strokeWidth="0.5"/>
      </svg>
      {label && (
        <div style={{
          fontFamily: "monospace", fontSize: "0.45rem",
          color: active ? "#00f7ff88" : "#1a2a30",
          letterSpacing: "0.1em",
        }}>{label}</div>
      )}
    </div>
  );
}

export default function Lobby({ onReady }) {
  const { lobbyCount, lobbyReady, addLobbyPlayer } = useBattleStore();
  const [countdown, setCountdown] = useState(null);
  const [connecting, setConnecting] = useState(true);

  // Simula la conexión progresiva de bots — uno cada 600ms
  useEffect(() => {
    if (lobbyCount >= 10) return;
    const interval = setInterval(() => {
      addLobbyPlayer();
    }, 600);
    return () => clearInterval(interval);
  }, [lobbyCount]);

  // Cuando están todos → cuenta regresiva de 3s → iniciar
  useEffect(() => {
    if (!lobbyReady) return;
    setConnecting(false);
    setCountdown(3);
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); setTimeout(onReady, 600); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [lobbyReady]);

  const allPlayers = ["USER", ...BOT_NAMES];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>
      <div style={{
        width: "100vw", height: "100vh",
        background: "#010509",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
      }}>

        {/* Scanline */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: "3px",
          background: "linear-gradient(90deg,transparent,rgba(0,247,255,0.08),transparent)",
          animation: "scanline 5s linear infinite", pointerEvents: "none",
        }}/>

        {/* Viñeta */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(1,5,9,0.92) 100%)",
        }}/>

        {/* Título Flynn's Arcade */}
        <div style={{ textAlign: "center", marginBottom: 32, zIndex: 2 }}>
          <div style={{
            fontSize: "clamp(0.5rem,1.2vw,0.65rem)",
            color: "rgba(0,247,255,0.35)", letterSpacing: "0.5em",
            marginBottom: 6,
          }}>▸ FLYNN'S ARCADE — THE GRID ◂</div>

          <h1 style={{
            fontSize: "clamp(1.8rem,5vw,3rem)", fontWeight: 900,
            color: "#fff", letterSpacing: "0.08em",
            textShadow: "0 0 30px rgba(0,247,255,0.4)",
            animation: "flicker 6s ease infinite",
            fontFamily: "'Orbitron', sans-serif",
          }}>SALA DE ESPERA</h1>

          <div style={{
            fontSize: "0.6rem", color: "rgba(0,247,255,0.4)",
            letterSpacing: "0.3em", marginTop: 6,
          }}>DIGITALIZACIÓN EN PROGRESO</div>
        </div>

        {/* Máquinas recreativas */}
        <div style={{
          display: "flex", gap: 16, marginBottom: 36,
          flexWrap: "wrap", justifyContent: "center",
          maxWidth: 600, zIndex: 2,
        }}>
          {Array.from({ length: 10 }, (_, i) => (
            <ArcadeMachine key={i} active={i < lobbyCount} label={i < lobbyCount ? allPlayers[i].slice(0,4) : null}/>
          ))}
        </div>

        {/* Lista de jugadores conectados */}
        <div style={{
          width: "min(480px, 90vw)",
          background: "rgba(0,247,255,0.02)",
          border: "1px solid rgba(0,247,255,0.1)",
          padding: "16px 20px",
          marginBottom: 24, zIndex: 2,
        }}>
          <div style={{
            fontSize: "0.55rem", color: "rgba(0,247,255,0.5)",
            letterSpacing: "0.3em", marginBottom: 12,
            borderBottom: "1px solid rgba(0,247,255,0.08)", paddingBottom: 8,
          }}>
            PROGRAMAS CONECTADOS [{lobbyCount}/10]
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
            {allPlayers.map((name, i) => (
              <div key={name} style={{
                fontSize: "0.6rem",
                color: i < lobbyCount
                  ? (i === 0 ? "#00f7ff" : "rgba(255,255,255,0.6)")
                  : "rgba(255,255,255,0.1)",
                letterSpacing: "0.1em",
                transition: "color 0.3s",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{
                  display: "inline-block", width: 5, height: 5,
                  borderRadius: "50%",
                  background: i < lobbyCount
                    ? (i === 0 ? "#00f7ff" : "#ffffff44")
                    : "#1a1a1a",
                  boxShadow: i < lobbyCount && i === 0 ? "0 0 6px #00f7ff" : "none",
                  transition: "background 0.3s",
                }}/>
                {name}
              </div>
            ))}
          </div>

          {/* Barra de progreso */}
          <div style={{
            marginTop: 14, height: 2,
            background: "rgba(0,247,255,0.08)",
            borderRadius: 1, overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${(lobbyCount / 10) * 100}%`,
              background: "linear-gradient(90deg, #00f7ff, #0088aa)",
              transition: "width 0.5s ease",
              boxShadow: "0 0 8px #00f7ff",
            }}/>
          </div>
        </div>

        {/* Estado / Cuenta regresiva */}
        <div style={{ zIndex: 2, textAlign: "center", minHeight: 60 }}>
          {!lobbyReady ? (
            <div style={{
              fontSize: "0.6rem", color: "rgba(0,247,255,0.4)",
              letterSpacing: "0.25em", animation: "pulse 1.5s ease infinite",
            }}>
              ESPERANDO PROGRAMAS...
            </div>
          ) : countdown > 0 ? (
            <div>
              <div style={{
                fontSize: "0.6rem", color: "rgba(0,247,255,0.5)",
                letterSpacing: "0.3em", marginBottom: 8,
              }}>INICIANDO DIGITALIZACIÓN</div>
              <div style={{
                fontSize: "clamp(3rem,8vw,5rem)", fontWeight: 900,
                color: "#00f7ff",
                textShadow: "0 0 40px #00f7ff, 0 0 80px #00f7ff44",
                fontFamily: "'Orbitron', sans-serif",
                animation: "glow-pulse 1s ease infinite",
              }}>{countdown}</div>
            </div>
          ) : (
            <div style={{
              fontSize: "clamp(1rem,3vw,1.4rem)", fontWeight: 900,
              color: "#ff6600",
              textShadow: "0 0 30px #ff6600",
              letterSpacing: "0.15em",
              fontFamily: "'Orbitron', sans-serif",
              animation: "flicker 0.5s ease infinite",
            }}>DIGITALIZANDO...</div>
          )}
        </div>

      </div>
    </>
  );
}