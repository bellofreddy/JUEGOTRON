import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    lane: 0,
    speed: 15,
    isPaused: false,
    isGameOver: false,
    showGameOverUI: false,
    score: 0,

    // --- PERSISTENCIA BÁSICA ---
    highScore: typeof window !== 'undefined'
      ? Number(localStorage.getItem('juegotron_highscore')) || 0 : 0,
    history: typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('juegotron_history')) || [] : [],

    dimension: "GRID",
    gameStarted: false,

    // --- PORTALES ---
    portalActive: false,
    portalCollected: false,
    realPortalActive: false,
    realPortalCollected: false,

    // --- PRE-CARGA ---
    spacePreloaded: false,
    realPreloaded: false,

    // --- SISTEMA DE CALIDAD ---
    quality: 'high',
    setQuality: (val) => set({ quality: val }),

    // --- TRACKING PARA LOGROS ---
    // Se acumulan durante la partida y se envían a useProgressStore al morir
    _maxSpeed:         0,
    _maxSpeedSeconds:  0,
    _highSpeedTimer:   0,   // tiempo acumulado a velocidad >= 55
    _reachedSpace:     false,
    _reachedReal:      false,

    moveLeft:  () => set((s) => ({ lane: Math.max(s.lane - 1, -1) })),
    moveRight: () => set((s) => ({ lane: Math.min(s.lane + 1,  1) })),

    setDimension: (dim) => set((state) => ({
      dimension: dim,
      portalActive:      false,
      realPortalActive:  false,
      portalCollected:      dim === "SPACE" ? true : state.portalCollected,
      realPortalCollected:  dim === "REAL"  ? true : state.realPortalCollected,
      spacePreloaded:       dim === "SPACE" ? true : state.spacePreloaded,
      // Tracking de logros
      _reachedSpace: state._reachedSpace || dim === "SPACE" || dim === "REAL",
      _reachedReal:  state._reachedReal  || dim === "REAL",
    })),

    setPortalActive:     (active) => set({ portalActive: active }),
    setRealPortalActive: (active) => set({ realPortalActive: active }),
    triggerSpacePreload: ()       => set({ spacePreloaded: true }),
    triggerRealPreload:  ()       => set({ realPreloaded: true }),

    startGame: () => set({
      gameStarted:   true,
      isPaused:      false,
      isGameOver:    false,
      showGameOverUI: false,
    }),

    advanceGame: (delta) =>
      set((state) => {
        const newScore = state.score + delta * 10;
        const newSpeed = Math.min(state.speed + 0.2 * delta, 60);

        // Tracking para logros
        const newMaxSpeed    = Math.max(state._maxSpeed, newSpeed);
        const atMaxSpeed     = newSpeed >= 55;
        const newHiSpeedTime = atMaxSpeed
          ? state._highSpeedTimer + delta
          : state._highSpeedTimer;
        const newMaxSpeedSec = Math.max(state._maxSpeedSeconds, newHiSpeedTime);

        const base = {
          score: newScore,
          speed: newSpeed,
          _maxSpeed:        newMaxSpeed,
          _highSpeedTimer:  atMaxSpeed ? newHiSpeedTime : 0,
          _maxSpeedSeconds: newMaxSpeedSec,
        };

        if (newScore > state.highScore) {
          localStorage.setItem('juegotron_highscore', Math.floor(newScore));
          return { ...base, highScore: Math.floor(newScore) };
        }
        return base;
      }),

    setGameOver: () => {
      const state = get();

      // Guardar en historial simple
      const finalScore = Math.floor(state.score);
      const newHistory = [finalScore, ...state.history].slice(0, 5);
      if (typeof window !== 'undefined') {
        localStorage.setItem('juegotron_history', JSON.stringify(newHistory));
      }

      set({
        isGameOver:    true,
        isPaused:      true,
        speed:         0,
        history:       newHistory,
      });

      // ── Disparar sistema de progresión ──────────────────────────
      // Import dinámico para no crear dependencia circular en módulos
      import('./Useprogressstore').then(({ useProgressStore }) => {
        useProgressStore.getState().recordRun({
          score:           finalScore,
          reachedSpace:    state._reachedSpace,
          reachedReal:     state._reachedReal,
          maxSpeed:        state._maxSpeed,
          maxSpeedSeconds: state._maxSpeedSeconds,
        });
      });

      setTimeout(() => {
        set({ showGameOverUI: true });
      }, 2000);
    },

    togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

    resetGame: () => set({
      lane: 0,
      isGameOver:    false,
      showGameOverUI: false,
      isPaused:      false,
      speed:         15,
      score:         0,
      dimension:     "GRID",
      gameStarted:   false,
      portalActive:          false,
      portalCollected:       false,
      realPortalActive:      false,
      realPortalCollected:   false,
      spacePreloaded:        false,
      realPreloaded:         false,
      // Reset tracking de logros
      _maxSpeed:        0,
      _maxSpeedSeconds: 0,
      _highSpeedTimer:  0,
      _reachedSpace:    false,
      _reachedReal:     false,
    }),
  }))
);