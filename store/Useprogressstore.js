// useProgressStore.js — Store de progresión persistente
// Separado de useGameStore para no acoplar lógica de juego con progresión.
// Persiste en localStorage bajo la clave "juegotron_progress".
//
// Estructura de datos guardada:
// {
//   unlockedIds: string[],       — IDs de logros desbloqueados
//   gamesPlayed: number,
//   allTimeHighScore: number,
//   reachedSpace: boolean,
//   reachedReal: boolean,
//   leaderboard: [{ name, score, dim, date }]  — top 10
// }

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { ACHIEVEMENTS } from "./Achievements";

const STORAGE_KEY = "juegotron_progress";

function loadProgress() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProgress(data) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

const INITIAL = {
  unlockedIds:      [],
  gamesPlayed:      0,
  allTimeHighScore: 0,
  reachedSpace:     false,
  reachedReal:      false,
  leaderboard:      [],       // [{ name, score, dimension, date }]
  // Toast: logro recién desbloqueado para mostrar en pantalla
  pendingToast:     null,     // { id, title, desc, icon, color } | null
};

export const useProgressStore = create(
  subscribeWithSelector((set, get) => {
    // Cargar datos persistidos al inicializar
    const saved = loadProgress();
    const initial = saved ? { ...INITIAL, ...saved, pendingToast: null } : INITIAL;

    return {
      ...initial,

      // ── Llamado al final de cada partida ──────────────────────────
      recordRun({ score, reachedSpace, reachedReal, maxSpeed, maxSpeedSeconds }) {
        const state    = get();
        const isNew    = score > state.allTimeHighScore;
        const newGames = state.gamesPlayed + 1;
        const newSpace = state.reachedSpace || reachedSpace;
        const newReal  = state.reachedReal  || reachedReal;
        const newHigh  = isNew ? score : state.allTimeHighScore;

        // ── Evaluar qué logros se desbloquean ──
        const ctx = {
          score,
          reachedSpace: newSpace,
          reachedReal:  newReal,
          maxSpeed,
          maxSpeedSeconds,
          gamesPlayed: newGames,
          isNewRecord: isNew,
        };

        const newlyUnlocked = ACHIEVEMENTS.filter(
          (a) =>
            !state.unlockedIds.includes(a.id) &&
            a.condition(ctx)
        );

        const newIds = [
          ...state.unlockedIds,
          ...newlyUnlocked.map((a) => a.id),
        ];

        // ── Actualizar leaderboard (top 10) ──
        const entry = {
          name:      "",           // se rellena con submitScore()
          score:     Math.floor(score),
          dimension: reachedReal ? "REAL" : reachedSpace ? "SPACE" : "GRID",
          date:      new Date().toLocaleDateString("es-CO", {
                       day: "2-digit", month: "2-digit"
                     }),
          pending:   true,         // esperando que el jugador ingrese su nombre
        };

        const rawBoard = [entry, ...state.leaderboard]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        const nextState = {
          gamesPlayed:      newGames,
          allTimeHighScore: newHigh,
          reachedSpace:     newSpace,
          reachedReal:      newReal,
          unlockedIds:      newIds,
          leaderboard:      rawBoard,
          // El primer logro desbloqueado va al toast (los demás en la pantalla)
          pendingToast:     newlyUnlocked.length > 0 ? newlyUnlocked[0] : null,
          newlyUnlockedIds: newlyUnlocked.map((a) => a.id),
        };

        set(nextState);
        saveProgress({
          unlockedIds:      newIds,
          gamesPlayed:      newGames,
          allTimeHighScore: newHigh,
          reachedSpace:     newSpace,
          reachedReal:      newReal,
          leaderboard:      rawBoard,
        });
      },

      // ── El jugador ingresa sus iniciales en el leaderboard ────────
      submitScore(name) {
        const state = get();
        const initials = (name || "???").toUpperCase().slice(0, 3).padEnd(3, "_");
        const updated  = state.leaderboard.map((entry, i) =>
          i === 0 && entry.pending
            ? { ...entry, name: initials, pending: false }
            : entry
        );
        set({ leaderboard: updated });
        saveProgress({
          unlockedIds:      state.unlockedIds,
          gamesPlayed:      state.gamesPlayed,
          allTimeHighScore: state.allTimeHighScore,
          reachedSpace:     state.reachedSpace,
          reachedReal:      state.reachedReal,
          leaderboard:      updated,
        });
      },

      clearToast() {
        set({ pendingToast: null });
      },

      // ── Reset completo (para testing / "borrar datos") ───────────
      resetProgress() {
        set({ ...INITIAL });
        saveProgress(INITIAL);
      },
    };
  })
);