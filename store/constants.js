// constants.js
export const THEME = {
  cyan: "#00f7ff",
  orange: "#ff6600", // Color para el modo SPACE
  pink: "#ff0055",
  grid: "#002222",
  background: "#010610",
};

export const GAME_CONFIG = {
  GROUND_Y: 0,
  LANE_WIDTH: 4,
  INITIAL_SPEED: 15,
};

// --- NUEVA CONFIGURACIÓN DE CALIDAD ---
export const QUALITY_SETTINGS = {
  low: {
    buildingCount: 15,
    spacing: 50,
    showBranches: false,
    bloomIntensity: 0.5,
    renderDistance: 400,
  },
  medium: {
    buildingCount: 30,
    spacing: 35,
    showBranches: true,
    branchCount: 3,
    bloomIntensity: 1.0,
    renderDistance: 700,
  },
  high: {
    buildingCount: 45,
    spacing: 25,
    showBranches: true,
    branchCount: 6,
    bloomIntensity: 1.5,
    renderDistance: 1000,
  }
};