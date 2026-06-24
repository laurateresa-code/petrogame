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
      { id: "howto", label: "COMO JOGAR", action: () => this.game.states.change(STATES.TUTORIAL) },
    ].map((b, i) => ({
      ...b,
      rect: { x: cx - w / 2, y: startY + i * (h + gap), w, h },
    }));
  }

  exit() {
    // Restaura o cursor ao sair do menu (outros estados não usam mãozinha).
    this.game.canvas.el.style.cursor = "default";
  }

  update(dt) {
    this._time += dt;

    const { x: mx, y: my } = this.game.input.mouse;
    this._hovered = null;
    for (const b of this._buttons) {
      if (pointInRect(mx, my, b.rect)) {
        this._hovered = b.id;
        if (this.game.input.mouse.pressed) {
          this.game.audio.sfx("click");
          b.action();
        }
      }
    }

    // Cursor de mãozinha sobre os botões.
    this.game.canvas.el.style.cursor = this._hovered ? "pointer" : "default";

    // Atalho: Enter inicia o jogo.
    if (this.game.input.wasPressed("Enter")) {
      this.game.audio.sfx("click");
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

    // Cabeçalho da apresentação (feira de ciências / turma).
    Painter.text(ctx, "FEIRA DE CIÊNCIAS DO ARCOVERDE", VIEW.WIDTH / 2, 52, {
      size: 22, color: PALETTE.TEXT, align: "center", baseline: "middle", weight: "bold", shadow: true,
    });
    Painter.text(ctx, "Turma 3001 apresenta:", VIEW.WIDTH / 2, 88, {
      size: 16, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });

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

    Painter.text(ctx, "Pressione ENTER para jogar  •  M = mudo  •  F3 = debug", VIEW.WIDTH / 2, VIEW.HEIGHT - 24, {
      size: 13, color: PALETTE.TEXT_DIM, align: "center",
    });
  }
}
