// page.js
"use client";
import React, { useState, useEffect, useRef } from "react";
import Scene from "../../store/ThreeEngine/Scene";
import { useGameStore } from "../../store/useGameStore";
import { useProgressStore } from "../../store/Useprogressstore";
import { ACHIEVEMENTS, ACHIEVEMENTS_MAP } from "../../store/Achievements";

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

/* ─────────────────────────────────────────
   DETECCIÓN DE DISPOSITIVO MÓVIL
   Se detecta una sola vez al montar. Cubre:
   · Touch nativo (smartphones/tablets)
   · User-Agent como fallback
───────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const touch = typeof window !== "undefined" && (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
    const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    setIsMobile(touch || ua);
  }, []);
  return isMobile;
}

/* ─────────────────────────────────────────
   HOOK: CONTROLES TÁCTILES
   Maneja swipe (deslizar) + tap rápido.
   · Swipe horizontal  → cambiar carril (moveLeft / moveRight)
   · Swipe vertical    → (reservado para altura futura)
   · Tap simple        → pausa / reanuda
   Umbral de swipe: 35px para ser responsivo pero no accidental.
   Se adjunta al elemento raíz del juego para capturar toda la pantalla.
───────────────────────────────────────── */
function useTouchControls({ enabled, moveLeft, moveRight, togglePause, isPaused }) {
  const touchStart = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const SWIPE_THRESHOLD   = 35;  // px mínimos para registrar swipe
    const TAP_MAX_DISTANCE  = 12;  // px máximos para registrar como tap
    const TAP_MAX_DURATION  = 200; // ms máximos para registrar como tap

    const onTouchStart = (e) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    };

    const onTouchEnd = (e) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.time;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Tap: sin movimiento significativo
      if (dist < TAP_MAX_DISTANCE && dt < TAP_MAX_DURATION) {
        togglePause();
        touchStart.current = null;
        return;
      }

      // Swipe: eje dominante horizontal
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) moveLeft();
        else        moveRight();
      }
      // Swipe vertical: reservado (altura)
      // else if (Math.abs(dy) > SWIPE_THRESHOLD) { ... }

      touchStart.current = null;
    };

    const onTouchCancel = () => { touchStart.current = null; };

    window.addEventListener("touchstart",  onTouchStart,  { passive: true });
    window.addEventListener("touchend",    onTouchEnd,    { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart",  onTouchStart);
      window.removeEventListener("touchend",    onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, moveLeft, moveRight, togglePause, isPaused]);
}

