// useBattleStore.js — Estado completo del Battle Royale
// Fases: LOBBY → CAPSULE → PHASE1 (sprint motos) → PHASE2 (precipicio) → PHASE3 (nave) → STADIUM
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Nombres de bots inspirados en Tron Legacy
export const BOT_NAMES = [
  "RINZLER", "CLU", "JARVIS", "GEM", "SENTRY-1",
  "SENTRY-2", "PROGRAM-7", "RASKIN", "CERF",
];

const TOTAL_PLAYERS = 10;

function createBots() {
  return BOT_NAMES.map((name, i) => ({
    id:        `bot-${i}`,
    name,
    isBot:     true,
    alive:     true,
    hasMotor:  false,
    hasTube:   false,
    position:  { x: 0, y: 0, z: 0 },
    // Velocidad aleatoria para el sprint — hace la carrera impredecible
    speed:     0.85 + Math.random() * 0.3,
    color:     i % 2 === 0 ? "#00f7ff" : "#ff6600",
  }));
}

export const useBattleStore = create(
  subscribeWithSelector((set, get) => ({

    // ── Fase actual ──────────────────────────────────────────────
    // LOBBY → CAPSULE → PHASE1 → PHASE2 → PHASE3 → STADIUM
    phase: "LOBBY",

    // ── Jugadores ────────────────────────────────────────────────
    player: {
      id:       "player-1",
      name:     "USER",
      isBot:    false,
      alive:    true,
      hasMotor: false,
      hasTube:  false,
      position: { x: 0, y: 1.8, z: 0 },
    },
    bots: createBots(),

    // ── Lobby ────────────────────────────────────────────────────
    lobbyCount:    0,      // jugadores "conectados" (simulado con bots)
    lobbyReady:    false,

    // ── Fase 1: Sprint a las motos ───────────────────────────────
    motorsAvailable: 9,    // motos disponibles
    motorsTaken:     0,
    eliminated:      [],   // jugadores eliminados (para el efecto de cristal)

    // ── Fase 2: Precipicio + tubos ───────────────────────────────
    tubesAvailable:  8,
    tubesTaken:      0,

    // ── Cámara primera persona ───────────────────────────────────
    playerYaw:   0,        // rotación horizontal (mouse X)
    playerPitch: 0,        // rotación vertical (mouse Y) — limitada

    // ── Acciones ─────────────────────────────────────────────────

    setPhase: (phase) => set({ phase }),

    // Lobby: simula conexión progresiva de bots
    addLobbyPlayer: () => set((s) => {
      const next = s.lobbyCount + 1;
      return {
        lobbyCount: next,
        lobbyReady: next >= TOTAL_PLAYERS,
      };
    }),

    startCapsule: () => set({ phase: "CAPSULE" }),

    startPhase1: () => set({ phase: "PHASE1" }),

    // El jugador agarra una moto
    playerTakeMotor: () => set((s) => ({
      player:       { ...s.player, hasMotor: true },
      motorsTaken:  s.motorsTaken + 1,
    })),

    // Un bot agarra una moto
    botTakeMotor: (botId) => set((s) => ({
      bots:        s.bots.map(b => b.id === botId ? { ...b, hasMotor: true } : b),
      motorsTaken: s.motorsTaken + 1,
    })),

    // Eliminar jugador (sin moto o sin tubo)
    eliminate: (id) => set((s) => {
      const isPlayer = id === s.player.id;
      return {
        player:     isPlayer ? { ...s.player, alive: false } : s.player,
        bots:       s.bots.map(b => b.id === id ? { ...b, alive: false } : b),
        eliminated: [...s.eliminated, id],
      };
    }),

    startPhase2: () => set({ phase: "PHASE2" }),
    startPhase3: () => set({ phase: "PHASE3" }),
    startStadium: () => set({ phase: "STADIUM" }),

    updatePlayerLook: (yaw, pitch) => set({
      playerYaw:   yaw,
      playerPitch: Math.max(-0.4, Math.min(0.4, pitch)), // limitar pitch
    }),

    resetBattle: () => set({
      phase:           "LOBBY",
      player:          { id:"player-1", name:"USER", isBot:false, alive:true, hasMotor:false, hasTube:false, position:{x:0,y:1.8,z:0} },
      bots:            createBots(),
      lobbyCount:      0,
      lobbyReady:      false,
      motorsAvailable: 9,
      motorsTaken:     0,
      eliminated:      [],
      tubesAvailable:  8,
      tubesTaken:      0,
      playerYaw:       0,
      playerPitch:     0,
    }),
  }))
);