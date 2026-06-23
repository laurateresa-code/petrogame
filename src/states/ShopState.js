/* =========================================================================
   ShopState.js
   LOJA. Acessada pelo menu inicial. Permite gastar o dinheiro acumulado em:
     - Brocas    : aumentam a velocidade de perfuração;
     - Cenários  : trocam o tema visual do jogo;
     - Detector  : item mais caro, revela as bombas no mapa.

   Compras alteram o perfil persistente (game.profile) e salvam na hora.
   Itens já comprados podem ser "equipados" (brocas/cenários). Clique nos
   cartões para comprar/equipar; ESC ou VOLTAR retorna ao menu.
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW } from "../config/Constants.js";
import { Painter, pointInRect } from "../ui/Painter.js";
import { DRILLS, SCENARIOS } from "../config/Shop.js";

export class ShopState extends State {
  enter(params = {}) {
    // De onde a loja foi aberta (menu inicial ou jogo pausado).
    this._from = params.from ?? STATES.MENU;
    this._msg = "";
    this._msgTimer = 0;
    this._buildCards();
  }

  /** Volta para quem abriu a loja (retomando a partida, se veio do jogo). */
  _back() {
    if (this._from === STATES.PLAY) this.game.states.change(STATES.PLAY, { resume: true });
    else this.game.states.change(STATES.MENU);
  }

  /** Monta os cartões clicáveis (posição + dados) das três seções. */
  _buildCards() {
    this._cards = [];

    const cardW = 286, cardH = 92, gap = 16;
    const rowX = (i) => 24 + i * (cardW + gap);

    // Brocas.
    DRILLS.forEach((d, i) => {
      this._cards.push({ kind: "drill", data: d, rect: { x: rowX(i), y: 118, w: cardW, h: cardH } });
    });
    // Cenários.
    SCENARIOS.forEach((s, i) => {
      this._cards.push({ kind: "scenario", data: s, rect: { x: rowX(i), y: 268, w: cardW, h: cardH } });
    });

    // Botão VOLTAR.
    this._backRect = { x: VIEW.WIDTH - 150, y: 28, w: 122, h: 40 };
  }

  // ---- Estado de cada item (para texto/cor do cartão) -------------------
  _state(card) {
    const p = this.game.profile;
    if (card.kind === "drill") {
      if (p.drill === card.data.id) return "equipped";
      if (p.ownedDrills.includes(card.data.id)) return "owned";
    } else if (card.kind === "scenario") {
      if (p.scenario === card.data.id) return "equipped";
      if (p.ownedScenarios.includes(card.data.id)) return "owned";
    }
    return p.money >= card.data.price ? "buyable" : "locked";
  }

  // ---- Ações ------------------------------------------------------------
  _activate(card) {
    const p = this.game.profile;
    const st = this._state(card);

    if (st === "equipped") return;

    if (st === "owned") {
      // Já tem: apenas equipa.
      if (card.kind === "drill") p.drill = card.data.id;
      else if (card.kind === "scenario") p.scenario = card.data.id;
      this.game.saveProfile();
      this.game.audio.sfx("click");
      this._flash("EQUIPADO");
      return;
    }

    if (st === "locked") {
      this.game.audio.sfx("click");
      this._flash("DINHEIRO INSUFICIENTE");
      return;
    }

    // buyable: compra e equipa.
    p.money -= card.data.price;
    if (card.kind === "drill") {
      p.ownedDrills.push(card.data.id);
      p.drill = card.data.id;
    } else if (card.kind === "scenario") {
      p.ownedScenarios.push(card.data.id);
      p.scenario = card.data.id;
    }
    this.game.saveProfile();
    this.game.audio.sfx("buy");
    this._flash("COMPRADO!");
  }

  _flash(msg) {
    this._msg = msg;
    this._msgTimer = 1.6;
  }

  // ---- Ciclo ------------------------------------------------------------
  update(dt) {
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0) this._msg = "";
    }

    if (this.game.input.wasPressed("Escape")) {
      this._back();
      return;
    }

    const { x: mx, y: my } = this.game.input.mouse;
    this._hover = null;
    for (const card of this._cards) {
      if (pointInRect(mx, my, card.rect)) {
        this._hover = card;
        if (this.game.input.mouse.pressed) this._activate(card);
      }
    }
    if (pointInRect(mx, my, this._backRect) && this.game.input.mouse.pressed) {
      this._back();
    }
  }

  render(ctx) {
    // Fundo.
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
    g.addColorStop(0, "#143a52");
    g.addColorStop(1, "#0a0704");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    Painter.text(ctx, "LOJA", 24, 50, { size: 34, color: PALETTE.ACCENT, weight: "bold", baseline: "middle", shadow: true });
    Painter.text(ctx, `$ ${this.game.profile.money}`, VIEW.WIDTH / 2, 50, {
      size: 26, color: PALETTE.OK, align: "center", baseline: "middle", weight: "bold",
    });

    // Botão VOLTAR.
    const r = this._backRect;
    Painter.button(ctx, "VOLTAR", r.x, r.y, r.w, r.h, { hovered: false, size: 16 });

    // Cabeçalhos de seção.
    Painter.text(ctx, "BROCAS — velocidade de perfuração", 24, 104, { size: 15, color: PALETTE.TEXT, weight: "bold" });
    Painter.text(ctx, "CENÁRIOS — tema visual", 24, 254, { size: 15, color: PALETTE.TEXT, weight: "bold" });

    for (const card of this._cards) this._renderCard(ctx, card);

    if (this._msg) {
      Painter.text(ctx, this._msg, VIEW.WIDTH / 2, VIEW.HEIGHT - 20, {
        size: 18, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold", shadow: true,
      });
    }
  }

  _renderCard(ctx, card) {
    const { x, y, w, h } = card.rect;
    const st = this._state(card);
    const hovered = this._hover === card;

    // Cor de fundo por estado.
    let fill = PALETTE.PANEL_LIGHT, stroke = PALETTE.ACCENT_DARK;
    if (st === "equipped") { fill = "#1e4d2b"; stroke = PALETTE.OK; }
    else if (st === "locked") { fill = "#2a2620"; stroke = "#4a3a2a"; }
    if (hovered && st !== "equipped" && st !== "locked") stroke = PALETTE.ACCENT;

    Painter.panel(ctx, x, y, w, h, { fill, stroke, radius: 10 });

    // Amostra de cor do cenário.
    if (card.kind === "scenario") {
      const sw = card.data.palette;
      ctx.fillStyle = sw.skyBottom;
      Painter.roundRect(ctx, x + 12, y + 12, 40, 40, 6); ctx.fill();
      ctx.fillStyle = sw.bg;
      ctx.fillRect(x + 12, y + 32, 40, 20);
    }

    const tx = card.kind === "scenario" ? x + 64 : x + 16;
    Painter.text(ctx, card.data.name, tx, y + 26, { size: 17, color: PALETTE.TEXT, weight: "bold", baseline: "middle" });
    Painter.text(ctx, card.data.desc, tx, y + 47, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });

    // Linha de status (preço / estado).
    let label, color;
    if (st === "equipped") { label = "✔ EQUIPADO"; color = PALETTE.OK; }
    else if (st === "owned") { label = "COMPRADO — clique p/ equipar"; color = PALETTE.ACCENT; }
    else if (st === "buyable") { label = `COMPRAR  $${card.data.price}`; color = PALETTE.ACCENT; }
    else { label = `$${card.data.price} — sem dinheiro`; color = PALETTE.DANGER; }

    Painter.text(ctx, label, tx, y + h - 16, { size: 13, color, weight: "bold", baseline: "middle" });
  }
}
