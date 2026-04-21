"use client";

import { useGameStore } from "../../store/useGameStore";
import styles from "./HUD.module.css";

export default function HUD() {
  const { score, isGameOver, isPaused, startGame, portalActive, dimension } = useGameStore();
  const PORTAL_SCORE_THRESHOLD = 750;
  const distanceToPortal = Math.max(0, PORTAL_SCORE_THRESHOLD - score);
  const portalPercentage = (score / PORTAL_SCORE_THRESHOLD) * 100;

  return (
    <div className={styles.container}>
      {/* Marcador de XP arriba a la derecha */}
      <div className={styles.scoreBoard}>
        <p className={styles.label}>XP_COLLECTED</p>
        <h2 className={styles.scoreValue}>{score.toString().padStart(6, '0')}</h2>
      </div>

      {/* Portal Status - Muestra progreso hacia el portal */}
      {!isGameOver && (
        <div className={styles.portalStatus}>
          <p className={styles.statusLabel}>
            {portalActive 
              ? `⚡ PORTAL_ACTIVE [${dimension}]` 
              : `◯ PORTAL_IN: ${distanceToPortal.toFixed(0)}m`}
          </p>
          <div className={styles.portalBar}>
            <div 
              className={`${styles.portalFill} ${portalActive ? styles.active : ''}`}
              style={{ width: `${Math.min(portalPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Menú de Inicio / Game Over */}
      {(isPaused || isGameOver) && (
        <div className={styles.overlay}>
          <div className={styles.menuBox}>
            <h1 className={styles.title}>{isGameOver ? "SISTEMA_OFFLINE" : "NEON_RUNNER"}</h1>
            {isGameOver && <p className={styles.finalScore}>Puntaje Final: {score}</p>}
            <button className={styles.playButton} onClick={startGame}>
              {isGameOver ? "REBOOT_SYSTEM" : "INITIALIZE_LINK"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}