/* ─────────────────────────────────────────
   COMPONENTE: HUD TÁCTIL
   Botones D-pad visibles solo en móvil,
   superpuestos sobre el juego en la zona
   inferior de la pantalla.
   Diseño neón consistente con el resto del UI.
   · Botones izq/der para carril
   · Botón central grande = pausa
   Se usan onPointerDown para respuesta inmediata
   (más rápido que onClick en touch).
───────────────────────────────────────── */
function MobileDpad({ moveLeft, moveRight, togglePause, isPaused }) {
  const btnBase = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,4,10,0.75)",
    border: "1.5px solid rgba(0,247,255,0.35)",
    borderRadius: "50%",
    color: "var(--cyan)",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    boxShadow: "0 0 12px rgba(0,247,255,0.15), inset 0 0 8px rgba(0,247,255,0.05)",
    transition: "background 0.1s, box-shadow 0.1s",
    flexShrink: 0,
  };

  const handlePress = (fn) => (e) => {
    e.preventDefault();
    // Flash visual: el estado se maneja en CSS via :active
    fn();
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 32,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      {/* ── Flecha IZQUIERDA ── */}
      <button
        onPointerDown={handlePress(moveLeft)}
        style={{
          ...btnBase,
          width: 72,
          height: 72,
          fontSize: "1.8rem",
          pointerEvents: "all",
        }}
      >
        ◀
      </button>

      {/* ── Centro: PAUSA ── */}
      <button
        onPointerDown={handlePress(togglePause)}
        style={{
          ...btnBase,
          width: 54,
          height: 54,
          fontSize: "1rem",
          letterSpacing: "0.05em",
          border: isPaused
            ? "1.5px solid var(--cyan)"
            : "1.5px solid rgba(0,247,255,0.2)",
          background: isPaused
            ? "rgba(0,247,255,0.18)"
            : "rgba(0,4,10,0.6)",
          pointerEvents: "all",
        }}
      >
        {isPaused ? "▶" : "⏸"}
      </button>

      {/* ── Flecha DERECHA ── */}
      <button
        onPointerDown={handlePress(moveRight)}
        style={{
          ...btnBase,
          width: 72,
          height: 72,
          fontSize: "1.8rem",
          pointerEvents: "all",
        }}
      >
        ▶
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPONENTE: INDICADOR DE SWIPE
   Aparece solo la primera vez que el usuario
   entra al juego en móvil para enseñar el gesto.
   Se desvanece después de 3 segundos.
───────────────────────────────────────── */
function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 130,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        zIndex: 61,
        pointerEvents: "none",
        animation: "fade-in 0.4s ease both",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          color: "rgba(0,247,255,0.5)",
          fontSize: "1.6rem",
        }}
      >
        <span style={{ animation: "slide-in-top 0.6s 0.1s ease both", opacity: 0 }}>←</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.55rem",
          letterSpacing: "0.2em",
          color: "rgba(0,247,255,0.35)",
          whiteSpace: "nowrap",
        }}>
          DESLIZA O USA LOS BOTONES
        </span>
        <span style={{ animation: "slide-in-top 0.6s 0.2s ease both", opacity: 0 }}>→</span>
      </div>
    </div>
  );
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
  const isGrid = dimension === "GRID";
  const isSpace = dimension === "SPACE";
  const C = isSpace ? "#ff6600" : "#00f7ff"; // color neón del vehículo
  const GLOW = isSpace
    ? "0 0 10px #ff6600, 0 0 22px rgba(255,102,0,0.55)"
    : "0 0 10px #00f7ff, 0 0 22px rgba(0,247,255,0.55)";
  const FAINT = isSpace ? "rgba(255,102,0,0.13)" : "rgba(0,247,255,0.13)";

  // ── Progreso real ──
  // · Antes del portal: 0 → ~99% (no llega a 100% hasta activarse)
  // · Portal activo (score ≥ 300): fijamos 100%
  // · SPACE: siempre 100% (ya pasaste)
  const pct = isSpace
    ? 100
    : portalActive
      ? 100
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
    <div
      style={{
        position: "absolute",
        // Zona exclusiva: top-0, altura 38px — el HUD empieza en top:44px
        top: 0,
        left: 0,
        right: 0,
        height: 38,
        zIndex: 56,
        pointerEvents: "none",
      }}
    >
      {/* Fondo semi-transparente solo en la franja de la barra */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(1,4,10,0.88) 60%, transparent 100%)",
        }}
      />

      {/* ══ CONTENIDO: centrado verticalmente en los 38px ══ */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
        }}
      >
        {/* ── ETIQUETA IZQUIERDA (vehículo) ── */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-mono)",
            fontSize: "0.52rem",
            letterSpacing: "0.18em",
            color: C,
            textShadow: `0 0 8px ${C}`,
            whiteSpace: "nowrap",
            minWidth: 90,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              background: C,
              clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)",
              boxShadow: `0 0 6px ${C}`,
            }}
          />
          {isSpace ? "TRON SHIP" : "LIGHT CYCLE"}
        </div>

        {/* ── TRACK (ocupa todo el espacio central) ── */}
        <div
          style={{
            flex: 1,
            position: "relative",
            height: 5,
            background: FAINT,
            borderRadius: 3,
          }}
        >
          {/* Relleno */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${C}44 0%, ${C} 100%)`,
              borderRadius: 3,
              transition: "width 0.4s ease",
              boxShadow: GLOW,
              animation: nearPortal
                ? "progress-flash 0.5s ease infinite"
                : "progress-glow 2.5s ease infinite",
            }}
          />

          {/* Punta viajera (solo cuando avanza) */}
          {pct > 1 && pct < 100 && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `calc(${pct}% - 4px)`,
                transform: "translateY(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: `0 0 5px #fff, 0 0 12px ${C}, 0 0 24px ${C}`,
                transition: "left 0.4s ease",
              }}
            />
          )}

          {/* Icono portal al final del track (solo GRID) */}
          {isGrid && (
            <div
              style={{
                position: "absolute",
                right: -14,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                overflow="visible"
              >
                {/* Anillo exterior — se ilumina al activarse */}
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  fill="none"
                  stroke={portalReady ? C : `${C}40`}
                  strokeWidth="1.4"
                  style={{
                    filter: portalReady ? `drop-shadow(0 0 5px ${C})` : "none",
                    transition: "all 0.5s ease",
                    animation: portalReady
                      ? "progress-flash 0.5s ease infinite"
                      : "none",
                  }}
                />
                {/* Núcleo — aparece cuando el portal está activo */}
                <circle
                  cx="7"
                  cy="7"
                  r="2.5"
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
        <div
          style={{
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: "0.52rem",
            letterSpacing: "0.14em",
            color: nearPortal ? "#fff" : `${C}99`,
            textShadow: nearPortal ? `0 0 10px ${C}` : "none",
            whiteSpace: "nowrap",
            minWidth: 150,
            textAlign: "right",
            animation: portalReady
              ? "progress-flash 0.6s ease infinite"
              : "none",
            transition: "color 0.3s ease",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* ── Componente: HUD de puntuación ── */
function HUD({ score, isPaused, togglePause, dimension }) {
  return (
    <div
      style={{
        position: "absolute",
        // Empieza justo debajo de la ProgressBar (38px) con 10px de margen
        top: 48,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "0 20px",
        pointerEvents: "none",
        animation: "slide-in-top 0.5s ease both",
        zIndex: 50,
      }}
    >
      {/* Score + sistema */}
      <div
        style={{
          position: "relative",
          padding: "12px 20px",
          background: "rgba(0,4,10,0.7)",
          border: "1px solid rgba(0,247,255,0.25)",
        }}
      >
        <div className="corner-tl" />
        <div className="corner-tr" />
        <div className="corner-bl" />
        <div className="corner-br" />
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.62rem",
            color: "rgba(0,247,255,0.5)",
            letterSpacing: "0.2em",
            marginBottom: 4,
          }}
        >
          SISTEMA: JUEGOTRON-{dimension === "SPACE" ? "ALFA" : "GRID"}
        </div>
        <div className="hud-bar" />
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.6rem",
            fontWeight: 900,
            color: "#fff",
            textShadow: "0 0 16px var(--cyan)",
            letterSpacing: "0.08em",
            marginTop: 6,
          }}
        >
          {String(Math.floor(score)).padStart(6, "0")}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--cyan)",
              marginLeft: 8,
            }}
          >
            m
          </span>
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
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(0,4,10,0.82)",
        backdropFilter: "blur(6px)",
        zIndex: 80,
        animation: "fade-in 0.2s ease",
      }}
    >
      {/* Spinner decorativo */}
      <svg width="80" height="80" style={{ marginBottom: 24 }}>
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="rgba(0,247,255,0.15)"
          strokeWidth="1.5"
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="var(--cyan)"
          strokeWidth="1.5"
          strokeDasharray="60 166"
          style={{
            animation: "spin 3s linear infinite",
            transformOrigin: "center",
          }}
        />
        <text
          x="40"
          y="46"
          textAnchor="middle"
          fill="var(--cyan)"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          PAUSA
        </text>
      </svg>

      <button
        className="btn"
        onClick={onResume}
        style={{
          background: "var(--cyan)",
          color: "var(--dark)",
          padding: "14px 48px",
          fontSize: "0.85rem",
          letterSpacing: "0.2em",
          marginBottom: 14,
          boxShadow: "0 0 24px var(--cyan)",
        }}
      >
        CONTINUAR
      </button>

      <button
        className="btn"
        onClick={onQuit}
        style={{
          background: "transparent",
          color: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "10px 48px",
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
        }}
      >
        SALIR AL MENÚ
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE PROGRESIÓN — COMPONENTES UI
═══════════════════════════════════════════════════════════════ */

