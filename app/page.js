// page.js
"use client";
import React, { useState, useEffect } from "react";
import Scene from "../store/ThreeEngine/Scene";
import { useGameStore } from "../store/useGameStore";

/* ─────────────────────────────────────────
   ESTILOS GLOBALES inyectados una sola vez
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cyan:   #00f7ff;
    --pink:   #ff0055;
    --orange: #ff6600;
    --dark:   #01040a;
    --glass:  rgba(0, 247, 255, 0.06);
    --font-display: 'Orbitron', sans-serif;
    --font-mono:    'Share Tech Mono', monospace;
  }

  /* Scanline sobre todo */
  body::after {
    content: '';
    position: fixed; inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.08) 2px,
      rgba(0,0,0,0.08) 4px
    );
    pointer-events: none;
    z-index: 9999;
  }

  /* ── Animaciones ── */
  @keyframes flicker {
    0%,100% { opacity: 1; }
    92%      { opacity: 1; }
    93%      { opacity: 0.4; }
    94%      { opacity: 1; }
    96%      { opacity: 0.6; }
    97%      { opacity: 1; }
  }
  @keyframes glitch {
    0%,100% { clip-path: inset(0 0 100% 0); transform: translateX(0); }
    20%  { clip-path: inset(20% 0 60% 0); transform: translateX(-4px); }
    40%  { clip-path: inset(50% 0 30% 0); transform: translateX(4px); }
    60%  { clip-path: inset(80% 0 5%  0); transform: translateX(-2px); }
    80%  { clip-path: inset(5%  0 80% 0); transform: translateX(2px); }
  }
  @keyframes pulse-border {
    0%,100% { box-shadow: 0 0 8px var(--cyan), inset 0 0 8px rgba(0,247,255,0.1); }
    50%     { box-shadow: 0 0 22px var(--cyan), inset 0 0 14px rgba(0,247,255,0.2); }
  }
  @keyframes slide-in-top {
    from { opacity:0; transform: translateY(-20px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes slide-in-bottom {
    from { opacity:0; transform: translateY(30px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity:0; } to { opacity:1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); } to { transform: rotate(360deg); }
  }
  @keyframes dash {
    0%   { stroke-dashoffset: 300; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes progress-glow {
    0%,100% { box-shadow: 0 0 6px var(--cyan), 0 0 12px rgba(0,247,255,0.4); }
    50%     { box-shadow: 0 0 14px var(--cyan), 0 0 28px rgba(0,247,255,0.6); }
  }
  @keyframes progress-flash {
    0%   { opacity: 1; }
    50%  { opacity: 0.5; }
    100% { opacity: 1; }
  }
  @keyframes milestone-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }

  /* ── Botón base ── */
  .btn {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: 0.12em;
    cursor: pointer;
    border: none;
    outline: none;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }
  .btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(0,247,255,0.15) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.4s ease;
  }
  .btn:hover::before { transform: translateX(100%); }

  /* ── Calidad pills ── */
  .quality-pill {
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    padding: 10px 28px;
    border: 1.5px solid var(--cyan);
    background: transparent;
    color: var(--cyan);
    cursor: pointer;
    transition: all 0.2s ease;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    position: relative;
  }
  .quality-pill.active {
    background: var(--cyan);
    color: var(--dark);
    box-shadow: 0 0 20px var(--cyan);
  }
  .quality-pill:hover:not(.active) {
    background: rgba(0,247,255,0.12);
    box-shadow: 0 0 12px rgba(0,247,255,0.4);
  }

  /* ── HUD bars ── */
  .hud-bar {
    height: 2px;
    background: linear-gradient(90deg, var(--cyan), transparent);
    margin: 4px 0;
  }

  /* ── Corner decorators ── */
  .corner-tl, .corner-tr, .corner-bl, .corner-br {
    position: absolute; width: 16px; height: 16px;
    border-color: var(--cyan); border-style: solid;
  }
  .corner-tl { top:0; left:0;  border-width: 2px 0 0 2px; }
  .corner-tr { top:0; right:0; border-width: 2px 2px 0 0; }
  .corner-bl { bottom:0; left:0;  border-width: 0 0 2px 2px; }
  .corner-br { bottom:0; right:0; border-width: 0 2px 2px 0; }
`;

function injectCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("juegotron-css")) return;
  const s = document.createElement("style");
  s.id = "juegotron-css";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

/* ── Componente: Barra de Progreso al Portal ──
   Lógica sincronizada con Portal.jsx:
     · PORTAL_SCORE_THRESHOLD = 300  → portal se activa (setPortalActive)
     · PORTAL_SPAWN_Z = -500         → portal aparece a 500u de distancia
     · pulso en Three.js cuando distanceToPlayer < 30
   Fases de la barra:
     [0 – 299]   GRID  cyan  #00f7ff  avanza 0→99%
     [300 – …]   GRID  cyan           portal activo, barra llena + pulso
     [SPACE]     naranja #ff6600       llena, sin cuenta regresiva
──────────────────────────────────────────────── */
const PORTAL_THRESHOLD = 300; // igual que Portal.jsx → PORTAL_SCORE_THRESHOLD

function ProgressBar({ score, dimension, portalActive, portalCollected }) {
  const isGrid   = dimension === "GRID";
  const isSpace  = dimension === "SPACE";
  const C        = isSpace ? "#ff6600" : "#00f7ff";          // color neón del vehículo
  const GLOW     = isSpace
    ? "0 0 10px #ff6600, 0 0 22px rgba(255,102,0,0.55)"
    : "0 0 10px #00f7ff, 0 0 22px rgba(0,247,255,0.55)";
  const FAINT    = isSpace ? "rgba(255,102,0,0.13)" : "rgba(0,247,255,0.13)";

  // ── Progreso real ──
  // · Antes del portal: 0 → ~99% (no llega a 100% hasta activarse)
  // · Portal activo (score ≥ 300): fijamos 100%
  // · SPACE: siempre 100% (ya pasaste)
  const pct = isSpace ? 100
    : portalActive ? 100
    : Math.min((score / PORTAL_THRESHOLD) * 100, 99);

  // Fase "CERCA": últimas 15% del trayecto (score ≥ 255) o portal ya spawneado
  const nearPortal = isGrid && (pct >= 85 || portalActive);
  // Fase "PORTAL ACTIVO": score alcanzó el umbral
  const portalReady = isGrid && portalActive && !portalCollected;

  // Etiqueta dinámica
  const label = isSpace
    ? "MODO ESPACIO"
    : portalReady
      ? "▸ ATRAVESAR PORTAL"
      : nearPortal
        ? "▸ PORTAL DETECTADO"
        : `${Math.floor(score)} / ${PORTAL_THRESHOLD} m`;

  return (
    <div style={{
      position: "absolute",
      // Zona exclusiva: top-0, altura 38px — el HUD empieza en top:44px
      top: 0, left: 0, right: 0,
      height: 38,
      zIndex: 56,
      pointerEvents: "none",
    }}>

      {/* Fondo semi-transparente solo en la franja de la barra */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(1,4,10,0.88) 60%, transparent 100%)",
      }} />

      {/* ══ CONTENIDO: centrado verticalmente en los 38px ══ */}
      <div style={{
        position: "absolute",
        top: "50%", transform: "translateY(-50%)",
        left: 0, right: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 18px",
      }}>

        {/* ── ETIQUETA IZQUIERDA (vehículo) ── */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 5,
          fontFamily: "var(--font-mono)",
          fontSize: "0.52rem",
          letterSpacing: "0.18em",
          color: C,
          textShadow: `0 0 8px ${C}`,
          whiteSpace: "nowrap",
          minWidth: 90,
        }}>
          <span style={{
            display: "inline-block", width: 6, height: 6,
            background: C,
            clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)",
            boxShadow: `0 0 6px ${C}`,
          }} />
          {isSpace ? "TRON SHIP" : "LIGHT CYCLE"}
        </div>

        {/* ── TRACK (ocupa todo el espacio central) ── */}
        <div style={{
          flex: 1,
          position: "relative",
          height: 5,
          background: FAINT,
          borderRadius: 3,
        }}>
          {/* Relleno */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, bottom: 0,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${C}44 0%, ${C} 100%)`,
            borderRadius: 3,
            transition: "width 0.4s ease",
            boxShadow: GLOW,
            animation: nearPortal
              ? "progress-flash 0.5s ease infinite"
              : "progress-glow 2.5s ease infinite",
          }} />

          {/* Punta viajera (solo cuando avanza) */}
          {pct > 1 && pct < 100 && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: `calc(${pct}% - 4px)`,
              transform: "translateY(-50%)",
              width: 8, height: 8,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: `0 0 5px #fff, 0 0 12px ${C}, 0 0 24px ${C}`,
              transition: "left 0.4s ease",
            }} />
          )}

          {/* Icono portal al final del track (solo GRID) */}
          {isGrid && (
            <div style={{
              position: "absolute",
              right: -14, top: "50%",
              transform: "translateY(-50%)",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" overflow="visible">
                {/* Anillo exterior — se ilumina al activarse */}
                <circle cx="7" cy="7" r="5.5" fill="none"
                  stroke={portalReady ? C : `${C}40`}
                  strokeWidth="1.4"
                  style={{
                    filter: portalReady ? `drop-shadow(0 0 5px ${C})` : "none",
                    transition: "all 0.5s ease",
                    animation: portalReady ? "progress-flash 0.5s ease infinite" : "none",
                  }}
                />
                {/* Núcleo — aparece cuando el portal está activo */}
                <circle cx="7" cy="7" r="2.5"
                  fill={portalReady ? `${C}88` : "none"}
                  stroke={portalReady ? "#fff" : `${C}22`}
                  strokeWidth="0.8"
                  style={{ transition: "all 0.5s ease" }}
                />
              </svg>
            </div>
          )}
        </div>

        {/* ── ETIQUETA DERECHA (estado) ── */}
        <div style={{
          flexShrink: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "0.52rem",
          letterSpacing: "0.14em",
          color: nearPortal ? "#fff" : `${C}99`,
          textShadow: nearPortal ? `0 0 10px ${C}` : "none",
          whiteSpace: "nowrap",
          minWidth: 150,
          textAlign: "right",
          animation: portalReady ? "progress-flash 0.6s ease infinite" : "none",
          transition: "color 0.3s ease",
        }}>
          {label}
        </div>

      </div>
    </div>
  );
}

