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
    history: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('juegotron_history')) || [] : [],
    
    dimension: "GRID",
    gameStarted: false, 
    
    // --- PORTALES ---
    portalActive: false,
    portalCollected: false,
    realPortalActive: false,
    realPortalCollected: false,

    // --- PRE-CARGA DE DIMENSIONES ---
    // Se activan antes de llegar al portal para que React monte el componente
    // en segundo plano, evitando el spike de CPU al cruzar
    spacePreloaded: false,
    realPreloaded: false,
    
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
      realPortalCollected: dim === "REAL" ? true : state.realPortalCollected,
      // Al entrar en SPACE, marcamos el real como "listo para precargar"
      spacePreloaded: dim === "SPACE" ? true : state.spacePreloaded,
    })),

    setPortalActive: (active) => set({ portalActive: active }),
    setRealPortalActive: (active) => set({ realPortalActive: active }),

    // Activa la pre-carga silenciosa del siguiente landscape
    triggerSpacePreload: () => set({ spacePreloaded: true }),
    triggerRealPreload:  () => set({ realPreloaded:  true }),

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
        const newHistory = [finalScore, ...state.history].slice(0, 5);
        if (typeof window !== 'undefined') {
          localStorage.setItem('juegotron_history', JSON.stringify(newHistory));
        }
        return { 
          isGameOver: true, 
          isPaused: true, 
          speed: 0,
          history: newHistory
        };
      });
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
        spacePreloaded: false,
        realPreloaded: false,
      }),
  }))
);