/* ── Toast de logro desbloqueado (aparece in-game) ─────────── */
function AchievementToast() {
  const toast    = useProgressStore((s) => s.pendingToast);
  const clearToast = useProgressStore((s) => s.clearToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(clearToast, 500);
    }, 3500);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div style={{
      position: "absolute",
      top: 80,
      right: 20,
      zIndex: 150,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "rgba(0,4,10,0.92)",
      border: `1px solid ${toast.color}`,
      boxShadow: `0 0 24px ${toast.color}44`,
      padding: "12px 18px",
      maxWidth: 280,
      transform: visible ? "translateX(0)" : "translateX(120%)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.45s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease",
      backdropFilter: "blur(8px)",
    }}>
      {/* Etiqueta superior */}
      <div style={{ position: "absolute", top: -9, left: 12 }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.5rem",
          letterSpacing: "0.25em",
          color: toast.color,
          background: "#01040a",
          padding: "1px 6px",
        }}>LOGRO DESBLOQUEADO</span>
      </div>
      {/* Icono */}
      <div style={{
        fontSize: "1.6rem",
        color: toast.color,
        textShadow: `0 0 12px ${toast.color}`,
        flexShrink: 0,
      }}>{toast.icon}</div>
      {/* Texto */}
      <div>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.75rem",
          color: "#fff",
          letterSpacing: "0.08em",
          marginBottom: 2,
        }}>{toast.title}</div>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.55rem",
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.06em",
        }}>{toast.desc}</div>
      </div>
    </div>
  );
}

/* ── Input de iniciales arcade ──────────────────────────────── */
function InitialsInput({ onSubmit }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleKey = (e) => {
    if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "0.6rem",
        color: "var(--cyan)", letterSpacing: "0.3em",
      }}>INGRESA TUS INICIALES</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={value}
          maxLength={3}
          onChange={(e) => setValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          onKeyDown={handleKey}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "2px solid var(--cyan)",
            color: "var(--cyan)",
            fontFamily: "var(--font-display)",
            fontSize: "1.8rem",
            width: 90,
            textAlign: "center",
            letterSpacing: "0.3em",
            outline: "none",
            caretColor: "var(--cyan)",
            textShadow: "0 0 12px var(--cyan)",
          }}
          placeholder="___"
          autoComplete="off"
        />
        <button
          onClick={() => value.trim() && onSubmit(value.trim())}
          style={{
            background: "transparent",
            border: "1px solid var(--cyan)",
            color: "var(--cyan)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >OK</button>
      </div>
    </div>
  );
}

