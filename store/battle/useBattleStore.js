// useBattleStore.js
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const BOT_NAMES = [
  "RINZLER","CLU","JARVIS","GEM","SENTRY-1",
  "SENTRY-2","PROGRAM-7","RASKIN","CERF",
];

function createBots() {
  return BOT_NAMES.map((name, i) => ({
    id:       `bot-${i}`,
    name,
    isBot:    true,
    alive:    true,
    hasMotor: false,
    hasTube:  false,
    position: { x:0, y:0, z:0 },
    speed:    0.85 + Math.random() * 0.3,
    color:    i % 2 === 0 ? "#00f7ff" : "#ff6600",
  }));
}

export const useBattleStore = create(
  subscribeWithSelector((set, get) => ({

    // Fases: LOBBY→CAPSULE→PHASE1→PHASE2→PHASE3→PHASE4→VICTORY
    phase: "LOBBY",

    player: {
      id:"player-1", name:"USER", isBot:false, alive:true,
      hasMotor:false, hasTube:false, position:{x:0,y:1.8,z:0},
    },
    bots: createBots(),

    lobbyCount:  0,
    lobbyReady:  false,

    motorsAvailable: 9,
    motorsTaken:     0,
    eliminated:      [],

    tubesAvailable: 8,
    tubesTaken:     0,   // ← sin duplicado

    playerYaw:   0,
    playerPitch: 0,

    jetIntegrity: 100,
    jetEnergy:    100,

    // ── Acciones ─────────────────────────────────────────
    setPhase: (phase) => set({ phase }),

    addLobbyPlayer: () => set((s) => {
      const next = s.lobbyCount + 1;
      return { lobbyCount: next, lobbyReady: next >= 10 };
    }),

    startCapsule:  () => set({ phase: "CAPSULE" }),
    startPhase1:   () => set({ phase: "PHASE1"  }),
    startPhase2:   () => set({ phase: "PHASE2"  }),
    startPhase3:   () => set({ phase: "PHASE3"  }),
    startPhase4:   () => set({ phase: "PHASE4"  }),
    startVictory:  () => set({ phase: "VICTORY" }),

    playerTakeMotor: () => set((s) => ({
      player:      { ...s.player, hasMotor: true },
      motorsTaken: s.motorsTaken + 1,
    })),

    botTakeMotor: (botId) => set((s) => ({
      bots:        s.bots.map(b => b.id===botId ? {...b, hasMotor:true} : b),
      motorsTaken: s.motorsTaken + 1,
    })),

    playerTakeTube: () => set((s) => ({
      player:     { ...s.player, hasTube: true },
      tubesTaken: s.tubesTaken + 1,
    })),

    botTakeTube: (botId) => set((s) => ({
      bots:       s.bots.map(b => b.id===botId ? {...b, hasTube:true} : b),
      tubesTaken: s.tubesTaken + 1,
    })),

    eliminate: (id) => set((s) => ({
      player:     id===s.player.id ? {...s.player, alive:false} : s.player,
      bots:       s.bots.map(b => b.id===id ? {...b, alive:false} : b),
      eliminated: [...s.eliminated, id],
    })),

    damageJet: (amount) => set((s) => {
      const newIntegrity = Math.max(0, s.jetIntegrity - amount);
      return {
        jetIntegrity: newIntegrity,
        phase: newIntegrity <= 0 ? "ELIMINATED" : s.phase,
      };
    }),

    updatePlayerLook: (yaw, pitch) => set({
      playerYaw:   yaw,
      playerPitch: Math.max(-0.4, Math.min(0.4, pitch)),
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
      tubesTaken:      0,   // ← una sola vez
      playerYaw:       0,
      playerPitch:     0,
      jetIntegrity:    100,
      jetEnergy:       100,
    }),
  }))
);