/* ── Componente: HUD de puntuación ── */
function HUD({ score, isPaused, togglePause, dimension }) {
  return (
    <div style={{
      position: "absolute",
      // Empieza justo debajo de la ProgressBar (38px) con 10px de margen
      top: 48, left: 0, right: 0,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "0 20px",
      pointerEvents: "none",
      animation: "slide-in-top 0.5s ease both",
      zIndex: 50,
    }}>
      {/* Score + sistema */}
      <div style={{ position: "relative", padding: "12px 20px", background: "rgba(0,4,10,0.7)", border: "1px solid rgba(0,247,255,0.25)" }}>
        <div className="corner-tl" /><div className="corner-tr" /><div className="corner-bl" /><div className="corner-br" />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "rgba(0,247,255,0.5)", letterSpacing: "0.2em", marginBottom: 4 }}>
          SISTEMA: JUEGOTRON-{dimension === "SPACE" ? "ALFA" : "GRID"}
        </div>
        <div className="hud-bar" />
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 900, color: "#fff", textShadow: "0 0 16px var(--cyan)", letterSpacing: "0.08em", marginTop: 6 }}>
          {String(Math.floor(score)).padStart(6, "0")}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--cyan)", marginLeft: 8 }}>m</span>
        </div>
      </div>

      {/* Botón pausa */}
      <button
        className="btn"
        onClick={togglePause}
        style={{
          pointerEvents: "all",
          background: isPaused ? "var(--cyan)" : "rgba(0,4,10,0.7)",
          color: isPaused ? "var(--dark)" : "var(--cyan)",
          border: "1px solid var(--cyan)",
          padding: "10px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          boxShadow: isPaused ? "0 0 20px var(--cyan)" : "none",
        }}
      >
        {isPaused ? "▶ REANUDAR" : "⏸ PAUSA"}
      </button>
    </div>
  );
}

