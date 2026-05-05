// achievements.js — Definición completa de los 12 logros de JUEGOTRON
// Cada logro tiene: id, título, descripción, icono, condición de desbloqueo
// Las condiciones se evalúan en useProgressStore al final de cada partida
// y en tiempo real para los que requieren estado continuo (velocidad, etc.)

export const ACHIEVEMENTS = [

  // ── EXPLORACIÓN (descubrir las dimensiones) ──────────────────────
  {
    id: "first_run",
    icon: "◈",
    title: "PRIMER CICLO",
    desc: "Completa tu primera partida en The Grid",
    color: "#00f7ff",
    condition: ({ gamesPlayed }) => gamesPlayed >= 1,
  },
  {
    id: "enter_space",
    icon: "◉",
    title: "IDENTIDAD ESPACIAL",
    desc: "Cruza el primer portal y accede al mundo Space",
    color: "#ff6600",
    condition: ({ reachedSpace }) => reachedSpace,
  },
  {
    id: "enter_real",
    icon: "◎",
    title: "EL MUNDO REAL",
    desc: "Cruza el segundo portal y accede al mundo Real",
    color: "#ffe066",
    condition: ({ reachedReal }) => reachedReal,
  },
  {
    id: "full_cycle",
    icon: "⬡",
    title: "CICLO COMPLETO",
    desc: "Atraviesa los 3 mundos en una sola partida",
    color: "#ff0055",
    condition: ({ reachedReal }) => reachedReal, // implica haber cruzado ambos portales
  },

  // ── PUNTUACIÓN ───────────────────────────────────────────────────
  {
    id: "score_500",
    icon: "▸",
    title: "OPERADOR NOVATO",
    desc: "Alcanza 500 puntos en una partida",
    color: "#00f7ff",
    condition: ({ score }) => score >= 500,
  },
  {
    id: "score_1000",
    icon: "▹",
    title: "USUARIO RECONOCIDO",
    desc: "Alcanza 1000 puntos en una partida",
    color: "#00f7ff",
    condition: ({ score }) => score >= 1000,
  },
  {
    id: "score_2500",
    icon: "▶",
    title: "PROGRAMA ÉLITE",
    desc: "Alcanza 2500 puntos — eres parte del sistema",
    color: "#ff6600",
    condition: ({ score }) => score >= 2500,
  },
  {
    id: "score_5000",
    icon: "◆",
    title: "MAESTRO DE LA GRID",
    desc: "Alcanza 5000 puntos. Pocos llegan aquí.",
    color: "#ff0055",
    condition: ({ score }) => score >= 5000,
  },

  // ── VELOCIDAD ────────────────────────────────────────────────────
  {
    id: "speed_max",
    icon: "⚡",
    title: "VELOCIDAD MÁXIMA",
    desc: "Alcanza la velocidad máxima del sistema",
    color: "#ffe066",
    condition: ({ maxSpeed }) => maxSpeed >= 58,
  },
  {
    id: "speed_sustained",
    icon: "∞",
    title: "EN EL FLUJO",
    desc: "Mantén velocidad máxima durante 10 segundos",
    color: "#ffe066",
    condition: ({ maxSpeedSeconds }) => maxSpeedSeconds >= 10,
  },

  // ── PERSISTENCIA ─────────────────────────────────────────────────
  {
    id: "games_10",
    icon: "◌",
    title: "ENTRENAMIENTO CONSTANTE",
    desc: "Juega 10 partidas — el Grid te conoce bien",
    color: "#00f7ff",
    condition: ({ gamesPlayed }) => gamesPlayed >= 10,
  },
  {
    id: "new_record",
    icon: "★",
    title: "NUEVO RÉCORD DEL SISTEMA",
    desc: "Supera tu propio récord personal",
    color: "#ff0055",
    condition: ({ isNewRecord }) => isNewRecord,
  },
];

// Mapa rápido para lookup por id
export const ACHIEVEMENTS_MAP = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);