/* ── Pantalla de Game Over rediseñada ───────────────────────── */
function GameOverScreen({ score, onRetry }) {
  const { highScore }        = useGameStore();
  const {
    leaderboard, submitScore,
    unlockedIds, newlyUnlockedIds,
  } = useProgressStore();

  const finalScore  = Math.floor(score);
  const isNewRecord = finalScore >= highScore && finalScore > 0;
  const [tab, setTab]           = useState("score");   // "score" | "logros" | "ranking"
  const [nameSubmitted, setNameSubmitted] = useState(false);

  const handleSubmitName = (name) => {
    submitScore(name);
    setNameSubmitted(true);
  };

  // ¿Hay una entrada pendiente de nombre en el leaderboard?
  const pendingEntry = leaderboard[0]?.pending;

  const tabStyle = (active) => ({
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    letterSpacing: "0.2em",
    padding: "8px 16px",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid var(--cyan)" : "2px solid transparent",
    color: active ? "var(--cyan)" : "rgba(255,255,255,0.3)",
    transition: "all 0.2s",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      background: "rgba(0,0,0,0.93)",
      backdropFilter: "blur(12px)",
      zIndex: 100,
      animation: "fade-in 0.4s ease",
    }}>
      {/* Título */}
      <h2 style={{
        fontFamily: "var(--font-display)", fontWeight: 900,
        fontSize: "clamp(1.8rem, 5vw, 3.2rem)",
        color: "var(--pink)",
        textShadow: "0 0 30px var(--pink)",
        letterSpacing: "0.06em",
        animation: "flicker 4s ease infinite",
        marginBottom: 6,
      }}>CONEXIÓN PERDIDA</h2>

      {/* Score grande */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{
          fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.4)",
          fontSize: "0.7rem", letterSpacing: "0.25em",
        }}>DISTANCIA RECORRIDA</div>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 8vw, 4rem)",
          color: "#fff",
          textShadow: isNewRecord ? "0 0 20px var(--cyan)" : "0 0 20px var(--pink)",
          lineHeight: 1.1,
        }}>
          {finalScore}
          <span style={{ fontSize: "1rem", color: "var(--cyan)", marginLeft: 5 }}>m</span>
        </div>
        {isNewRecord && (
          <div style={{
            fontFamily: "var(--font-mono)", color: "var(--cyan)",
            fontSize: "0.6rem", letterSpacing: "0.15em",
            animation: "pulse-border 2s infinite",
          }}>★ NUEVO RÉCORD DEL SISTEMA ★</div>
        )}
      </div>

      {/* Input de iniciales si es top-10 y no ha ingresado nombre */}
      {pendingEntry && !nameSubmitted && (
        <InitialsInput onSubmit={handleSubmitName} />
      )}

      {/* Tabs de navegación */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid rgba(0,247,255,0.15)",
        marginBottom: 16, width: "min(380px, 92vw)",
      }}>
        <button style={tabStyle(tab === "score")}   onClick={() => setTab("score")}>PARTIDA</button>
        <button style={tabStyle(tab === "logros")}  onClick={() => setTab("logros")}>LOGROS</button>
        <button style={tabStyle(tab === "ranking")} onClick={() => setTab("ranking")}>RANKING</button>
      </div>

      {/* Panel de contenido */}
      <div style={{
        width: "min(380px, 92vw)",
        minHeight: 180,
        background: "rgba(0,247,255,0.03)",
        border: "1px solid rgba(0,247,255,0.12)",
        padding: "16px",
        marginBottom: 20,
        position: "relative",
        overflowY: "auto",
        maxHeight: "38vh",
      }}>
        <div className="corner-tl" /><div className="corner-br" />

        {/* ── Tab: Partida actual ── */}
        {tab === "score" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.6rem",
              color: "var(--cyan)", letterSpacing: "0.25em",
              marginBottom: 8, borderBottom: "1px solid rgba(0,247,255,0.15)",
              paddingBottom: 8,
            }}>DATOS DE SINCRONIZACIÓN</div>
            {[
              ["RÉCORD PERSONAL", `${highScore}m`, highScore === finalScore],
              ["DIFERENCIA",
                isNewRecord ? `+${finalScore - (highScore - finalScore)}m` : `${finalScore - highScore}m`,
                isNewRecord],
            ].map(([label, val, highlight]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: "var(--font-mono)", fontSize: "0.8rem",
                color: highlight ? "var(--cyan)" : "rgba(255,255,255,0.55)",
                padding: "4px 0",
              }}>
                <span>{label}</span>
                <span style={{ color: highlight ? "var(--cyan)" : "#fff" }}>{val}</span>
              </div>
            ))}
            {/* Logros recién desbloqueados en esta partida */}
            {newlyUnlockedIds?.length > 0 && (
              <>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.55rem",
                  color: "rgba(255,165,0,0.7)", letterSpacing: "0.2em",
                  marginTop: 10, marginBottom: 4,
                }}>LOGROS DESBLOQUEADOS ESTA PARTIDA</div>
                {newlyUnlockedIds.map((id) => {
                  const a = ACHIEVEMENTS_MAP[id];
                  if (!a) return null;
                  return (
                    <div key={id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "6px 8px",
                      background: `${a.color}11`,
                      border: `1px solid ${a.color}33`,
                    }}>
                      <span style={{ color: a.color, fontSize: "1rem" }}>{a.icon}</span>
                      <div>
                        <div style={{
                          fontFamily: "var(--font-display)", fontSize: "0.65rem",
                          color: a.color, letterSpacing: "0.06em",
                        }}>{a.title}</div>
                        <div style={{
                          fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                          color: "rgba(255,255,255,0.4)",
                        }}>{a.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Todos los logros ── */}
        {tab === "logros" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.6rem",
              color: "var(--cyan)", letterSpacing: "0.25em",
              marginBottom: 8, borderBottom: "1px solid rgba(0,247,255,0.15)",
              paddingBottom: 8,
            }}>
              {unlockedIds.length}/{ACHIEVEMENTS.length} LOGROS DESBLOQUEADOS
            </div>
            {ACHIEVEMENTS.map((a) => {
              const unlocked = unlockedIds.includes(a.id);
              const isNew    = newlyUnlockedIds?.includes(a.id);
              return (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px",
                  background: isNew ? `${a.color}18` : unlocked ? `${a.color}08` : "transparent",
                  border: isNew ? `1px solid ${a.color}55` : "1px solid transparent",
                  opacity: unlocked ? 1 : 0.35,
                  transition: "opacity 0.2s",
                }}>
                  <span style={{
                    fontSize: "1.1rem",
                    color: unlocked ? a.color : "#555",
                    textShadow: unlocked ? `0 0 8px ${a.color}` : "none",
                    flexShrink: 0,
                  }}>{unlocked ? a.icon : "◻"}</span>
                  <div>
                    <div style={{
                      fontFamily: "var(--font-display)", fontSize: "0.65rem",
                      color: unlocked ? "#fff" : "#444",
                      letterSpacing: "0.06em",
                    }}>{unlocked ? a.title : "???"}</div>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                      color: unlocked ? "rgba(255,255,255,0.4)" : "#333",
                    }}>{unlocked ? a.desc : "Sigue jugando para descubrirlo"}</div>
                  </div>
                  {isNew && (
                    <span style={{
                      marginLeft: "auto", flexShrink: 0,
                      fontFamily: "var(--font-mono)", fontSize: "0.5rem",
                      color: a.color, letterSpacing: "0.1em",
                    }}>NUEVO</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tab: Ranking local ── */}
        {tab === "ranking" && (
          <div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "0.6rem",
              color: "var(--cyan)", letterSpacing: "0.25em",
              marginBottom: 12, borderBottom: "1px solid rgba(0,247,255,0.15)",
              paddingBottom: 8,
            }}>TOP 10 — MÁQUINA LOCAL</div>
            {leaderboard.length === 0 ? (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 20,
              }}>SIN REGISTROS</div>
            ) : leaderboard.map((entry, i) => {
              const isMe = i === 0 && (entry.pending || nameSubmitted);
              const medals = ["◆","▲","●"];
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 8px",
                  background: isMe ? "rgba(0,247,255,0.06)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  fontFamily: "var(--font-mono)",
                }}>
                  <span style={{
                    fontSize: i < 3 ? "1rem" : "0.75rem",
                    color: i === 0 ? "#ffe066" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.25)",
                    width: 22, textAlign: "center", flexShrink: 0,
                  }}>{i < 3 ? medals[i] : `${i+1}`}</span>
                  <span style={{
                    color: isMe ? "var(--cyan)" : "#fff",
                    fontSize: "0.9rem",
                    letterSpacing: "0.15em",
                    flex: 1,
                    textShadow: isMe ? "0 0 8px var(--cyan)" : "none",
                  }}>
                    {entry.pending ? (nameSubmitted ? entry.name : "...") : (entry.name || "???")}
                  </span>
                  <span style={{
                    color: isMe ? "var(--cyan)" : "rgba(255,255,255,0.6)",
                    fontSize: "0.85rem",
                  }}>{entry.score}m</span>
                  <span style={{
                    fontSize: "0.55rem",
                    color: "rgba(255,255,255,0.2)",
                    letterSpacing: "0.1em",
                  }}>{entry.dimension}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón de reintento */}
      <button
        className="btn"
        onClick={onRetry}
        style={{
          background: "var(--pink)",
          color: "#fff",
          padding: "14px 48px",
          fontSize: "0.85rem",
          letterSpacing: "0.2em",
          boxShadow: "0 0 30px rgba(255,0,85,0.5)",
        }}
      >
        REINICIAR INTERFAZ
      </button>
    </div>
  );
}


