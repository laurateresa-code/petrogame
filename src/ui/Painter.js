/* =========================================================================
   Painter.js
   Primitivas de desenho reutilizáveis para a UI (texto, painéis, botões,
   barras). Centraliza o estilo visual para manter consistência e evitar
   repetição de código de canvas pelos estados/HUD.
   ========================================================================= */

import { PALETTE } from "../config/Constants.js";

export const Painter = {
  /** Texto com alinhamento e fonte configuráveis. */
  text(ctx, str, x, y, {
    size = 16,
    color = PALETTE.TEXT,
    align = "left",
    baseline = "alphabetic",
    weight = "normal",
    font = "Segoe UI, sans-serif",
    shadow = false,
  } = {}) {
    ctx.save();
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (shadow) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(str, x + 2, y + 2);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  },

  /** Retângulo com cantos arredondados. */
  roundRect(ctx, x, y, w, h, r = 8) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  /** Painel de fundo (caixa de UI). */
  panel(ctx, x, y, w, h, { fill = PALETTE.PANEL, stroke = null, radius = 10, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    this.roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.restore();
  },

  /**
   * Desenha um botão e retorna sua área (para detecção de clique).
   * @returns {{x,y,w,h}} retângulo do botão
   */
  button(ctx, label, x, y, w, h, { hovered = false, size = 20 } = {}) {
    const fill = hovered ? PALETTE.ACCENT : PALETTE.PANEL_LIGHT;
    const txt = hovered ? PALETTE.PANEL : PALETTE.TEXT;
    this.panel(ctx, x, y, w, h, { fill, stroke: PALETTE.ACCENT_DARK, radius: 8 });
    this.text(ctx, label, x + w / 2, y + h / 2, {
      size, color: txt, align: "center", baseline: "middle", weight: "bold",
    });
    return { x, y, w, h };
  },

  /** Barra de progresso/atributo (combustível, integridade, etc.). */
  bar(ctx, x, y, w, h, ratio, { fill = PALETTE.OK, bg = "#000", radius = 4 } = {}) {
    ratio = Math.max(0, Math.min(1, ratio));
    this.panel(ctx, x, y, w, h, { fill: bg, radius });
    if (ratio > 0) {
      this.roundRect(ctx, x, y, Math.max(radius * 2, w * ratio), h, radius);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  },
};

/** Utilitário: o ponto (px,py) está dentro do retângulo? */
export const pointInRect = (px, py, r) =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
