/* =========================================================================
   BootState.js
   Estado de inicialização. Mostra uma tela de carregamento breve e então
   segue para o MENU. No futuro, é aqui que carregaremos assets/áudio e o
   save do jogador antes de liberar o menu.
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW } from "../config/Constants.js";
import { Painter } from "../ui/Painter.js";

const BOOT_DURATION = 1.1; // segundos

export class BootState extends State {
  enter() {
    this._t = 0;
  }

  update(dt) {
    this._t += dt;
    if (this._t >= BOOT_DURATION) {
      this.game.states.change(STATES.MENU);
    }
  }

  render(ctx) {
    // Fundo escuro com o título surgindo.
    ctx.fillStyle = "#0a0704";
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    const alpha = Math.min(1, this._t / (BOOT_DURATION * 0.6));
    ctx.globalAlpha = alpha;
    Painter.text(ctx, "CAÇA AO PETRÓLEO", VIEW.WIDTH / 2, VIEW.HEIGHT / 2 - 10, {
      size: 40, color: PALETTE.ACCENT, align: "center", baseline: "middle",
      weight: "bold", shadow: true,
    });
    Painter.text(ctx, "carregando…", VIEW.WIDTH / 2, VIEW.HEIGHT / 2 + 30, {
      size: 16, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });
    ctx.globalAlpha = 1;
  }
}