/* ── Componente: Menú Principal ── */
function MainMenu({ quality, setQuality, onStart, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const highScore = useGameStore((state) => state.highScore);
  const QUALITY_OPTIONS = [
    { id: "low",    label: "BAJA",  sub: "60+ FPS"  },
    { id: "medium", label: "MEDIA", sub: "30-60 FPS" },
    { id: "high",   label: "ALTA",  sub: "GPU req."  },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background:
          "radial-gradient(ellipse at 50% 60%, rgba(0,60,80,0.45) 0%, rgba(0,4,10,0.95) 70%)",
        backdropFilter: "blur(2px)",
        zIndex: 200,
      }}
    >
      {/* Logo superior */}
      <div
        style={{ marginBottom: 8, animation: "slide-in-top 0.7s ease both" }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            color: "rgba(0,247,255,0.4)",
            letterSpacing: "0.4em",
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          ▸ SISTEMA OPERATIVO v3.1.4 ◂
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(3rem, 10vw, 6.5rem)",
            color: "var(--cyan)",
            textShadow: "0 0 40px var(--cyan), 0 0 80px rgba(0,247,255,0.3)",
            letterSpacing: "0.12em",
            lineHeight: 1,
            animation: "flicker 6s ease infinite",
          }}
        >
          NEONGAME
        </h1>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(0.7rem, 2vw, 1rem)",
            color: "rgba(0,247,255,0.5)",
            letterSpacing: "0.55em",
            textAlign: "right",
            marginTop: 4,
          }}
        >
          3 D · E D I T I O N
        </div>
      </div>

      {/* Línea divisora */}
      <div
        style={{
          width: "min(340px, 80vw)",
          height: 1,
          background:
            "linear-gradient(90deg, transparent, var(--cyan), transparent)",
          margin: "28px 0",
          animation: "fade-in 1s 0.3s ease both",
          opacity: 0,
        }}
      />

      {/* Selector de calidad */}
      <div
        style={{ animation: "slide-in-bottom 0.6s 0.2s ease both", opacity: 0 }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.62rem",
            color: "rgba(0,247,255,0.45)",
            letterSpacing: "0.25em",
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          CALIDAD DE TRANSMISIÓN
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          {QUALITY_OPTIONS.map((q) => (
            <div key={q.id} style={{ textAlign: "center" }}>
              <button
                className={`quality-pill ${quality === q.id ? "active" : ""}`}
                onClick={() => setQuality(q.id)}
              >
                {q.label}
              </button>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.55rem",
                  color:
                    quality === q.id ? "var(--cyan)" : "rgba(255,255,255,0.2)",
                  letterSpacing: "0.1em",
                  marginTop: 5,
                }}
              >
                {q.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón de inicio */}
      <div
        style={{ animation: "slide-in-bottom 0.6s 0.4s ease both", opacity: 0 }}
      >
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
        >
          INICIAR SECUENCIA
        </button>
      </div>

      {/* Controles — adaptativos: teclado en desktop, gestos en móvil */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          fontFamily: "var(--font-mono)",
          fontSize: "0.6rem",
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.15em",
          display: "flex",
          gap: isMobile ? 16 : 24,
          animation: "fade-in 1s 0.8s ease both",
          opacity: 0,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "0 20px",
          textAlign: "center",
        }}
      >
        {isMobile ? (
          <>
            <span>← → DESLIZA CARRIL</span>
            <span>TAP PAUSA</span>
          </>
        ) : (
          <>
            <span>[A/D] CARRIL</span>
            <span>[W/S] ALTURA</span>
            <span>[ESC] PAUSA</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOTOR DE AUDIO — TRON LEGACY ENGINE
   ───────────────────────────────────────────────────────────────────
   Inspirado en la banda sonora de Daft Punk para Tron: Legacy (2010).
   Arquitectura de 5 capas sincronizadas con el estado del juego:

   1. KICK        — bombo electrónico con pitch-sweep (estilo Derezzed)
   2. HIHAT        — ruido filtrado con hi-pass (snappy, digital)
   3. BASS         — sawtooth con filtro LP resonante (The Grid / End of Line)
   4. ARPEGGIO     — square wave octavado (Derezzed / Recognizer)
   5. PAD          — triángulos en acorde (orquesta sintética, Overture)

   Escalas por dimensión:
   · GRID  → C# menor natural   (oscuro, tenso, digital)   BPM base: 114
   · SPACE → C# frigio           (más agresivo, máquinas)   BPM base: 126
   · REAL  → A menor natural    (cálido, orgánico, humano)  BPM base: 102

   Cadena de señal:
   osciladores → filter → gain → [reverb wet] ─┐
                                                ├→ compressor → master → output
                              [delay feedback] ─┘

   El tempo se acelera dinámicamente con la velocidad del jugador.
   Al cruzar portales hay una transición suave de 2s entre tonalidades.
═══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────── */
function createGameMusic() {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  const ctx        = new AudioContext();
  const master     = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();

  // ── Reverb sintético (convolution simulada con delay en bucle corto) ──
  const reverbDelay    = ctx.createDelay(0.08);
  const reverbFeedback = ctx.createGain();
  const reverbWet      = ctx.createGain();
  reverbDelay.delayTime.value    = 0.055;
  reverbFeedback.gain.value      = 0.38;   // cola larga tipo sala grande
  reverbWet.gain.value           = 0.22;

  // ── Delay estereofónico (sello Daft Punk — 1/8 de nota) ──
  const echoDelay    = ctx.createDelay(0.5);
  const echoFeedback = ctx.createGain();
  const echoWet      = ctx.createGain();
  echoDelay.delayTime.value  = 0.125;      // 1/8 a 120bpm
  echoFeedback.gain.value    = 0.28;
  echoWet.gain.value         = 0.16;

  // ── Compresor (limiter suave, estilo mastering electrónico) ──
  compressor.threshold.value = -14;
  compressor.knee.value      = 10;
  compressor.ratio.value     = 6;
  compressor.attack.value    = 0.003;
  compressor.release.value   = 0.12;

  // ── Routing ──
  master.gain.value = 0;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  // Reverb loop
  master.connect(reverbDelay);
  reverbDelay.connect(reverbFeedback);
  reverbFeedback.connect(reverbDelay);
  reverbDelay.connect(reverbWet);
  reverbWet.connect(compressor);

  // Echo
  master.connect(echoDelay);
  echoDelay.connect(echoFeedback);
  echoFeedback.connect(echoDelay);
  echoDelay.connect(echoWet);
  echoWet.connect(compressor);

  // ── Frecuencia raíz por dimensión (en Hz, nota C# = 277.18 Hz) ──
  //    GRID:  C#3 = 138.59 Hz  (C# menor natural)
  //    SPACE: C#3 = 138.59 Hz  (C# frigio — mismo root, escala diferente)
  //    REAL:  A2  = 110.00 Hz  (A menor natural)
  const ROOT = { GRID: 138.59, SPACE: 138.59, REAL: 110.0 };

  // ── Escalas en semitonos sobre el root ──
  // C# menor natural: C# D# E F# G# A B
  const SCALE_GRID  = [0, 2, 3, 5, 7, 8, 10, 12];
  // C# frigio: C# D E F# G# A B (2º modo de B mayor — más oscuro)
  const SCALE_SPACE = [0, 1, 3, 5, 7, 8, 10, 12];
  // A menor natural: A B C D E F G
  const SCALE_REAL  = [0, 2, 3, 5, 7, 8, 10, 12];

  // ── Patrones de bajo (índices en la escala, 8 pasos) ──
  // Inspirado en el riff de "End of Line" — root, quinta, séptima
  const BASS_GRID  = [0, 0, 4, 0, 6, 4, 3, 1];  // C# - G# - B - C# groove
  const BASS_SPACE = [0, 0, 0, 3, 5, 3, 1, 0];  // más repetitivo, urgente
  const BASS_REAL  = [0, 2, 3, 2, 0, 5, 4, 2];  // A menor, más melódico

  // ── Patrones de arpegio (16 pasos, una octava arriba) ──
  // Inspirado en Derezzed — pulsante, cuadrado, mecánico
  const ARP_GRID  = [7,12,7,10, 8,12,8,10, 5,12,5, 8, 3,10,3, 7];
  const ARP_SPACE = [7,14,7,12, 8,14,8,12, 5,12,5,10, 3,12,3,10];
  const ARP_REAL  = [7,10,7, 8, 5,10,5, 8, 3, 8,3, 7, 0, 7,2, 5];

  // ── Acordes de pad (triadas en posición cerrada) ──
  // Inspirado en los pads orquestales de "Overture" y "The Grid"
  const PAD_CHORDS = {
    GRID:  [[0,3,7], [8,12,15], [5,8,12], [3,7,10]],   // i - VI - III - VII
    SPACE: [[0,3,7], [1,5, 8], [5,8,12], [3,6,10]],    // más disonante
    REAL:  [[0,3,7], [5,8,12], [3,7,10], [2,5, 9]],    // Am - Dm - Em - Bm°
  };

  let step      = 0;
  let scheduler = null;
  let curDim    = "GRID";

  // Convierte índice de escala + octava a frecuencia absoluta
  const scaleFreq = (scaleIdx, octave, dim) => {
    const scale = dim === "SPACE" ? SCALE_SPACE : dim === "REAL" ? SCALE_REAL : SCALE_GRID;
    const semitone = scale[scaleIdx % scale.length] + (octave * 12);
    return ROOT[dim] * Math.pow(2, semitone / 12);
  };

  // ── KICK: bombo electrónico pitch-sweep (Derezzed style) ──
  const playKick = (time, intensity = 1.0) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const dist = ctx.createWaveShaper();
    // Waveshaper suave para saturación analógica
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
    }
    dist.curve = curve;
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.14);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.55 * intensity, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(dist); dist.connect(gain); gain.connect(master);
    osc.start(time); osc.stop(time + 0.25);
  };

  // ── SNARE electrónico (ruido blanco + tono) ──
  const playSnare = (time) => {
    // Componente de ruido
    const bufLen = ctx.sampleRate * 0.12;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
    const noise  = ctx.createBufferSource();
    const nGain  = ctx.createGain();
    const nFilt  = ctx.createBiquadFilter();
    noise.buffer = buf;
    nFilt.type   = "bandpass";
    nFilt.frequency.value = 2800;
    nFilt.Q.value         = 0.9;
    nGain.gain.setValueAtTime(0.0001, time);
    nGain.gain.exponentialRampToValueAtTime(0.18, time + 0.004);
    nGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(master);
    noise.start(time); noise.stop(time + 0.13);
    // Componente tonal (crack)
    const osc  = ctx.createOscillator();
    const oGain= ctx.createGain();
    osc.type   = "triangle";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.06);
    oGain.gain.setValueAtTime(0.0001, time);
    oGain.gain.exponentialRampToValueAtTime(0.09, time + 0.003);
    oGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    osc.connect(oGain); oGain.connect(master);
    osc.start(time); osc.stop(time + 0.08);
  };

  // ── HIHAT: ruido hi-pass (metálico, digital) ──
  const playHat = (time, open = false) => {
    const bufLen = ctx.sampleRate * (open ? 0.18 : 0.04);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, open ? 0.8 : 2.0);
    const noise  = ctx.createBufferSource();
    const gain   = ctx.createGain();
    const filt   = ctx.createBiquadFilter();
    noise.buffer = buf;
    filt.type    = "highpass";
    filt.frequency.value = 7000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(open ? 0.06 : 0.045, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (open ? 0.18 : 0.04));
    noise.connect(filt); filt.connect(gain); gain.connect(master);
    noise.start(time); noise.stop(time + (open ? 0.2 : 0.05));
  };

  // ── BAJO SAWTOOTH con filtro LP resonante (End of Line style) ──
  const playBass = (time, freq, dur, dim) => {
    const osc1  = ctx.createOscillator();
    const osc2  = ctx.createOscillator(); // sub-octave para cuerpo
    const filt  = ctx.createBiquadFilter();
    const gain  = ctx.createGain();
    // Filtro LP resonante — característico del bajo de Tron
    filt.type             = "lowpass";
    filt.frequency.setValueAtTime(400, time);
    filt.frequency.exponentialRampToValueAtTime(dim === "REAL" ? 900 : 1400, time + 0.04);
    filt.frequency.exponentialRampToValueAtTime(600, time + dur * 0.7);
    filt.Q.value          = 4.5;  // resonancia pronunciada
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = "square";
    osc2.frequency.setValueAtTime(freq / 2, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(dim === "REAL" ? 0.065 : 0.095, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc1.connect(filt); osc2.connect(filt);
    filt.connect(gain); gain.connect(master);
    osc1.start(time); osc1.stop(time + dur + 0.05);
    osc2.start(time); osc2.stop(time + dur + 0.05);
  };

  // ── ARPEGIO SQUARE (Derezzed / Recognizer — mecánico, cuadrado) ──
  const playArp = (time, freq, dur, dim) => {
    const osc  = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filt.type  = "lowpass";
    filt.frequency.value = dim === "SPACE" ? 3200 : dim === "REAL" ? 1800 : 2600;
    filt.Q.value         = 1.2;
    osc.type   = "square";
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(
      dim === "SPACE" ? 0.072 : dim === "REAL" ? 0.032 : 0.055,
      time + 0.006
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.85);
    osc.connect(filt); filt.connect(gain); gain.connect(master);
    osc.start(time); osc.stop(time + dur);
  };

  // ── PAD ORQUESTAL (triángulos en acorde — Overture / The Grid) ──
  const playPad = (time, chordSemitones, dur, dim) => {
    chordSemitones.forEach((semi, i) => {
      const freq = ROOT[dim] * Math.pow(2, semi / 12);
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type  = "lowpass";
      filt.frequency.value = 1200;
      osc.type   = "triangle";
      osc.frequency.setValueAtTime(freq * 2, time); // una octava arriba
      gain.gain.setValueAtTime(0.0001, time + i * 0.018); // stagger — entrada escalonada
      gain.gain.exponentialRampToValueAtTime(
        dim === "REAL" ? 0.028 : 0.038,
        time + i * 0.018 + 0.08
      );
      gain.gain.setValueAtTime(
        dim === "REAL" ? 0.028 : 0.038,
        time + dur - 0.15
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(filt); filt.connect(gain); gain.connect(master);
      osc.start(time); osc.stop(time + dur + 0.1);
    });
  };

  // ── EFECTO PORTAL: sweep de frecuencia ascendente al cruzar ──
  const playPortalSweep = (time, dim) => {
    const isSpace = dim === "SPACE";
    const startFreq = isSpace ? 200 : 400;
    const endFreq   = isSpace ? 3200 : 800;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type  = "bandpass";
    filt.Q.value = 8;
    filt.frequency.setValueAtTime(startFreq, time);
    filt.frequency.exponentialRampToValueAtTime(endFreq, time + 1.8);
    osc.type   = "sawtooth";
    osc.frequency.setValueAtTime(startFreq / 2, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq / 2, time + 1.8);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.1);
    gain.gain.linearRampToValueAtTime(0.0001, time + 1.8);
    osc.connect(filt); filt.connect(gain); gain.connect(master);
    osc.start(time); osc.stop(time + 2.0);
  };

  // ── SCHEDULADOR PRINCIPAL ──
  const scheduleStep = () => {
    const { dimension, speed, isPaused, isGameOver } = useGameStore.getState();
    if (isPaused || isGameOver) return 120;

    // Detectar cambio de dimensión → sweep de portal
    if (dimension !== curDim) {
      playPortalSweep(ctx.currentTime + 0.02, dimension);
      // Ajustar delay time al nuevo BPM
      const newBeat = dimension === "SPACE" ? 0.476 : dimension === "REAL" ? 0.588 : 0.526;
      echoDelay.delayTime.setTargetAtTime(newBeat / 4, ctx.currentTime, 0.5);
      curDim = dimension;
      step = 0; // reiniciar patrón al nuevo contexto
    }

    const dim  = dimension;
    const time = ctx.currentTime + 0.05;

    // Tempo dinámico: acelera con la velocidad del jugador
    // BPM base: GRID=114, SPACE=126, REAL=102
    const baseBPM  = dim === "SPACE" ? 126 : dim === "REAL" ? 102 : 114;
    const speedPct = Math.min((speed - 15) / 45, 1); // 0 a velocidad inicial, 1 al máximo
    const dynBPM   = baseBPM + speedPct * (dim === "SPACE" ? 24 : 18);
    const beat     = 60 / dynBPM;     // duración de 1/4 de nota en segundos
    const step16   = beat / 4;        // duración de 1/16

    const bassPattern = dim === "SPACE" ? BASS_SPACE : dim === "REAL" ? BASS_REAL : BASS_GRID;
    const arpPattern  = dim === "SPACE" ? ARP_SPACE  : dim === "REAL" ? ARP_REAL  : ARP_GRID;
    const padChords   = PAD_CHORDS[dim];

    const s = step % 16; // posición en el compás de 16 steps

    // ── DRUMS: patrón 4/4 clásico electrónico ──
    if (s % 4 === 0)               playKick(time, 1.0);           // beats 1,2,3,4
    if (s === 4 || s === 12)       playKick(time, 0.6);           // ghost kicks
    if (s === 4 || s === 12)       playSnare(time);               // snare en 2 y 4
    if (s % 2 === 1)               playHat(time, false);          // hi-hat cada 1/8
    if (s === 6 || s === 14)       playHat(time, true);           // open hat sincopado
    // En SPACE: hi-hats más frecuentes (cada 1/16)
    if (dim === "SPACE" && s % 2 === 0 && s % 4 !== 0) playHat(time, false);

    // ── BAJO: 8 steps (cada 1/8 de nota) ──
    if (s % 2 === 0) {
      const bassIdx  = Math.floor(s / 2);
      const bassFreq = scaleFreq(bassPattern[bassIdx % bassPattern.length], 0, dim);
      playBass(time, bassFreq, step16 * 1.8, dim);
    }

    // ── ARPEGIO: 16 steps (cada 1/16) ──
    const arpFreq = scaleFreq(arpPattern[s % arpPattern.length], 1, dim);
    playArp(time, arpFreq, step16 * 0.75, dim);

    // ── PAD: cada 4 beats (cambio de acorde cada compás) ──
    if (s === 0) {
      const chordIdx = Math.floor(step / 16) % padChords.length;
      playPad(time, padChords[chordIdx], beat * 4.2, dim);
    }

    step = (step + 1) % 64;
    return step16 * 1000 - 8; // ms hasta el próximo step (con 8ms de buffer)
  };

  const tick = () => {
    const nextMs = scheduleStep();
    scheduler = window.setTimeout(tick, Math.max(40, nextMs));
  };

  return {
    async start() {
      if (ctx.state === "suspended") await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.30, ctx.currentTime + 0.8);
      if (!scheduler) tick();
    },
    setPaused(paused) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(
        paused ? 0.04 : 0.30,
        ctx.currentTime + 0.3,
      );
    },
    stop() {
      if (scheduler) { window.clearTimeout(scheduler); scheduler = null; }
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      window.setTimeout(() => { try { ctx.close(); } catch(e){} }, 450);
    },
  };
}

