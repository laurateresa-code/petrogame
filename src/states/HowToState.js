/* =========================================================================
   HowToState.js
   Tela "COMO JOGAR". Explica o passo a passo e mostra a legenda dos blocos
   (com as MESMAS cores usadas no jogo, lidas de BlockTypes). Acessada pelo
   botão "COMO JOGAR" do menu inicial. ESC ou VOLTAR retorna ao menu.
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW } from "../config/Constants.js";
import { Painter, pointInRect } from "../ui/Painter.js";
import { BLOCK, BLOCK_DEFS } from "../world/BlockTypes.js";

const STEPS = [
  "Cave para baixo (↓) e para os lados (← →) com a sonda.",
  "Suba pelos túneis com o JATO (↑ / Espaço) — gasta combustível.",
  "Petróleo e joias viram dinheiro na hora em que você os cava.",
  "Volte à BASE (superfície) para reabastecer de graça.",
  "Não fique sem combustível lá no fundo — é fim de jogo!",
  "Desvie das BOMBAS (marcadas com “!”): encostou, explodiu.",
  "Gaste o dinheiro na LOJA: brocas mais rápidas e cenários.",
  "Menu lateral: PAUSE, RESTART e LOJA (atalhos ESC, R, L).",
];

const LEGEND = [
  { id: BLOCK.DIRT, note: "Terra — fácil de cavar, sem valor." },
  { id: BLOCK.ROCK, note: "Rocha — mais dura de perfurar." },
  { id: BLOCK.HARDROCK, note: "Granito — muito dura (camadas fundas)." },
  { id: BLOCK.OIL, note: "Petróleo — vale $60 ao coletar." },
  { id: BLOCK.GEM, note: "Esmeralda — vale $180 (rara, no fundo)." },
  { id: BLOCK.FUEL, note: "Gás — repõe combustível na hora." },
  { id: BLOCK.BOMB, note: "Bomba — explode se a broca encostar!" },
  { id: BLOCK.BEDROCK, note: "Base — indestrutível, limite do mundo." },
];

export class HowToState extends State {
  enter() {
    this._backRect = { x: VIEW.WIDTH - 150, y: 28, w: 122, h: 40 };
  }

  update() {
    const input = this.game.input;
    if (input.wasPressed("Escape")) {
      this.game.audio.sfx("click");
      this.game.states.change(STATES.MENU);
      return;
    }
    const { x: mx, y: my } = input.mouse;
    this._backHover = pointInRect(mx, my, this._backRect);
    if (this._backHover && input.mouse.pressed) {
      this.game.audio.sfx("click");
      this.game.states.change(STATES.MENU);
    }
  }

  render(ctx) {
    // Fundo.
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
    g.addColorStop(0, "#143a52");
    g.addColorStop(1, "#0a0704");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    Painter.text(ctx, "COMO JOGAR", VIEW.WIDTH / 2, 46, {
      size: 32, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold", shadow: true,
    });

    const r = this._backRect;
    Painter.button(ctx, "VOLTAR", r.x, r.y, r.w, r.h, { hovered: this._backHover, size: 16 });

    // --- Coluna esquerda: passo a passo ---
    Painter.text(ctx, "PASSO A PASSO", 40, 96, { size: 16, color: PALETTE.TEXT, weight: "bold", baseline: "middle" });
    STEPS.forEach((s, i) => {
      const y = 130 + i * 30;
      Painter.text(ctx, `${i + 1}.`, 44, y, { size: 14, color: PALETTE.ACCENT, weight: "bold", baseline: "middle" });
      Painter.text(ctx, s, 66, y, { size: 14, color: PALETTE.TEXT, baseline: "middle" });
    });

    // --- Coluna direita: legenda dos blocos ---
    const lx = 560;
    Painter.text(ctx, "BLOCOS", lx, 96, { size: 16, color: PALETTE.TEXT, weight: "bold", baseline: "middle" });
    LEGEND.forEach((item, i) => {
      const y = 124 + i * 34;
      this._swatch(ctx, lx, y - 12, 24, item.id);
      Painter.text(ctx, item.note, lx + 36, y, { size: 13, color: PALETTE.TEXT, baseline: "middle" });
    });

    Painter.text(ctx, "ESC ou VOLTAR para o menu", VIEW.WIDTH / 2, VIEW.HEIGHT - 20, {
      size: 13, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });
  }

  /** Desenha um bloco da legenda igual ao do jogo (cor base + brilho/marcador). */
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
      ctx.fillStyle = "rgba(224,75,75,0.9)";
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      Painter.text(ctx, "!", x + s / 2, y + s / 2 + 1, {
        size: 13, color: "#fff", align: "center", baseline: "middle", weight: "bold",
      });
    }

    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }
}
