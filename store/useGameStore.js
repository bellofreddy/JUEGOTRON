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
    
    // --- PERSISTENCIA ---
    highScore: typeof window !== 'undefined' ? Number(localStorage.getItem('juegotron_highscore')) || 0 : 0,
    // Recuperamos el historial del localStorage o iniciamos un array vacío
    history: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('juegotron_history')) || [] : [],
    
    dimension: "GRID",
    gameStarted: false, 
    
    // --- PORTALES ---
    portalActive: false,
    portalCollected: false,
    realPortalActive: false,
    realPortalCollected: false,
    
    // --- SISTEMA DE CALIDAD ---
    quality: 'high', 
    setQuality: (val) => set({ quality: val }),

    moveLeft: () => set((state) => ({ lane: Math.max(state.lane - 1, -1) })),
    moveRight: () => set((state) => ({ lane: Math.min(state.lane + 1, 1) })),

    setDimension: (dim) => set((state) => ({ 
      dimension: dim, 
      portalActive: false,
      realPortalActive: false,
      portalCollected: dim === "SPACE" ? true : state.portalCollected,
      realPortalCollected: dim === "REAL" ? true : state.realPortalCollected
    })),

    setPortalActive: (active) => set({ portalActive: active }),
    setRealPortalActive: (active) => set({ realPortalActive: active }),

    startGame: () => set({ 
      gameStarted: true, 
      isPaused: false, 
      isGameOver: false, 
      showGameOverUI: false 
    }),

    advanceGame: (delta) =>
      set((state) => {
        const newScore = state.score + delta * 10;
        const newSpeed = Math.min(state.speed + 0.2 * delta, 60);
        
        if (newScore > state.highScore) {
          localStorage.setItem('juegotron_highscore', Math.floor(newScore));
          return { score: newScore, speed: newSpeed, highScore: Math.floor(newScore) };
        }
        
        return { score: newScore, speed: newSpeed };
      }),

    setGameOver: () => {
      set((state) => {
        const finalScore = Math.floor(state.score);
        
        // --- ACTUALIZAR HISTORIAL ---
        // Creamos la nueva lista con el puntaje actual al inicio
        const newHistory = [finalScore, ...state.history].slice(0, 5);
        
        // Guardamos en localStorage para que no se pierda al recargar
        if (typeof window !== 'undefined') {
          localStorage.setItem('juegotron_history', JSON.stringify(newHistory));
        }

        return { 
          isGameOver: true, 
          isPaused: true, 
          speed: 0,
          history: newHistory // Actualizamos el estado
        };
      });

      // Retraso de 2 segundos para mostrar el cartel de Game Over
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
        gameStarted: false, 
        portalActive: false,
        portalCollected: false,
        realPortalActive: false,
        realPortalCollected: false,
      }),
  }))
);