/* ── Componente: Menú de Pausa ── */
function PauseMenu({ onResume, onQuit }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      background: "rgba(0,4,10,0.82)",
      backdropFilter: "blur(6px)",
      zIndex: 80,
      animation: "fade-in 0.2s ease",
    }}>
      {/* Spinner decorativo */}
      <svg width="80" height="80" style={{ marginBottom: 24 }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(0,247,255,0.15)" strokeWidth="1.5" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="var(--cyan)" strokeWidth="1.5"
          strokeDasharray="60 166" style={{ animation: "spin 3s linear infinite", transformOrigin: "center" }} />
        <text x="40" y="46" textAnchor="middle" fill="var(--cyan)"
          style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em" }}>PAUSA</text>
      </svg>

      <button className="btn" onClick={onResume} style={{
        background: "var(--cyan)", color: "var(--dark)",
        padding: "14px 48px", fontSize: "0.85rem", letterSpacing: "0.2em",
        marginBottom: 14, boxShadow: "0 0 24px var(--cyan)",
      }}>CONTINUAR</button>

      <button className="btn" onClick={onQuit} style={{
        background: "transparent", color: "rgba(255,255,255,0.45)",
        border: "1px solid rgba(255,255,255,0.15)",
        padding: "10px 48px", fontSize: "0.75rem", letterSpacing: "0.2em",
      }}>SALIR AL MENÚ</button>
    </div>
  );
}

