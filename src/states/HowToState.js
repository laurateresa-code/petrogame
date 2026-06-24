/* =========================================================================
   HowToState.js
   Tela "COMO JOGAR" — guia ilustrado e didático. Mostra:
     - cards de passo a passo com mini-ilustrações desenhadas (sonda, jato,
       gota de petróleo, moeda, bomba, medidor de combustível);
     - legenda visual de cada bloco (mesmas cores do jogo);
     - rodapé com o GitHub da autora (clicável).
   ESC ou VOLTAR retorna ao menu.
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW } from "../config/Constants.js";
import { Painter, pointInRect } from "../ui/Painter.js";
import { BLOCK, BLOCK_DEFS } from "../world/BlockTypes.js";

const GITHUB_URL = "https://github.com/laurateresa-code";
const GITHUB_USER = "laurateresa-code";

// Passo a passo (a ilustração de cada card é desenhada por índice).
const CARDS = [
  { n: 1, title: "CAVE",      lines: ["Use ↓ ← → (ou WASD)", "para furar a terra."] },
  { n: 2, title: "SUBA",      lines: ["↑ ou Espaço ligam o", "jato e voltam à tona."] },
  { n: 3, title: "FATURE",    lines: ["Petróleo e joias viram", "dinheiro na hora!"] },
  { n: 4, title: "SOBREVIVA", lines: ["Fuja das bombas e", "cuide do combustível."] },
];

// Legenda dos blocos (linha 1 = comuns; linha 2 = especiais).
const LEGEND = [
  { id: BLOCK.DIRT, t: "Terra (sem valor)" },
  { id: BLOCK.ROCK, t: "Rocha (dura)" },
  { id: BLOCK.HARDROCK, t: "Granito (bem dura)" },
  { id: BLOCK.FUEL, t: "Gás (+combustível)" },
  { id: BLOCK.OIL, t: "Petróleo (+$60)" },
  { id: BLOCK.GEM, t: "Esmeralda (+$180)" },
  { id: BLOCK.BOMB, t: "Bomba (explode!)" },
  { id: BLOCK.BEDROCK, t: "Base (indestrutível)" },
];

export class HowToState extends State {
  enter() {
    this._backRect = { x: VIEW.WIDTH - 144, y: 22, w: 120, h: 36 };
    const w = 224, h = 168, gap = 12, y = 78;
    this._cardRects = CARDS.map((_, i) => ({ x: 16 + i * (w + gap), y, w, h }));
    this._ghRect = null;
    this._ghHover = false;
    this._backHover = false;
  }

  exit() {
    this.game.canvas.el.style.cursor = "default";
  }

  update() {
    const input = this.game.input;
    const { x: mx, y: my } = input.mouse;

    if (input.wasPressed("Escape")) {
      this.game.audio.sfx("click");
      this.game.states.change(STATES.MENU);
      return;
    }

    this._backHover = pointInRect(mx, my, this._backRect);
    this._ghHover = this._ghRect && pointInRect(mx, my, this._ghRect);
    this.game.canvas.el.style.cursor = (this._backHover || this._ghHover) ? "pointer" : "default";

    if (input.mouse.pressed) {
      if (this._backHover) {
        this.game.audio.sfx("click");
        this.game.states.change(STATES.MENU);
      } else if (this._ghHover) {
        this.game.audio.sfx("click");
        window.open(GITHUB_URL, "_blank", "noopener");
      }
    }
  }

  render(ctx) {
    // Fundo.
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
    g.addColorStop(0, "#143a52");
    g.addColorStop(1, "#0a0704");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    Painter.text(ctx, "COMO JOGAR", 24, 36, {
      size: 30, color: PALETTE.ACCENT, baseline: "middle", weight: "bold", shadow: true,
    });
    Painter.text(ctx, "um guia rápido pra virar magnata do petróleo", 24, 62, {
      size: 14, color: PALETTE.TEXT_DIM, baseline: "middle",
    });

    Painter.button(ctx, "VOLTAR", this._backRect.x, this._backRect.y, this._backRect.w, this._backRect.h, {
      hovered: this._backHover, size: 15,
    });

    // Cards do passo a passo.
    this._cardRects.forEach((r, i) => this._renderCard(ctx, r, i));

    // Legenda dos blocos.
    Painter.text(ctx, "O QUE É CADA BLOCO?", 24, 272, {
      size: 16, color: PALETTE.TEXT, baseline: "middle", weight: "bold",
    });
    LEGEND.forEach((item, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 22 + col * 232;
      const cy = 304 + row * 40;
      this._swatch(ctx, x, cy - 13, 26, item.id);
      Painter.text(ctx, item.t, x + 36, cy, { size: 13, color: PALETTE.TEXT, baseline: "middle" });
    });

    Painter.text(ctx, "Setas / WASD movem  •  ↑ ou Espaço = jato  •  ESC volta ao menu", VIEW.WIDTH / 2, 408, {
      size: 13, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });

    this._renderGithub(ctx);
  }

  // ---- Card individual --------------------------------------------------
  _renderCard(ctx, r, i) {
    Painter.panel(ctx, r.x, r.y, r.w, r.h, { fill: "rgba(0,0,0,0.35)", stroke: PALETTE.ACCENT_DARK, radius: 12 });

    // Selo numerado.
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.beginPath();
    ctx.arc(r.x + 22, r.y + 22, 14, 0, Math.PI * 2);
    ctx.fill();
    Painter.text(ctx, String(CARDS[i].n), r.x + 22, r.y + 23, {
      size: 16, color: PALETTE.PANEL, align: "center", baseline: "middle", weight: "bold",
    });

    // Ilustração.
    const cx = r.x + r.w / 2, cy = r.y + 70;
    this._illustrate(ctx, i, cx, cy);

    // Texto.
    Painter.text(ctx, CARDS[i].title, cx, r.y + 112, {
      size: 18, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold",
    });
    CARDS[i].lines.forEach((ln, k) => {
      Painter.text(ctx, ln, cx, r.y + 132 + k * 18, {
        size: 13, color: PALETTE.TEXT, align: "center", baseline: "middle",
      });
    });
  }

  _illustrate(ctx, i, cx, cy) {
    if (i === 0) {
      // CAVE: sonda apontando para baixo + setas.
      this._drawDrill(ctx, cx, cy - 4, 15, "down");
      const a = { size: 22, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold" };
      Painter.text(ctx, "←", cx - 38, cy - 4, a);
      Painter.text(ctx, "→", cx + 38, cy - 4, a);
      Painter.text(ctx, "↓", cx, cy + 34, a);
    } else if (i === 1) {
      // SUBA: sonda para cima + jato (chama) embaixo.
      this._drawDrill(ctx, cx, cy + 2, 15, "up");
      this._drawFlame(ctx, cx, cy + 30, 10);
      Painter.text(ctx, "↑", cx, cy - 34, {
        size: 24, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold",
      });
    } else if (i === 2) {
      // FATURE: gota de petróleo -> moeda.
      this._drawDrop(ctx, cx - 38, cy + 4, 13);
      Painter.text(ctx, "→", cx, cy, {
        size: 24, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold",
      });
      this._drawCoin(ctx, cx + 38, cy, 16);
    } else {
      // SOBREVIVA: bomba + medidor de combustível baixo.
      this._swatch(ctx, cx - 52, cy - 16, 30, BLOCK.BOMB);
      Painter.bar(ctx, cx + 2, cy - 7, 50, 13, 0.28, { fill: PALETTE.DANGER, bg: "#2a2620" });
      Painter.text(ctx, "fuel", cx + 27, cy + 16, {
        size: 11, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
      });
    }
  }

  // ---- Mini-ilustrações desenhadas -------------------------------------
  _drawDrill(ctx, cx, cy, s, dir) {
    const x = cx - s, y = cy - s, side = s * 2;
    ctx.fillStyle = "#ffb22e";
    Painter.roundRect(ctx, x, y, side, side, 4); ctx.fill();
    ctx.fillStyle = "#15324a";
    Painter.roundRect(ctx, x + s * 0.45, y + s * 0.35, side - s * 0.9, side - s, 3); ctx.fill();
    ctx.fillStyle = "#bfe6ff";
    ctx.fillRect(x + s * 0.6, y + s * 0.55, side - s * 1.2, s * 0.4);

    ctx.fillStyle = "#dcdcdc";
    ctx.beginPath();
    if (dir === "down") {
      ctx.moveTo(cx - s * 0.4, y + side); ctx.lineTo(cx + s * 0.4, y + side); ctx.lineTo(cx, y + side + s * 0.7);
    } else if (dir === "up") {
      ctx.moveTo(cx - s * 0.4, y); ctx.lineTo(cx + s * 0.4, y); ctx.lineTo(cx, y - s * 0.7);
    } else {
      ctx.moveTo(x + side, cy - s * 0.4); ctx.lineTo(x + side, cy + s * 0.4); ctx.lineTo(x + side + s * 0.7, cy);
    }
    ctx.closePath(); ctx.fill();
  }

  _drawFlame(ctx, cx, cy, s) {
    ctx.fillStyle = "#ff7b2e";
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.quadraticCurveTo(cx + s, cy - s * 0.2, cx, cy + s);
    ctx.quadraticCurveTo(cx - s, cy - s * 0.2, cx, cy - s);
    ctx.fill();
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.35);
    ctx.quadraticCurveTo(cx + s * 0.5, cy, cx, cy + s * 0.7);
    ctx.quadraticCurveTo(cx - s * 0.5, cy, cx, cy - s * 0.35);
    ctx.fill();
  }

  _drawDrop(ctx, cx, cy, r) {
    ctx.fillStyle = "#2a2740";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.72, cy - r * 0.5);
    ctx.lineTo(cx, cy - r * 1.7);
    ctx.lineTo(cx + r * 0.72, cy - r * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(150,140,210,0.7)";
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.1, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }

  _drawCoin(ctx, cx, cy, r) {
    ctx.fillStyle = PALETTE.ACCENT;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PALETTE.ACCENT_DARK; ctx.stroke();
    Painter.text(ctx, "$", cx, cy + 1, {
      size: r * 1.3, color: PALETTE.PANEL, align: "center", baseline: "middle", weight: "bold",
    });
  }

  /** Bloco da legenda igual ao do jogo (cor base + brilho/marcador). */
  _swatch(ctx, x, y, s, id) {
    const def = BLOCK_DEFS[id];
    ctx.fillStyle = def.color;
    ctx.fillRect(x, y, s, s);

    if (id === BLOCK.OIL) {
      ctx.fillStyle = "rgba(120,110,160,0.6)";
      ctx.fillRect(x + s * 0.25, y + s * 0.25, s * 0.5, s * 0.5);
    } else if (id === BLOCK.GEM) {
      ctx.fillStyle = "rgba(180,255,220,0.65)";
      ctx.fillRect(x + s * 0.28, y + s * 0.28, s * 0.44, s * 0.44);
    } else if (id === BLOCK.FUEL) {
      ctx.fillStyle = "rgba(255,200,255,0.6)";
      ctx.fillRect(x + s * 0.28, y + s * 0.28, s * 0.44, s * 0.44);
    } else if (id === BLOCK.BOMB) {
      ctx.fillStyle = "rgba(224,75,75,0.92)";
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      Painter.text(ctx, "!", x + s / 2, y + s / 2 + 1, {
        size: s * 0.6, color: "#fff", align: "center", baseline: "middle", weight: "bold",
      });
    }

    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }

  // ---- Rodapé do GitHub (clicável) -------------------------------------
  _renderGithub(ctx) {
    const label = "criado por";
    const icon = 18, gap = 8, lblGap = 10, y = 472;

    ctx.font = "13px Segoe UI, sans-serif";
    const lblW = ctx.measureText(label).width;
    const userW = ctx.measureText(GITHUB_USER).width;
    const total = lblW + lblGap + icon + gap + userW;
    let x = (VIEW.WIDTH - total) / 2;

    Painter.text(ctx, label, x, y, { size: 13, color: PALETTE.TEXT_DIM, align: "left", baseline: "middle" });
    x += lblW + lblGap;

    const linkX = x;
    const color = this._ghHover ? PALETTE.ACCENT : PALETTE.TEXT;
    this._drawGithubIcon(ctx, x, y - icon / 2, icon, color);
    x += icon + gap;
    Painter.text(ctx, GITHUB_USER, x, y, { size: 13, color, align: "left", baseline: "middle" });

    if (this._ghHover) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y + 9, userW, 1);
    }

    this._ghRect = { x: linkX, y: y - 11, w: icon + gap + userW, h: 22 };
  }

  /** Logo oficial do GitHub (path SVG 24x24) via Path2D. */
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