export default function Home() {
  injectCSS();

  const {
    score,
    showGameOverUI,
    resetGame,
    quality,
    setQuality,
    isPaused,
    togglePause,
    dimension,
    portalActive,
    portalCollected,
    gameStarted,
    startGame,
    moveLeft,
    moveRight,
  } = useGameStore();

  const isMobile  = useIsMobile();
  const musicRef  = useRef(null);
  // Solo mostrar el hint de swipe la primera vez que empieza en móvil
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // Controles táctiles — solo activos cuando el juego está corriendo en móvil
  useTouchControls({
    enabled:     isMobile && gameStarted && !showGameOverUI,
    moveLeft,
    moveRight,
    togglePause,
    isPaused,
  });

  // Tecla ESC para pausar
  useEffect(() => {
    if (!gameStarted) return;
    const onKey = (e) => {
      if (e.key === "Escape") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameStarted, togglePause]);

  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.setPaused(!gameStarted || isPaused || showGameOverUI);
  }, [gameStarted, isPaused, showGameOverUI]);

  useEffect(() => {
    return () => {
      musicRef.current?.stop();
      musicRef.current = null;
    };
  }, []);

  const stopMusic = () => {
    musicRef.current?.stop();
    musicRef.current = null;
  };

  const handleStart = () => {
    startGame();
    if (isMobile) setShowSwipeHint(true);
    if (!musicRef.current) {
      musicRef.current = createGameMusic();
    }
    musicRef.current?.start();
  };

  const handleRetry = () => {
    stopMusic();
    resetGame(); // resetGame ya pone gameStarted: false internamente
  };

  const handleQuit = () => {
    stopMusic();
    resetGame(); // resetGame ya pone gameStarted: false internamente
  };

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-display)",
      }}
    >
      {/* Motor 3D siempre montado */}
      {/* Envía el estado al Scene */}
      <Scene gameStarted={gameStarted} />

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
          {/* D-pad táctil — solo en móvil */}
          {isMobile && (
            <MobileDpad
              moveLeft={moveLeft}
              moveRight={moveRight}
              togglePause={togglePause}
              isPaused={isPaused}
            />
          )}
          {/* Hint de swipe — primera vez en móvil */}
          {isMobile && showSwipeHint && <SwipeHint />}
          {/* Toast de logro — visible siempre que el juego esté activo */}
          <AchievementToast />
        </>
      )}

      {/* Menú de pausa */}
      {gameStarted && isPaused && !showGameOverUI && (
        <PauseMenu onResume={togglePause} onQuit={handleQuit} />
      )}

      {/* Game Over */}
      {showGameOverUI && <GameOverScreen score={score} onRetry={handleRetry} />}

      {/* Menú principal */}
      {!gameStarted && (
        <MainMenu
          quality={quality}
          setQuality={setQuality}
          onStart={handleStart}
          isMobile={isMobile}
        />
      )}
    </main>
  );
}