/* ── Componente: Pantalla de Game Over ── */
function GameOverScreen({ score, onRetry }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(8px)",
      zIndex: 100,
      animation: "fade-in 0.4s ease",
    }}>
      {/* Título con glitch */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 900,
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          color: "var(--pink)",
          textShadow: "0 0 30px var(--pink), 0 0 60px rgba(255,0,85,0.4)",
          letterSpacing: "0.06em",
          animation: "flicker 4s ease infinite",
        }}>CONEXIÓN PERDIDA</h2>
        {/* Glitch layer */}
        <h2 aria-hidden style={{
          position: "absolute", inset: 0,
          fontFamily: "var(--font-display)", fontWeight: 900,
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          color: "var(--cyan)", letterSpacing: "0.06em",
          animation: "glitch 2.5s steps(1) infinite",
          opacity: 0.6,
        }}>CONEXIÓN PERDIDA</h2>
      </div>

      {/* Score */}
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "1.1rem",
        color: "rgba(255,255,255,0.5)", marginBottom: 6, letterSpacing: "0.15em",
        animation: "slide-in-bottom 0.5s 0.2s ease both",
      }}>DISTANCIA FINAL</div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 900,
        fontSize: "clamp(2rem, 6vw, 3.5rem)",
        color: "#fff", textShadow: "0 0 20px rgba(255,255,255,0.4)",
        letterSpacing: "0.1em", marginBottom: 40,
        animation: "slide-in-bottom 0.5s 0.3s ease both",
      }}>
        {Math.floor(score).toLocaleString()}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--cyan)", marginLeft: 10 }}>m</span>
      </div>

      {/* Línea decorativa */}
      <div style={{ width: 200, height: 1, background: "linear-gradient(90deg, transparent, var(--pink), transparent)", marginBottom: 40 }} />

      <button className="btn" onClick={onRetry} style={{
        background: "var(--pink)", color: "#fff",
        padding: "16px 56px", fontSize: "0.9rem", letterSpacing: "0.2em",
        boxShadow: "0 0 30px rgba(255,0,85,0.5)",
        animation: "slide-in-bottom 0.5s 0.5s ease both",
      }}>REINTENTAR CONEXIÓN</button>
    </div>
  );
}

