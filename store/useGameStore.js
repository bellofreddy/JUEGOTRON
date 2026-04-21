// useGameStore.js
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useGameStore = create(
  subscribeWithSelector((set) => ({
    lane: 0,
    speed: 15,
    isPaused: false,
    isGameOver: false,
    showGameOverUI: false,
    score: 0,
    dimension: "GRID",
    portalActive: false,
    portalCollected: false,
    
    // --- NUEVO: SISTEMA DE CALIDAD ---
    quality: 'high', // Valor inicial por defecto
    setQuality: (val) => set({ quality: val }),
    // ---------------------------------

    moveLeft: () => set((state) => ({ lane: Math.max(state.lane - 1, -1) })),
    moveRight: () => set((state) => ({ lane: Math.min(state.lane + 1, 1) })),
    setDimension: (dim) => set({ dimension: dim, portalCollected: true }),
    setPortalActive: (active) => set({ portalActive: active }),

    advanceGame: (delta) =>
      set((state) => ({
        speed: Math.min(state.speed + 0.2 * delta, 60),
        score: state.score + delta * 10,
      })),

    setGameOver: () => {
      set({ isGameOver: true, isPaused: true, speed: 0 });
      setTimeout(() => {
        set({ showGameOverUI: true });
      }, 2000);
    },

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    resetGame: () =>
      set({
        lane: 0,
        isGameOver: false,
        showGameOverUI: false,
        isPaused: false,
        speed: 15,
        score: 0,
        dimension: "GRID",
        portalActive: false,
        portalCollected: false,
      }),

    startGame: () =>
      set({
        lane: 0,
        isGameOver: false,
        showGameOverUI: false,
        isPaused: false,
        speed: 15,
        score: 0,
        dimension: "GRID",
        portalActive: false,
        portalCollected: false,
      }),
  })),
);