/* =========================================================================
   ShopState.js
   LOJA com duas abas:
     - UPGRADES  : compra com DINHEIRO — brocas, cenários e tanques;
     - REFINARIA : fabrica MATERIAIS gastando o petróleo (barris) e as gemas
                   coletados; cada material rende dinheiro e entra na coleção.

   Compras/fabricações alteram o perfil persistente (game.profile) e salvam na
   hora. Clique nos cartões; ESC ou VOLTAR retorna a quem abriu a loja.
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW } from "../config/Constants.js";
import { Painter, pointInRect } from "../ui/Painter.js";
import { DRILLS, SCENARIOS, TANKS, MATERIALS, costText } from "../config/Shop.js";

export class ShopState extends State {
  enter(params = {}) {
    this._from = params.from ?? STATES.MENU;
    this._msg = "";
    this._msgTimer = 0;
    this._tab = "upgrades";
    this._hover = null;
    this._tabHover = null;

    this._backRect = { x: VIEW.WIDTH - 148, y: 22, w: 122, h: 36 };
    this._tabs = [
      { id: "upgrades", label: "UPGRADES", rect: { x: 24, y: 70, w: 184, h: 32 } },
      { id: "refinaria", label: "REFINARIA", rect: { x: 220, y: 70, w: 184, h: 32 } },
    ];
    this._buildCards();
  }

  /** Volta para quem abriu a loja (retomando a partida, se veio do jogo). */
  _back() {
    if (this._from === STATES.PLAY) this.game.states.change(STATES.PLAY, { resume: true });
    else this.game.states.change(STATES.MENU);
  }

  /** Monta os cartões da aba ativa. */
  _buildCards() {
    this._cards = [];
    const cw = 286, gap = 16, rowX = (i) => 24 + i * (cw + gap);

    if (this._tab === "upgrades") {
      DRILLS.forEach((d, i) => this._cards.push({ kind: "drill", data: d, rect: { x: rowX(i), y: 134, w: cw, h: 84 } }));
      SCENARIOS.forEach((s, i) => this._cards.push({ kind: "scenario", data: s, rect: { x: rowX(i), y: 254, w: cw, h: 84 } }));
      TANKS.forEach((t, i) => this._cards.push({ kind: "tank", data: t, rect: { x: rowX(i), y: 374, w: cw, h: 84 } }));
    } else {
      MATERIALS.forEach((m, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        this._cards.push({ kind: "material", data: m, rect: { x: 24 + col * (cw + gap), y: 140 + row * 136, w: cw, h: 120 } });
      });
    }
  }

  // ---- Estado de cada cartão -------------------------------------------
  _state(card) {
    const p = this.game.profile;
    if (card.kind === "drill") {
      if (p.drill === card.data.id) return "equipped";
      if (p.ownedDrills.includes(card.data.id)) return "owned";
    } else if (card.kind === "scenario") {
      if (p.scenario === card.data.id) return "equipped";
      if (p.ownedScenarios.includes(card.data.id)) return "owned";
    } else if (card.kind === "tank") {
      if (p.fuelTank === card.data.id) return "equipped";
      if (p.ownedTanks.includes(card.data.id)) return "owned";
    } else if (card.kind === "material") {
      const c = card.data.cost;
      return (p.barris >= (c.barris || 0) && p.gemas >= (c.gemas || 0)) ? "craftable" : "locked";
    }
    return p.money >= card.data.price ? "buyable" : "locked";
  }

  // ---- Ações ------------------------------------------------------------
  _activate(card) {
    const p = this.game.profile;
    const st = this._state(card);

    // REFINARIA: fabricar consome barris/gemas e rende dinheiro.
    if (card.kind === "material") {
      if (st === "craftable") {
        const c = card.data.cost;
        p.barris -= c.barris || 0;
        p.gemas -= c.gemas || 0;
        p.money += card.data.reward;
        p.crafted[card.data.id] = (p.crafted[card.data.id] || 0) + 1;
        this.game.saveProfile();
        this.game.audio.sfx("buy");
        this._flash(`FABRICOU ${card.data.name.toUpperCase()}! +$${card.data.reward}`);
      } else {
        this.game.audio.sfx("click");
        this._flash("FALTA PETRÓLEO / GEMAS");
      }
      return;
    }

    // UPGRADES: comprar/equipar com dinheiro.
    if (st === "equipped") return;

    if (st === "owned") {
      this._equip(card);
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
    if (card.kind === "drill") p.ownedDrills.push(card.data.id);
    else if (card.kind === "scenario") p.ownedScenarios.push(card.data.id);
    else if (card.kind === "tank") p.ownedTanks.push(card.data.id);
    this._equip(card);
    this.game.saveProfile();
    this.game.audio.sfx("buy");
    this._flash("COMPRADO!");
  }

  _equip(card) {
    const p = this.game.profile;
    if (card.kind === "drill") p.drill = card.data.id;
    else if (card.kind === "scenario") p.scenario = card.data.id;
    else if (card.kind === "tank") p.fuelTank = card.data.id;
  }

  _flash(msg) {
    this._msg = msg;
    this._msgTimer = 1.8;
  }

  // ---- Ciclo ------------------------------------------------------------
  update(dt) {
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0) this._msg = "";
    }

    const input = this.game.input;
    if (input.wasPressed("Escape")) { this._back(); return; }

    const { x: mx, y: my } = input.mouse;
    const pressed = input.mouse.pressed;

    // Abas.
    this._tabHover = null;
    for (const t of this._tabs) {
      if (pointInRect(mx, my, t.rect)) {
        this._tabHover = t.id;
        if (pressed && this._tab !== t.id) {
          this._tab = t.id;
          this.game.audio.sfx("click");
          this._buildCards();
        }
      }
    }

    // Cartões.
    this._hover = null;
    for (const card of this._cards) {
      if (pointInRect(mx, my, card.rect)) {
        this._hover = card;
        if (pressed) this._activate(card);
      }
    }

    this._backHover = pointInRect(mx, my, this._backRect);
    if (this._backHover && pressed) this._back();

    this.game.canvas.el.style.cursor =
      (this._hover || this._tabHover || this._backHover) ? "pointer" : "default";
  }

  exit() {
    this.game.canvas.el.style.cursor = "default";
  }

  render(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.HEIGHT);
    g.addColorStop(0, "#143a52");
    g.addColorStop(1, "#0a0704");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    Painter.text(ctx, "LOJA", 24, 40, { size: 30, color: PALETTE.ACCENT, weight: "bold", baseline: "middle", shadow: true });

    // Recursos do jogador.
    const p = this.game.profile;
    Painter.text(ctx, `$ ${p.money}    •    ${p.barris} barris    •    ${p.gemas} gemas`, VIEW.WIDTH / 2, 40, {
      size: 17, color: PALETTE.OK, align: "center", baseline: "middle", weight: "bold",
    });

    Painter.button(ctx, "VOLTAR", this._backRect.x, this._backRect.y, this._backRect.w, this._backRect.h, {
      hovered: this._backHover, size: 15,
    });

    // Abas.
    for (const t of this._tabs) {
      const active = this._tab === t.id || this._tabHover === t.id;
      Painter.button(ctx, t.label, t.rect.x, t.rect.y, t.rect.w, t.rect.h, { hovered: active, size: 16 });
    }

    // Cabeçalhos + cartões.
    if (this._tab === "upgrades") {
      Painter.text(ctx, "BROCAS — velocidade de perfuração", 24, 122, { size: 14, color: PALETTE.TEXT, weight: "bold" });
      Painter.text(ctx, "CENÁRIOS — tema visual", 24, 242, { size: 14, color: PALETTE.TEXT, weight: "bold" });
      Painter.text(ctx, "TANQUES — capacidade de combustível", 24, 362, { size: 14, color: PALETTE.TEXT, weight: "bold" });
    } else {
      Painter.text(ctx, "REFINARIA — gaste petróleo para fabricar e lucrar", 24, 122, { size: 14, color: PALETTE.TEXT, weight: "bold" });
    }

    for (const card of this._cards) {
      if (card.kind === "material") this._renderMaterialCard(ctx, card);
      else this._renderUpgradeCard(ctx, card);
    }

    if (this._msg) {
      Painter.text(ctx, this._msg, VIEW.WIDTH / 2, VIEW.HEIGHT - 18, {
        size: 18, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold", shadow: true,
      });
    }
  }

  // ---- Cartão de upgrade (broca / cenário / tanque) --------------------
  _renderUpgradeCard(ctx, card) {
    const { x, y, w, h } = card.rect;
    const st = this._state(card);
    const hovered = this._hover === card;

    let fill = PALETTE.PANEL_LIGHT, stroke = PALETTE.ACCENT_DARK;
    if (st === "equipped") { fill = "#1e4d2b"; stroke = PALETTE.OK; }
    else if (st === "locked") { fill = "#2a2620"; stroke = "#4a3a2a"; }
    if (hovered && st !== "equipped" && st !== "locked") stroke = PALETTE.ACCENT;
    Painter.panel(ctx, x, y, w, h, { fill, stroke, radius: 10 });

    // Amostra de cor do cenário.
    if (card.kind === "scenario") {
      const sw = card.data.palette;
      ctx.fillStyle = sw.skyBottom;
      Painter.roundRect(ctx, x + 12, y + 12, 38, 38, 6); ctx.fill();
      ctx.fillStyle = sw.bg;
      ctx.fillRect(x + 12, y + 31, 38, 19);
    }

    const tx = card.kind === "scenario" ? x + 62 : x + 16;
    Painter.text(ctx, card.data.name, tx, y + 24, { size: 16, color: PALETTE.TEXT, weight: "bold", baseline: "middle" });
    Painter.text(ctx, card.data.desc, tx, y + 44, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });

    let label, color;
    if (st === "equipped") { label = "✔ EQUIPADO"; color = PALETTE.OK; }
    else if (st === "owned") { label = "COMPRADO — clique p/ equipar"; color = PALETTE.ACCENT; }
    else if (st === "buyable") { label = `COMPRAR  $${card.data.price}`; color = PALETTE.ACCENT; }
    else { label = `$${card.data.price} — sem dinheiro`; color = PALETTE.DANGER; }
    Painter.text(ctx, label, tx, y + h - 16, { size: 13, color, weight: "bold", baseline: "middle" });
  }

  // ---- Cartão de material (refinaria) ----------------------------------
  _renderMaterialCard(ctx, card) {
    const { x, y, w, h } = card.rect;
    const st = this._state(card);
    const hovered = this._hover === card;
    const feitos = this.game.profile.crafted[card.data.id] || 0;

    let fill = PALETTE.PANEL_LIGHT, stroke = PALETTE.ACCENT_DARK;
    if (st === "locked") { fill = "#2a2620"; stroke = "#4a3a2a"; }
    if (hovered && st === "craftable") stroke = PALETTE.ACCENT;
    Painter.panel(ctx, x, y, w, h, { fill, stroke, radius: 10 });

    Painter.text(ctx, card.data.name, x + 16, y + 24, { size: 17, color: PALETTE.TEXT, weight: "bold", baseline: "middle" });
    if (feitos > 0) {
      Painter.text(ctx, `feitos: ${feitos}`, x + w - 14, y + 24, { size: 12, color: PALETTE.OK, align: "right", baseline: "middle" });
    }
    Painter.text(ctx, card.data.desc, x + 16, y + 44, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });
    Painter.text(ctx, `Custo: ${costText(card.data.cost)}`, x + 16, y + 68, { size: 13, color: PALETTE.TEXT, baseline: "middle" });
    Painter.text(ctx, `Rende: +$${card.data.reward}`, x + 16, y + 88, { size: 13, color: PALETTE.OK, weight: "bold", baseline: "middle" });

    const label = st === "craftable" ? "▶ FABRICAR" : "falta matéria-prima";
    const color = st === "craftable" ? PALETTE.ACCENT : PALETTE.DANGER;
    Painter.text(ctx, label, x + 16, y + h - 16, { size: 13, color, weight: "bold", baseline: "middle" });
  }
}
