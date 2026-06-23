/* =========================================================================
   GameConfig.js
   Valores AJUSTÁVEIS de gameplay (balanceamento). Ficam centralizados para
   facilitar o "game feel" sem caçar números pelo código. Diferente de
   Constants.js, estes valores podem ser usados como base e modificados por
   upgrades/fases nos sistemas correspondentes.
   ========================================================================= */

export const GameConfig = {
  /** Ativa recursos de depuração na inicialização (também alternável com F3). */
  debug: false,

  /** Player / movimento (usados a partir da Etapa 6). */
  player: {
    moveSpeed: 120,      // px/s na superfície
    drillSpeed: 1.0,     // multiplicador base de velocidade de perfuração
    gravity: 480,        // px/s²
  },

  /** Combustível (Etapa de combustível). */
  fuel: {
    max: 100,
    drainMove: 1.5,      // por segundo andando
    drainDrill: 4.0,     // por segundo perfurando
    drainTurbo: 8.0,     // por segundo em turbo
  },

  /** Temperatura e pressão escalam com a profundidade. */
  thermal: {
    tempPerMeter: 0.35,
    overheatAt: 80,
  },
  pressure: {
    perMeter: 0.5,
  },

  /** Economia base. */
  economy: {
    startMoney: 0,
  },
};
