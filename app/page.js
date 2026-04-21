// page.js
"use client";
import React, { useState } from "react";
import Scene from "../store/ThreeEngine/Scene";
import { useGameStore } from "../store/useGameStore";

export default function Home() {
  const { score, showGameOverUI, resetGame, quality, setQuality, isPaused, togglePause } = useGameStore();
  
  // Estado local para saber si estamos en el menú de inicio o ya jugando
  const [gameStarted, setGameStarted] = useState(false);

  const handleStart = () => {
    setGameStarted(true);
    // Si tu juego inicia pausado por defecto, aquí disparas la acción
  };

  const buttonStyle = (level) => ({
    padding: '10px 25px',
    margin: '0 10px',
    background: quality === level ? "#00f7ff" : "transparent",
    color: quality === level ? "#000" : "#00f7ff",
    border: "2px solid #00f7ff",
    cursor: "pointer",
    fontWeight: "bold",
    fontFamily: "sans-serif",
    transition: "all 0.3s ease",
    boxShadow: quality === level ? "0 0 15px #00f7ff" : "none",
  });

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* El motor solo corre si el juego ha iniciado */}
      <Scene />

      {/* HUD: Puntuación (solo visible mientras juegas) */}
      {gameStarted && !showGameOverUI && (
        <div style={{ position: "absolute", top: "30px", left: "30px", color: "#00f7ff", pointerEvents: "none" }}>
          <h1 style={{ margin: 0, fontSize: "2rem", textShadow: "0 0 10px #00f7ff" }}>SISTEMA: JUEGOTRON</h1>
          <div style={{ marginTop: "10px", fontSize: "1.5rem" }}>
            DISTANCIA: <span style={{ color: "#fff" }}>{Math.floor(score).toLocaleString()}m</span>
          </div>
        </div>
      )}

      {/* 1. MENÚ DE BIENVENIDA Y SELECTOR DE CALIDAD */}
      {!gameStarted && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.9)", zIndex: 200
        }}>
          <h1 style={{ color: "#00f7ff", fontSize: "4rem", textShadow: "0 0 20px #00f7ff" }}>NEONGAME 3D</h1>
          
          <p style={{ color: "#fff", marginBottom: "20px", fontSize: "1.2rem" }}>SELECCIONA LA CALIDAD DE LA TRANSMISIÓN:</p>
          
          <div style={{ marginBottom: "50px" }}>
            <button onClick={() => setQuality('low')} style={buttonStyle('low')}>BAJA</button>
            <button onClick={() => setQuality('medium')} style={buttonStyle('medium')}>MEDIA</button>
            <button onClick={() => setQuality('high')} style={buttonStyle('high')}>ALTA</button>
          </div>

          <button
            onClick={handleStart}
            style={{
              padding: "20px 60px", fontSize: "1.5rem", background: "#00f7ff",
              color: "#000", border: "none", cursor: "pointer", fontWeight: "bold"
            }}
          >
            INICIAR SECUENCIA
          </button>
        </div>
      )}

      {/* 2. GAME OVER UI */}
      {showGameOverUI && (
        <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.85)", zIndex: 100, border: "2px solid #ff0055"
          }}>
          <h2 style={{ color: "#ff0055", fontSize: "4rem", textShadow: "0 0 20px #ff0055" }}>CONEXIÓN PERDIDA</h2>
          <p style={{ color: "#fff", fontSize: "1.5rem" }}>DISTANCIA FINAL: {Math.floor(score).toLocaleString()}m</p>
          <button onClick={() => { resetGame(); setGameStarted(false); }} style={{ /* estilo de tu boton reiniciar */ }}>
            REINTENTAR CONEXIÓN
          </button>
        </div>
      )}
    </main>
  );
}