/* ── Componente: Menú Principal ── */
function MainMenu({ quality, setQuality, onStart }) {
  const [hovered, setHovered] = useState(false);

  const QUALITY_OPTIONS = [
    { id: "low",    label: "BAJA",  sub: "60+ FPS" },
    { id: "medium", label: "MEDIA", sub: "30-60 FPS" },
    { id: "high",   label: "ALTA",  sub: "GPU req." },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      background: "radial-gradient(ellipse at 50% 60%, rgba(0,60,80,0.45) 0%, rgba(0,4,10,0.95) 70%)",
      backdropFilter: "blur(2px)",
      zIndex: 200,
    }}>

      {/* Logo superior */}
      <div style={{ marginBottom: 8, animation: "slide-in-top 0.7s ease both" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "rgba(0,247,255,0.4)", letterSpacing: "0.4em", textAlign: "center", marginBottom: 10 }}>
          ▸ SISTEMA OPERATIVO v3.1.4 ◂
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontWeight: 900,
          fontSize: "clamp(3rem, 10vw, 6.5rem)",
          color: "var(--cyan)",
          textShadow: "0 0 40px var(--cyan), 0 0 80px rgba(0,247,255,0.3)",
          letterSpacing: "0.12em", lineHeight: 1,
          animation: "flicker 6s ease infinite",
        }}>NEONGAME</h1>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 400,
          fontSize: "clamp(0.7rem, 2vw, 1rem)",
          color: "rgba(0,247,255,0.5)",
          letterSpacing: "0.55em", textAlign: "right",
          marginTop: 4,
        }}>3 D · E D I T I O N</div>
      </div>

      {/* Línea divisora */}
      <div style={{ width: "min(340px, 80vw)", height: 1, background: "linear-gradient(90deg, transparent, var(--cyan), transparent)", margin: "28px 0", animation: "fade-in 1s 0.3s ease both", opacity: 0 }} />

      {/* Selector de calidad */}
      <div style={{ animation: "slide-in-bottom 0.6s 0.2s ease both", opacity: 0 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "0.62rem",
          color: "rgba(0,247,255,0.45)", letterSpacing: "0.25em",
          textAlign: "center", marginBottom: 14,
        }}>CALIDAD DE TRANSMISIÓN</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 40 }}>
          {QUALITY_OPTIONS.map((q) => (
            <div key={q.id} style={{ textAlign: "center" }}>
              <button
                className={`quality-pill ${quality === q.id ? "active" : ""}`}
                onClick={() => setQuality(q.id)}
              >{q.label}</button>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "0.55rem",
                color: quality === q.id ? "var(--cyan)" : "rgba(255,255,255,0.2)",
                letterSpacing: "0.1em", marginTop: 5,
              }}>{q.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón de inicio */}
      <div style={{ animation: "slide-in-bottom 0.6s 0.4s ease both", opacity: 0 }}>
        <button
          className="btn"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onStart}
          style={{
            background: hovered ? "var(--cyan)" : "transparent",
            color: hovered ? "var(--dark)" : "var(--cyan)",
            border: "2px solid var(--cyan)",
            padding: "18px 64px",
            fontSize: "clamp(0.85rem, 2vw, 1rem)",
            letterSpacing: "0.25em",
            boxShadow: hovered
              ? "0 0 40px var(--cyan), 0 0 80px rgba(0,247,255,0.3)"
              : "0 0 12px rgba(0,247,255,0.2)",
            animation: hovered ? "none" : "pulse-border 2.5s ease infinite",
          }}
        >INICIAR SECUENCIA</button>
      </div>

      {/* Controles */}
      <div style={{
        position: "absolute", bottom: 28,
        fontFamily: "var(--font-mono)", fontSize: "0.6rem",
        color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em",
        display: "flex", gap: 24,
        animation: "fade-in 1s 0.8s ease both", opacity: 0,
      }}>
        <span>[A/D] CARRIL</span>
        <span>[W/S] ALTURA</span>
        <span>[ESC] PAUSA</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────── */
export default function Home() {
  injectCSS();

  const {
    score, showGameOverUI, resetGame,
    quality, setQuality,
    isPaused, togglePause,
    dimension,
    portalActive, portalCollected,
  } = useGameStore();

  const [gameStarted, setGameStarted] = useState(false);

  // Tecla ESC para pausar
  useEffect(() => {
    if (!gameStarted) return;
    const onKey = (e) => {
      if (e.key === "Escape") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameStarted, togglePause]);

  const handleStart = () => setGameStarted(true);

  const handleRetry = () => {
    resetGame();
    setGameStarted(false);
  };

  const handleQuit = () => {
    resetGame();
    setGameStarted(false);
  };

  return (
    <main style={{
      width: "100vw", height: "100vh",
      background: "#000",
      position: "relative",
      overflow: "hidden",
      fontFamily: "var(--font-display)",
    }}>
      {/* Motor 3D siempre montado */}
      <Scene />

      {/* HUD en juego */}
      {gameStarted && !showGameOverUI && (
        <>
          <ProgressBar
            score={score}
            dimension={dimension}
            portalActive={portalActive}
            portalCollected={portalCollected}
          />
          <HUD
            score={score}
            isPaused={isPaused}
            togglePause={togglePause}
            dimension={dimension}
          />
        </>
      )}

      {/* Menú de pausa */}
      {gameStarted && isPaused && !showGameOverUI && (
        <PauseMenu onResume={togglePause} onQuit={handleQuit} />
      )}

      {/* Game Over */}
      {showGameOverUI && (
        <GameOverScreen score={score} onRetry={handleRetry} />
      )}

      {/* Menú principal */}
      {!gameStarted && (
        <MainMenu quality={quality} setQuality={setQuality} onStart={handleStart} />
      )}
    </main>
  );
}