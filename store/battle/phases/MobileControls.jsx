"use client";
// MobileControls.jsx — Controles táctiles estilo Tron para JUEGOTRON
// Despacha KeyboardEvents reales → BabylonJS cámara + InputManager los reciben
// Solo se muestra en dispositivos táctiles (móvil / tablet)

import React, { useEffect, useState, useCallback, useRef } from "react";

// ── Helper: lanza un KeyboardEvent real que BabylonJS + InputManager escuchan ──
const fireKey = (type, keyCode, code) => {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      keyCode,
      which: keyCode,
      code,
      key: code.replace("Key", "").replace("Arrow", ""),
      bubbles: true,
      cancelable: true,
    })
  );
};

// Mapa de botones de movimiento
const MOVE_BUTTONS = [
  { label: "▲", keyCode: 87, code: "KeyW",     pos: { gridColumn: 2, gridRow: 1 } },
  { label: "◀", keyCode: 65, code: "KeyA",     pos: { gridColumn: 1, gridRow: 2 } },
  { label: "▼", keyCode: 83, code: "KeyS",     pos: { gridColumn: 2, gridRow: 2 } },
  { label: "▶", keyCode: 68, code: "KeyD",     pos: { gridColumn: 3, gridRow: 2 } },
];

// Hook: detecta si el dispositivo es táctil
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);
  return isTouch;
}

