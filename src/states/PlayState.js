/* =========================================================================
   PlayState.js
   Estado de JOGO. Nesta fundação é apenas um espaço reservado (placeholder)
   que prova o laço, a câmera e o input funcionando. A partir da Etapa 5 ele
   passará a hospedar o Mapa, o Jogador, a Perfuração, o HUD, etc. — sempre
   mantendo a estrutura de update()/render() já estabelecida.
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW } from "../config/Constants.js";
import { Painter } from "../ui/Painter.js";

export class PlayState extends State {
  enter() {
    this._time = 0;
  }

  update(dt) {
    this._time += dt;

    // ESC volta ao menu (a tela de Pausa virá na etapa de polimento/estados).
    if (this.game.input.wasPressed("Escape")) {
      this.game.states.change(STATES.MENU);
    }
  }

  render(ctx) {
    // Céu.
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT * 0.4);
    sky.addColorStop(0, PALETTE.SKY_TOP);
    sky.addColorStop(1, PALETTE.SKY_BOTTOM);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT * 0.4);

    // Subsolo (placeholder).
    ctx.fillStyle = "#3a2412";
    ctx.fillRect(0, VIEW.HEIGHT * 0.4, VIEW.WIDTH, VIEW.HEIGHT * 0.6);
    ctx.fillStyle = PALETTE.GROUND_LINE;
    ctx.fillRect(0, VIEW.HEIGHT * 0.4 - 3, VIEW.WIDTH, 6);

    Painter.panel(ctx, VIEW.WIDTH / 2 - 230, 60, 460, 110, {
      fill: "rgba(0,0,0,0.45)", stroke: PALETTE.ACCENT_DARK, radius: 12,
    });
    Painter.text(ctx, "FUNDAÇÃO PRONTA", VIEW.WIDTH / 2, 100, {
      size: 26, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold",
    });
    Painter.text(ctx, "Mapa, jogador e perfuração entram na Etapa 5+", VIEW.WIDTH / 2, 135, {
      size: 15, color: PALETTE.TEXT, align: "center", baseline: "middle",
    });
    Painter.text(ctx, "ESC = menu", VIEW.WIDTH / 2, 158, {
      size: 13, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });
  }
}
