/* =========================================================================
   main.js
   Ponto de entrada único do jogo. Instancia a engine (Game) e a inicia.
   Mantém-se propositalmente minúsculo: toda a lógica vive nos módulos.
   ========================================================================= */

import { Game } from "./engine/Game.js";

window.addEventListener("DOMContentLoaded", () => {
  try {
    const game = new Game("game-canvas");
    game.start();
    // Exposto para depuração no console do navegador.
    window.__GAME__ = game;
  } catch (err) {
    console.error("Falha ao iniciar o jogo:", err);
    document.body.innerHTML =
      `<pre style="color:#ffb22e;padding:24px;font:14px monospace">` +
      `Erro ao iniciar.\n\nSe abriu via file://, use um servidor local ` +
      `(módulos ES exigem http). Veja o README.\n\n${err.message}</pre>`;
  }
});