export default function MobileControls({ canInteract = false }) {
  const isTouch = useIsTouchDevice();
  const heldKeys = useRef(new Set());

  // Mantener tecla sostenida mientras el dedo esté sobre el botón
  const handleDown = useCallback((keyCode, code) => {
    if (heldKeys.current.has(code)) return;
    heldKeys.current.add(code);
    fireKey("keydown", keyCode, code);
  }, []);

  const handleUp = useCallback((keyCode, code) => {
    if (!heldKeys.current.has(code)) return;
    heldKeys.current.delete(code);
    fireKey("keyup", keyCode, code);
  }, []);

  // Si el dedo sale del botón sin soltar, también liberamos
  const handleLeave = useCallback((keyCode, code) => {
    handleUp(keyCode, code);
  }, [handleUp]);

  // Soltar todas al perder el foco (p.ej. notificación del sistema)
  useEffect(() => {
    const releaseAll = () => {
      heldKeys.current.forEach((code) => {
        const btn = MOVE_BUTTONS.find((b) => b.code === code);
        if (btn) fireKey("keyup", btn.keyCode, code);
      });
      heldKeys.current.clear();
    };
    window.addEventListener("blur", releaseAll);
    return () => window.removeEventListener("blur", releaseAll);
  }, []);

  if (!isTouch) return null; // En PC no renderiza nada

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');

        @keyframes btnGlow {
          0%,100% { box-shadow: 0 0 8px rgba(0,247,255,0.4), inset 0 0 8px rgba(0,247,255,0.1); }
          50%      { box-shadow: 0 0 18px rgba(0,247,255,0.8), inset 0 0 12px rgba(0,247,255,0.2); }
        }
        @keyframes interactPulse {
          0%,100% { box-shadow: 0 0 14px rgba(0,247,255,0.5), inset 0 0 10px rgba(0,247,255,0.15); }
          50%      { box-shadow: 0 0 32px rgba(0,247,255,1),   inset 0 0 20px rgba(0,247,255,0.35); }
        }
        @keyframes interactPop {
          0%   { transform: scale(0.88); opacity: 0; }
          100% { transform: scale(1);    opacity: 1; }
        }

        .mc-btn {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          width: 58px; height: 58px;
          background: rgba(0, 8, 18, 0.82);
          border: 1px solid rgba(0, 247, 255, 0.45);
          color: #00f7ff;
          font-size: 1.3rem;
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          backdrop-filter: blur(6px);
          transition: background 0.12s, border-color 0.12s;
          animation: btnGlow 3s ease-in-out infinite;
          /* Separadores de esquina Tron */
          clip-path: polygon(
            0 6px, 6px 0,
            calc(100% - 6px) 0, 100% 6px,
            100% calc(100% - 6px), calc(100% - 6px) 100%,
            6px 100%, 0 calc(100% - 6px)
          );
        }

        .mc-btn:active,
        .mc-btn.pressed {
          background: rgba(0, 247, 255, 0.18);
          border-color: rgba(0, 247, 255, 0.9);
          box-shadow: 0 0 24px rgba(0,247,255,0.7), inset 0 0 16px rgba(0,247,255,0.25);
        }

        .mc-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg,
            rgba(0,247,255,0.06) 0%,
            transparent 50%,
            rgba(0,247,255,0.04) 100%);
          pointer-events: none;
        }

        .mc-interact-btn {
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 3px;
          width: 80px; height: 80px;
          background: rgba(0, 8, 18, 0.85);
          border: 1.5px solid rgba(0, 247, 255, 0.7);
          border-radius: 50%;
          color: #00f7ff;
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          backdrop-filter: blur(8px);
          animation: interactPulse 1.2s ease-in-out infinite,
                     interactPop    0.25s ease;
        }

        .mc-interact-btn:active {
          background: rgba(0, 247, 255, 0.22);
          box-shadow: 0 0 40px rgba(0,247,255,0.9), inset 0 0 20px rgba(0,247,255,0.3);
        }
      `}</style>

      {/* ── D-Pad (esquina inferior izquierda) ── */}
      <div style={{
        position: "fixed",
        bottom: 28,
        left: 24,
        zIndex: 100,
        display: "grid",
        gridTemplateColumns: "repeat(3, 58px)",
        gridTemplateRows: "repeat(2, 58px)",
        gap: 6,
        touchAction: "none",
      }}>
        {MOVE_BUTTONS.map(({ label, keyCode, code, pos }) => (
          <button
            key={code}
            className="mc-btn"
            style={{ ...pos }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handleDown(keyCode, code); }}
            onPointerUp={(e)   => { handleUp(keyCode, code); }}
            onPointerLeave={(e)=> { handleLeave(keyCode, code); }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Botón ABORDAR / E (esquina inferior derecha, solo cuando hay moto cerca) ── */}
      {canInteract && (
        <div style={{
          position: "fixed",
          bottom: 36,
          right: 28,
          zIndex: 100,
          touchAction: "none",
        }}>
          <button
            className="mc-interact-btn"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              fireKey("keydown", 69, "KeyE");
            }}
            onPointerUp={() => fireKey("keyup", 69, "KeyE")}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span style={{
              fontSize: "1.1rem",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textShadow: "0 0 12px #00f7ff, 0 0 24px #00f7ff",
            }}>
              [E]
            </span>
            <span style={{
              fontSize: "0.38rem",
              letterSpacing: "0.22em",
              color: "rgba(0,247,255,0.7)",
              textShadow: "none",
            }}>
              ABORDAR
            </span>
          </button>
        </div>
      )}

      {/* ── Hint de deslizar para girar (primer toque) ── */}
      <HintOverlay />
    </>
  );
}

// Muestra un hint de "desliza para girar" la primera vez y desaparece
function HintOverlay() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 99,
      textAlign: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.5s ease",
    }}>
      <div style={{
        padding: "10px 22px",
        background: "rgba(0,4,10,0.78)",
        border: "1px solid rgba(0,247,255,0.3)",
        backdropFilter: "blur(8px)",
        fontFamily: "'Orbitron', sans-serif",
      }}>
        <div style={{
          fontSize: "0.55rem",
          color: "rgba(0,247,255,0.5)",
          letterSpacing: "0.25em",
          marginBottom: 4,
        }}>
          MODO TÁCTIL ACTIVO
        </div>
        <div style={{
          fontSize: "0.72rem",
          color: "#00f7ff",
          letterSpacing: "0.18em",
          textShadow: "0 0 10px #00f7ff",
        }}>
          ← DESLIZA PARA GIRAR →
        </div>
      </div>
    </div>
  );
}