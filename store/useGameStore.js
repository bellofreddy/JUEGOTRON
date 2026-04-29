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
    
    // --- PORTAL 1: RED -> ESPACIO ---
    portalActive: false,
    portalCollected: false,
    
    // --- PORTAL 2: ESPACIO -> REALIDAD (NUEVO) ---
    realPortalActive: false,
    realPortalCollected: false,
    
    // --- SISTEMA DE CALIDAD ---
    quality: 'high', 
    setQuality: (val) => set({ quality: val }),

    moveLeft: () => set((state) => ({ lane: Math.max(state.lane - 1, -1) })),
    moveRight: () => set((state) => ({ lane: Math.min(state.lane + 1, 1) })),

    // Modificado para manejar la transición entre las 3 dimensiones
    setDimension: (dim) => set((state) => ({ 
      dimension: dim, 
      // Desactivamos visualmente los portales al cruzar
      portalActive: false,
      realPortalActive: false,
      // Marcamos como recolectado el que corresponda para que no reaparezca
      portalCollected: dim === "SPACE" ? true : state.portalCollected,
      realPortalCollected: dim === "REAL" ? true : state.realPortalCollected
    })),

    // Funciones para activar los portales
    setPortalActive: (active) => set({ portalActive: active }),
    setRealPortalActive: (active) => set({ realPortalActive: active }), // Esta es la que faltaba

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
        realPortalActive: false,
        realPortalCollected: false,
      }),
  }))
);