/* =========================================================================
   Constants.js
   Constantes IMUTÁVEIS do jogo: resolução, tiles, FPS, paleta base.
   Nunca devem mudar em tempo de execução. Para valores ajustáveis de
   gameplay (que poderão variar por upgrade/fase), use GameConfig.js.
   ========================================================================= */

/** Resolução lógica interna do jogo (o canvas é escalado para caber na tela). */
export const VIEW = Object.freeze({
  WIDTH: 960,
  HEIGHT: 540,
});

/** Configuração do laço principal. */
export const LOOP = Object.freeze({
  TARGET_FPS: 60,
  // Limita o deltaTime para evitar "spiral of death" após travadas/abas em 2º plano.
  MAX_DELTA: 1 / 30, // segundos
});

/** Tamanho de um bloco do subsolo, em pixels (mundo). */
export const TILE = Object.freeze({
  SIZE: 32,
});

/** Identificadores dos estados do jogo (evita strings soltas pelo código). */
export const STATES = Object.freeze({
  BOOT: "boot",
  MENU: "menu",
  TUTORIAL: "tutorial",
  PLAY: "play",
  PAUSE: "pause",
  SHOP: "shop",
  GAME_OVER: "gameOver",
  VICTORY: "victory",
  CREDITS: "credits",
  SETTINGS: "settings",
});

/** Paleta base da interface (cores de gameplay ficam em BlockTypes futuramente). */
export const PALETTE = Object.freeze({
  SKY_TOP: "#7ec0ee",
  SKY_BOTTOM: "#cfe8ff",
  GROUND_LINE: "#5a3a1a",
  ACCENT: "#ffb22e",
  ACCENT_DARK: "#c77f12",
  TEXT: "#ffffff",
  TEXT_DIM: "#b9a98f",
  PANEL: "#1c1a17",
  PANEL_LIGHT: "#2a2620",
  DANGER: "#e04b4b",
  OK: "#5bd16a",
});

/** Chave única usada pelo sistema de salvamento (LocalStorage). */
export const SAVE_KEY = "caca-ao-petroleo:save:v1";
