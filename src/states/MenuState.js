/* =========================================================================
   MenuState.js
   Menu principal. Desenha o título e botões interativos. Por enquanto
   apenas "Jogar" leva ao PLAY; os demais botões são exibidos como base
   para as próximas etapas (serão ligados quando seus estados existirem).
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW } from "../config/Constants.js";
import { Painter, pointInRect } from "../ui/Painter.js";

export class MenuState extends State {
  enter() {
    this._time = 0;
    // Definição declarativa dos botões — fácil de estender.
    const cx = VIEW.WIDTH / 2;
    const w = 240, h = 52, gap = 14, startY = 250;
    this._buttons = [
      { id: "play", label: "JOGAR", action: () => this.game.states.change(STATES.PLAY) },
      { id: "shop", label: "LOJA", action: () => this.game.states.change(STATES.SHOP) },
      { id: "credits", label: "CRÉDITOS", action: () => {} },
    ].map((b, i) => ({
      ...b,
      rect: { x: cx - w / 2, y: startY + i * (h + gap), w, h },
    }));
  }

  update(dt) {
    this._time += dt;

    const { x: mx, y: my } = this.game.input.mouse;
    this._hovered = null;
    for (const b of this._buttons) {
      if (pointInRect(mx, my, b.rect)) {
        this._hovered = b.id;
        if (this.game.input.mouse.pressed) b.action();
      }
    }

    // Atalho: Enter inicia o jogo.
    if (this.game.input.wasPressed("Enter")) {
      this.game.states.change(STATES.PLAY);
    }
  }

  render(ctx) {
    // Fundo em gradiente (céu -> subsolo) para dar identidade.
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
    g.addColorStop(0, "#143a52");
    g.addColorStop(0.5, "#3a2412");
    g.addColorStop(1, "#0a0704");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    // Título com leve oscilação.
    const bob = Math.sin(this._time * 2) * 4;
    Painter.text(ctx, "CAÇA AO PETRÓLEO", VIEW.WIDTH / 2, 150 + bob, {
      size: 52, color: PALETTE.ACCENT, align: "center", baseline: "middle",
      weight: "bold", shadow: true,
    });
    Painter.text(ctx, "explore • perfure • enriqueça", VIEW.WIDTH / 2, 195, {
      size: 18, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });
    Painter.text(ctx, `$ ${this.game.profile.money}`, VIEW.WIDTH / 2, 222, {
      size: 18, color: PALETTE.OK, align: "center", baseline: "middle", weight: "bold",
    });

    // Botões.
    for (const b of this._buttons) {
      Painter.button(ctx, b.label, b.rect.x, b.rect.y, b.rect.w, b.rect.h, {
        hovered: this._hovered === b.id,
      });
    }

    Painter.text(ctx, "Pressione ENTER para jogar  •  F3 = debug", VIEW.WIDTH / 2, VIEW.HEIGHT - 24, {
      size: 13, color: PALETTE.TEXT_DIM, align: "center",
    });
  }
}
