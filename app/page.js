// app/page.js — JUEGOTRON v2.0
// Pantalla principal de selección de modo.
// Dos modos: RUNNER (v1.0 intacto en /runner) y BATTLE ROYALE (v2.0 en /battle)
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #010409; }
  :root {
    --cyan:  #00f7ff;
    --orange:#ff6600;
    --font-display: 'Orbitron', sans-serif;
    --font-mono:    'Share Tech Mono', monospace;
  }
  @keyframes fade-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes flicker    { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.4} 94%{opacity:1} 96%{opacity:.7} 97%{opacity:1} }
  @keyframes scan       { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes pulse-glow { 0%,100%{opacity:.15} 50%{opacity:.35} }

  .mode-card {
    position: relative;
    border: 1px solid rgba(0,247,255,0.12);
    padding: 32px 28px;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(.22,.68,0,1.2), background 0.2s, border-color 0.2s;
    overflow: hidden;
    flex: 1;
    min-width: 220px;
    max-width: 320px;
    background: rgba(0,247,255,0.02);
    animation: fade-in 0.6s ease both;
  }
  .mode-card.orange { border-color: rgba(255,102,0,0.12); background: rgba(255,102,0,0.02); }
  .mode-card.cyan:hover  { transform:translateY(-5px) scale(1.02); background:rgba(0,247,255,0.06); border-color:rgba(0,247,255,0.45); }
  .mode-card.orange:hover{ transform:translateY(-5px) scale(1.02); background:rgba(255,102,0,0.06); border-color:rgba(255,102,0,0.45); }
  .mode-card.disabled { cursor: default; opacity: 0.7; }
  .mode-card.disabled:hover { transform: none; }

  .corner { position:absolute; width:10px; height:10px; }
  .corner.tl { top:0;left:0; border-top:2px solid; border-left:2px solid; }
  .corner.br { bottom:0;right:0; border-bottom:2px solid; border-right:2px solid; }
  .cyan  .corner { border-color: var(--cyan); }
  .orange .corner { border-color: var(--orange); }
`;

function GridBg() {
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      <svg width="100%" height="100%" style={{ opacity:0.06 }}>
        <defs>
          <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0L0 0 0 60" fill="none" stroke="#00f7ff" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#00f7ff" strokeWidth="0.3" opacity="0.5"/>
      </svg>
      <div style={{
        position:"absolute", left:0, right:0, height:"2px",
        background:"linear-gradient(90deg,transparent,rgba(0,247,255,0.12),transparent)",
        animation:"scan 7s linear infinite",
      }}/>
      <div style={{
        position:"absolute", inset:0,
        background:"radial-gradient(ellipse at center,transparent 35%,rgba(1,4,9,0.88) 100%)",
      }}/>
    </div>
  );
}

function ModeCard({ color, icon, title, subtitle, tag, features, disabled, delay, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accent = color === "cyan" ? "var(--cyan)" : "var(--orange)";
  const accentRaw = color === "cyan" ? "#00f7ff" : "#ff6600";

  return (
    <div
      className={`mode-card ${color}${disabled ? " disabled" : ""}`}
      style={{ animationDelay: delay }}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="corner tl"/>
      <div className="corner br"/>

      {/* Tag */}
      <div style={{
        position:"absolute", top:12, right:14,
        fontFamily:"var(--font-mono)", fontSize:"0.48rem",
        letterSpacing:"0.2em",
        color: disabled ? "rgba(255,255,255,0.18)" : accent,
      }}>{tag}</div>

      {/* Icono */}
      <div style={{
        fontSize:"2.8rem", color: accent,
        textShadow: hovered ? `0 0 28px ${accentRaw}` : `0 0 10px ${accentRaw}55`,
        marginBottom:18, transition:"text-shadow 0.3s",
        display:"inline-block",
        animation: hovered ? "float 2s ease infinite" : "none",
      }}>{icon}</div>

      {/* Título */}
      <h2 style={{
        fontFamily:"var(--font-display)", fontWeight:900,
        fontSize:"clamp(0.95rem,2.2vw,1.25rem)",
        color: disabled ? "rgba(255,255,255,0.28)" : "#fff",
        letterSpacing:"0.06em", marginBottom:6,
      }}>{title}</h2>

      {/* Subtítulo */}
      <div style={{
        fontFamily:"var(--font-mono)", fontSize:"0.58rem",
        color: disabled ? "rgba(255,255,255,0.18)" : accent,
        letterSpacing:"0.15em", marginBottom:20,
      }}>{subtitle}</div>

      {/* Features */}
      <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:26 }}>
        {features.map(f => (
          <div key={f} style={{
            display:"flex", alignItems:"center", gap:8,
            fontFamily:"var(--font-mono)", fontSize:"0.53rem",
            color: disabled ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.48)",
            letterSpacing:"0.08em",
          }}>
            <span style={{ color: disabled ? "rgba(255,255,255,0.1)" : accent, fontSize:"0.45rem" }}>◈</span>
            {f}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{
          fontFamily:"var(--font-display)", fontSize:"0.62rem", fontWeight:700,
          letterSpacing:"0.2em",
          color: disabled ? "rgba(255,255,255,0.15)" : accent,
          textShadow: hovered && !disabled ? `0 0 12px ${accentRaw}` : "none",
          transition:"text-shadow 0.2s",
        }}>
          {disabled ? "PRÓXIMAMENTE" : "INICIAR →"}
        </span>
        {disabled && (
          <span style={{
            fontFamily:"var(--font-mono)", fontSize:"0.48rem",
            color:"rgba(255,102,0,0.38)", letterSpacing:"0.15em",
            border:"1px solid rgba(255,102,0,0.2)", padding:"2px 7px",
          }}>EN DESARROLLO</span>
        )}
      </div>

      {/* Resplandor de hover */}
      {hovered && !disabled && (
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:`radial-gradient(ellipse at 50% 110%,${accentRaw}0a,transparent 65%)`,
        }}/>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [bootText, setBootText] = useState("");

  const LINES = [
    "JUEGOTRON OS v2.0.0",
    "INICIALIZANDO MÓDULOS...",
    "RUNNER................[OK]",
    "BATTLE_ROYALE........[STANDBY]",
    "SELECCIONA PROTOCOLO DE JUEGO",
  ];

  useEffect(() => {
    let li = 0, ci = 0, out = "";
    const t = setInterval(() => {
      if (li >= LINES.length) { clearInterval(t); setTimeout(() => setBooted(true), 400); return; }
      out += LINES[li][ci] ?? "";
      ci++;
      if (ci >= LINES[li].length) { out += "\n"; li++; ci = 0; }
      setBootText(out);
    }, 20);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>
      <div style={{
        width:"100vw", height:"100vh", background:"#010409",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        position:"relative", overflow:"hidden",
      }}>
        <GridBg/>

        {/* ── Boot sequence ── */}
        {!booted ? (
          <pre style={{
            fontFamily:"var(--font-mono)",
            fontSize:"clamp(0.58rem,1.4vw,0.72rem)",
            color:"rgba(0,247,255,0.7)",
            letterSpacing:"0.1em", lineHeight:1.9,
            textShadow:"0 0 8px rgba(0,247,255,0.35)",
            animation:"fade-in 0.3s ease",
          }}>
            {bootText}
            <span style={{
              display:"inline-block", width:7, height:"1em",
              background:"rgba(0,247,255,0.7)", verticalAlign:"middle",
              animation:"flicker 0.9s step-end infinite",
            }}/>
          </pre>
        ) : (

        /* ── Pantalla de selección ── */
        <div style={{
          display:"flex", flexDirection:"column",
          alignItems:"center", width:"100%", maxWidth:760,
          padding:"0 20px", animation:"fade-in 0.5s ease",
        }}>

          {/* Logotipo */}
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <div style={{
              fontFamily:"var(--font-mono)", fontSize:"0.58rem",
              color:"rgba(0,247,255,0.35)", letterSpacing:"0.45em", marginBottom:8,
            }}>▸ SISTEMA OPERATIVO v2.0.0 ◂</div>

            <h1 style={{
              fontFamily:"var(--font-display)", fontWeight:900,
              fontSize:"clamp(2.4rem,7.5vw,4.8rem)",
              color:"#fff", letterSpacing:"0.05em",
              textShadow:"0 0 40px rgba(0,247,255,0.35), 0 0 80px rgba(0,247,255,0.12)",
              animation:"flicker 9s ease infinite", lineHeight:1,
            }}>JUEGOTRON</h1>

            <div style={{
              fontFamily:"var(--font-mono)", fontSize:"0.52rem",
              color:"rgba(0,247,255,0.28)", letterSpacing:"0.38em", marginTop:10,
            }}>SELECCIONA PROTOCOLO DE JUEGO</div>
          </div>

          {/* Tarjetas */}
          <div style={{ display:"flex", gap:22, flexWrap:"wrap", justifyContent:"center", width:"100%" }}>
            <ModeCard
              color="cyan"
              icon="◈"
              title="MODO RUNNER"
              subtitle="JUGADOR INDIVIDUAL"
              tag="v1.0 — ACTIVO"
              delay="0.08s"
              features={[
                "3 dimensiones: Grid · Space · Real",
                "Velocidad progresiva hasta 60 u/s",
                "12 logros desbloqueables",
                "Ranking local top-10",
                "Audio generativo Tron Legacy",
              ]}
              onClick={() => router.push("/runner")}
            />

            <ModeCard
              color="orange"
              icon="⬡"
              title="BATTLE ROYALE"
              subtitle="10 JUGADORES · 1 SOBREVIVE"
              tag="v2.0 — EN DESARROLLO"
              delay="0.18s"
              disabled={false}
              features={[
                "Caída en cápsula desde la red",
                "Sprint a las 9 motos — el último explota",
                "Precipicio: 8 tubos neón",
                "Transformación en nave Tron",
                "Gran Estadio de Juegos",
              ]}
              onClick={() => router.push("/battle")}
            />
          </div>

          {/* Footer */}
          <div style={{
            marginTop:44,
            fontFamily:"var(--font-mono)", fontSize:"0.48rem",
            color:"rgba(255,255,255,0.1)", letterSpacing:"0.2em",
            textAlign:"center",
            animation:"fade-in 1s 0.4s ease both", opacity:0,
          }}>
            BASADO EN EL UNIVERSO DE TRON: LEGACY &nbsp;·&nbsp; DAFT PUNK AUDIO ENGINE
          </div>
        </div>
        )}
      </div>
    </>
  );
}