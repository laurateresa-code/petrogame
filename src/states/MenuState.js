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

    // Link do GitHub no rodapé (clicável).
    this._ghHover = this._ghRect && pointInRect(mx, my, this._ghRect);
    if (this._ghHover && this.game.input.mouse.pressed) {
      this.game.audio.sfx("click");
      window.open("https://github.com/laurateresa-code", "_blank", "noopener");
    }

    // Cursor de mãozinha sobre qualquer elemento clicável.
    this.game.canvas.el.style.cursor = (this._hovered || this._ghHover) ? "pointer" : "default";

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

    Painter.text(ctx, "Pressione ENTER para jogar  •  M = mudo  •  F3 = debug", VIEW.WIDTH / 2, VIEW.HEIGHT - 48, {
      size: 13, color: PALETTE.TEXT_DIM, align: "center",
    });

    this._renderGithub(ctx);
  }

  /** Rodapé minimalista e clicável com o ícone do GitHub e o username. */
  _renderGithub(ctx) {
    const user = "laurateresa-code";
    const icon = 18, gap = 8;
    const y = VIEW.HEIGHT - 22;

    ctx.font = "13px Segoe UI, sans-serif";
    const textW = ctx.measureText(user).width;
    const startX = (VIEW.WIDTH - (icon + gap + textW)) / 2;

    // Área clicável (consumida pelo update).
    this._ghRect = { x: startX, y: y - 11, w: icon + gap + textW, h: 22 };

    const color = this._ghHover ? PALETTE.ACCENT : PALETTE.TEXT_DIM;
    const textX = startX + icon + gap;

    this._drawGithubIcon(ctx, startX, y - icon / 2, icon, color);
    Painter.text(ctx, user, textX, y, { size: 13, color, align: "left", baseline: "middle" });

    // Sublinhado no hover, reforçando que é um link.
    if (this._ghHover) {
      ctx.fillStyle = color;
      ctx.fillRect(textX, y + 9, textW, 1);
    }
  }

  /** Logo oficial do GitHub (path SVG 24x24) desenhado via Path2D. */
  _drawGithubIcon(ctx, x, y, size, color) {
    if (!this._ghPath) {
      this._ghPath = new Path2D(
        "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 " +
        "0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7" +
        "c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998" +
        ".108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221" +
        "-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803" +
        "c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176" +
        ".77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222" +
        "0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297" +
        "c0-6.627-5.373-12-12-12"
      );
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 24, size / 24);
    ctx.fillStyle = color;
    ctx.fill(this._ghPath);
    ctx.restore();
  }
}
