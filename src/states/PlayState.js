/* =========================================================================
   PlayState.js
   Estado de JOGO. Monta o mundo (subsolo), a sonda do jogador e o HUD, e
   coordena câmera, perfuração e economia. Aplica os itens comprados na loja
   (broca equipada, cenário) e ganha dinheiro coletando petróleo/esmeraldas —
   sem ficar sem combustível lá no fundo (ou pisar numa bomba).

   Controles:
     ← →  (A/D)        mover / perfurar para os lados
     ↓    (S)          perfurar para baixo
     ↑ / Espaço (W)    jato: subir por túneis abertos
     ESC               menu     •  R  reiniciar (no fim de jogo)
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW, TILE } from "../config/Constants.js";
import { Painter, pointInRect } from "../ui/Painter.js";
import { World } from "../world/World.js";
import { Player } from "../entities/Player.js";
import { BLOCK, blockDef } from "../world/BlockTypes.js";
import { findDrill, findScenario, findTank } from "../config/Shop.js";

export class PlayState extends State {
  enter(params = {}) {
    this._buildMenuButtons();

    // Retomada após visitar a LOJA: mantém a partida e reaplica os upgrades.
    if (params.resume && this.world) {
      this.player.drillSpeed = findDrill(this.game.profile.drill).drillSpeed;
      this.player.maxFuel = findTank(this.game.profile.fuelTank).maxFuel;
      this._pal = findScenario(this.game.profile.scenario).palette;
      this.game.camera.setBounds(this.world.bounds);
      this._paused = true;
      return;
    }

    this._newRun();
  }

  /**
   * Botão "hambúrguer" (☰) no canto e os três ícones centrais (recomeçar,
   * play e loja) que aparecem quando o jogo está pausado.
   */
  _buildMenuButtons() {
    this._hamburger = { x: 14, y: 14, w: 42, h: 42 };

    const r = 40, cy = VIEW.HEIGHT / 2, dx = 132, cx = VIEW.WIDTH / 2;
    this._iconButtons = [
      { id: "restart", cx: cx - dx, cy, r, label: "RECOMEÇAR" },
      { id: "play", cx, cy, r, label: "CONTINUAR" },
      { id: "shop", cx: cx + dx, cy, r, label: "LOJA" },
    ];
    this._menuHover = null;
  }

  _newRun() {
    this.world = new World({ cols: 30, rows: 140, surfaceRows: 3 }).generate();

    // Itens equipados (loja): broca = velocidade; tanque = combustível; cenário = paleta.
    const drill = findDrill(this.game.profile.drill);
    const tank = findTank(this.game.profile.fuelTank);
    this._pal = findScenario(this.game.profile.scenario).palette;

    const col = this.world.randomSurfaceColumn();
    const row = this.world.surfaceRows - 1; // sobre o solo
    this.player = new Player(this.world, col, row, {
      profile: this.game.profile,
      drillSpeed: drill.drillSpeed,
      maxFuel: tank.maxFuel,
    });

    this.game.camera.setBounds(this.world.bounds);
    // Centraliza a câmera imediatamente (sem deslize no primeiro frame).
    this.game.camera.x = this.player.x - VIEW.WIDTH / 2;
    this.game.camera.y = this.player.y - VIEW.HEIGHT / 2;
    this.game.camera._clampToBounds();

    this._over = null;      // null | "win" | "lose"
    this._explosion = null; // efeito ativo de explosão (bomba)
    this._paused = false;
    this._time = 0;
  }

  update(dt) {
    this._time += dt;
    const input = this.game.input;

    // A explosão roda mesmo após a morte (para ser vista antes do overlay).
    if (this._explosion) this._explosion.t += dt;

    // Fim de jogo: R reinicia, ESC volta ao menu.
    if (this._over) {
      if (input.wasPressed("KeyR")) this._newRun();
      if (input.wasPressed("Escape")) this.game.states.change(STATES.MENU);
      return;
    }

    // --- Menu lateral (sempre ativo): hover + clique nos 3 botões ---
    this._handleMenuClicks();

    // --- Atalhos do menu (funcionam pausado ou em jogo) ---
    if (input.wasPressed("KeyR")) { this._newRun(); return; }
    if (input.wasPressed("KeyL")) { this._openShop(); return; }
    if (input.wasPressed("Escape") || input.wasPressed("KeyP")) this._togglePause();
    if (this._paused && input.wasPressed("Enter")) this._paused = false;

    // --- Pausado: congela o jogo (o menu lateral continua na tela) ---
    if (this._paused) return;

    this.player.update(dt, this.game.input);

    const audio = this.game.audio;
    if (this.player.justSold > 0) {
      this.game.camera.shake(6);
      this.game.saveProfile(); // dinheiro acumula entre partidas
      audio.sfx("coin");
    } else if (this.player.justCollected) {
      this.game.camera.shake(3);
    }
    if (this.player.justFuel) audio.sfx("fuel");
    if (this.player.justDug) audio.sfx("dig");

    // Câmera segue a sonda (ou a explosão).
    this.game.camera.follow(this.player.x, this.player.y, dt);

    // Derrota.
    if (this.player.dead) {
      if (this.player.boom) {
        // Dispara a explosão uma vez e segura o overlay até ela tocar.
        if (!this._explosion) {
          this._explosion = this._spawnExplosion(this.player.boomX, this.player.boomY);
          this.game.camera.shake(26);
          audio.sfx("explosion");
        }
        if (this._explosion.t >= this._explosion.dur) this._over = "lose";
      } else {
        if (!this._over) audio.sfx("death");
        this._over = "lose";
      }
    }
  }

  /** Cria um conjunto de partículas para a explosão da bomba. */
  _spawnExplosion(x, y) {
    const parts = [];
    for (let i = 0; i < 28; i++) {
      parts.push({
        a: Math.random() * Math.PI * 2,
        spd: 60 + Math.random() * 230,
        size: 3 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.5,
      });
    }
    return { x, y, t: 0, dur: 0.95, parts };
  }

  // ---- Menu lateral / pause --------------------------------------------
  /** Abre a LOJA sem perder a partida (volta para cá pausado). */
  _openShop() {
    this._paused = true;
    this.game.states.change(STATES.SHOP, { from: STATES.PLAY });
  }

  _togglePause() {
    this._paused = !this._paused;
  }

  /** Hover/clique no hambúrguer e nos ícones centrais (estes só pausado). */
  _handleMenuClicks() {
    const { x: mx, y: my } = this.game.input.mouse;
    const pressed = this.game.input.mouse.pressed;
    this._menuHover = null;

    // Hambúrguer: abre/fecha o pause.
    if (pointInRect(mx, my, this._hamburger)) {
      this._menuHover = "menu";
      if (pressed) { this.game.audio.sfx("click"); this._togglePause(); }
      return;
    }

    // Ícones centrais só respondem com o jogo pausado.
    if (this._paused) {
      for (const b of this._iconButtons) {
        if (Math.hypot(mx - b.cx, my - b.cy) <= b.r) {
          this._menuHover = b.id;
          if (pressed) this._doMenuAction(b.id);
        }
      }
    }
  }

  _doMenuAction(id) {
    this.game.audio.sfx("click");
    if (id === "play") this._paused = false;     // play = continuar
    else if (id === "restart") this._newRun();
    else if (id === "shop") this._openShop();
  }

  render(ctx) {
    const cam = this.game.camera;
    cam.apply(ctx);
    this._renderWorld(ctx, cam);
    // Durante a explosão a sonda some (foi destruída).
    if (!this.player.boom) this.player.render(ctx);
    if (this._explosion) this._renderExplosion(ctx, this._explosion);
    cam.reset(ctx);

    this._renderHud(ctx);
    this._renderMenu(ctx);
    if (this._over) this._renderOverlay(ctx);
  }

  /** Hambúrguer (sempre) e, quando pausado, os três ícones centrais. */
  _renderMenu(ctx) {
    if (this._paused) {
      // Escurece tudo e mostra os três ícones centralizados.
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      Painter.text(ctx, "PAUSADO", VIEW.WIDTH / 2, VIEW.HEIGHT / 2 - 92, {
        size: 26, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold", shadow: true,
      });
      for (const b of this._iconButtons) this._renderIconButton(ctx, b);
      Painter.text(ctx, "ESC retoma  •  M = mudo", VIEW.WIDTH / 2, VIEW.HEIGHT / 2 + 96, {
        size: 13, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
      });
    }

    this._renderHamburger(ctx);
  }

  _renderHamburger(ctx) {
    const h = this._hamburger;
    const hov = this._menuHover === "menu";
    Painter.panel(ctx, h.x, h.y, h.w, h.h, {
      fill: hov ? PALETTE.ACCENT : "rgba(0,0,0,0.55)", stroke: PALETTE.ACCENT_DARK, radius: 8,
    });
    // Três linhas empilhadas.
    const color = hov ? PALETTE.PANEL : PALETTE.TEXT;
    const lw = h.w * 0.5, lh = 3, lx = h.x + (h.w - lw) / 2;
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(lx, h.y + h.h * 0.3 + i * (h.h * 0.2), lw, lh);
    }
  }

  _renderIconButton(ctx, b) {
    const hov = this._menuHover === b.id;
    ctx.beginPath();
    ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
    ctx.fillStyle = hov ? PALETTE.ACCENT : PALETTE.PANEL_LIGHT;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = hov ? PALETTE.ACCENT : PALETTE.ACCENT_DARK;
    ctx.stroke();

    const ic = hov ? PALETTE.PANEL : PALETTE.TEXT;
    const s = b.r * 0.5;
    if (b.id === "restart") this._drawRestartIcon(ctx, b.cx, b.cy, s, ic);
    else if (b.id === "play") this._drawPlayIcon(ctx, b.cx, b.cy, s, ic);
    else if (b.id === "shop") this._drawShopIcon(ctx, b.cx, b.cy, s, ic);

    Painter.text(ctx, b.label, b.cx, b.cy + b.r + 18, {
      size: 12, color: PALETTE.TEXT, align: "center", baseline: "middle", weight: "bold",
    });
  }

  /** Ícone de play: triângulo apontando para a direita. */
  _drawPlayIcon(ctx, cx, cy, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.55, cy - s * 0.75);
    ctx.lineTo(cx - s * 0.55, cy + s * 0.75);
    ctx.lineTo(cx + s * 0.8, cy);
    ctx.closePath();
    ctx.fill();
  }

  /** Ícone de recomeçar: seta circular. */
  _drawRestartIcon(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2.5, s * 0.32);
    ctx.lineCap = "round";
    const a0 = -Math.PI * 0.32, a1 = Math.PI * 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, s, a0, a1);
    ctx.stroke();
    // Ponta de seta no início do arco.
    const hx = cx + Math.cos(a0) * s, hy = cy + Math.sin(a0) * s;
    const hd = s * 0.6;
    ctx.beginPath();
    ctx.moveTo(hx + hd * 0.15, hy - hd * 0.55);
    ctx.lineTo(hx + hd * 0.7, hy + hd * 0.15);
    ctx.lineTo(hx - hd * 0.25, hy + hd * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Ícone da loja: sacola de compras. */
  _drawShopIcon(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, s * 0.18);
    const w = s * 1.4, h = s * 1.5;
    const x = cx - w / 2, y = cy - h / 2 + s * 0.25;
    // Alça (semicírculo no topo).
    ctx.beginPath();
    ctx.arc(cx, y, s * 0.45, Math.PI, 2 * Math.PI);
    ctx.stroke();
    // Corpo da sacola.
    Painter.roundRect(ctx, x, y, w, h, s * 0.2);
    ctx.fill();
    ctx.restore();
  }

  /** Desenha a explosão (clarão + anel de choque + estilhaços) no mundo. */
  _renderExplosion(ctx, ex) {
    const p = Math.min(1, ex.t / ex.dur);
    ctx.save();

    // Clarão central.
    const flashR = 12 + p * 75;
    ctx.globalAlpha = Math.max(0, 1 - p);
    const g = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, flashR);
    g.addColorStop(0, "#fff3c0");
    g.addColorStop(0.45, "#ff9b2e");
    g.addColorStop(1, "rgba(120,30,10,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, flashR, 0, Math.PI * 2);
    ctx.fill();

    // Anel de choque.
    ctx.globalAlpha = Math.max(0, 0.8 - p);
    ctx.strokeStyle = "#ffd27a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, 16 + p * 95, 0, Math.PI * 2);
    ctx.stroke();

    // Estilhaços.
    for (const part of ex.parts) {
      const lt = Math.min(ex.t, part.life);
      const px = ex.x + Math.cos(part.a) * part.spd * lt;
      const py = ex.y + Math.sin(part.a) * part.spd * lt + 150 * lt * lt; // gravidade leve
      const a = 1 - ex.t / part.life;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = a > 0.5 ? "#ffd27a" : PALETTE.DANGER;
      ctx.fillRect(px - part.size / 2, py - part.size / 2, part.size, part.size);
    }

    ctx.restore();
  }

  // ---- Mundo ------------------------------------------------------------
  _renderWorld(ctx, cam) {
    const w = this.world;
    const t = TILE.SIZE;
    const pal = this._pal; // paleta do cenário equipado

    // Faixa de céu (gradiente) no topo do mundo.
    const sky = ctx.createLinearGradient(0, 0, 0, w.groundY);
    sky.addColorStop(0, pal.skyTop);
    sky.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w.width, w.groundY);

    // Subsolo (fundo escuro — túneis mostram esta cor).
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, w.groundY, w.width, w.height - w.groundY);

    // Base/estação na superfície (na coluna de partida, decorativa).
    this._renderStation(ctx, w);

    // Apenas as células visíveis pela câmera.
    const c0 = Math.max(0, Math.floor(cam.x / t));
    const c1 = Math.min(w.cols - 1, Math.floor((cam.x + cam.width) / t));
    const r0 = Math.max(0, Math.floor(cam.y / t));
    const r1 = Math.min(w.rows - 1, Math.floor((cam.y + cam.height) / t));

    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const id = w.get(col, row);
        if (id === BLOCK.EMPTY) continue;
        const def = blockDef(id);
        const x = col * t, y = row * t;

        ctx.fillStyle = def.color;
        ctx.fillRect(x, y, t, t);

        // Brilho dos recursos para destacá-los.
        if (id === BLOCK.OIL) {
          ctx.fillStyle = "rgba(120,110,160,0.5)";
          ctx.fillRect(x + 8, y + 8, t - 16, t - 16);
        } else if (id === BLOCK.GEM) {
          ctx.fillStyle = "rgba(180,255,220,0.55)";
          ctx.fillRect(x + 9, y + 9, t - 18, t - 18);
        } else if (id === BLOCK.FUEL) {
          ctx.fillStyle = "rgba(255,200,255,0.5)";
          ctx.fillRect(x + 9, y + 9, t - 18, t - 18);
        } else if (id === BLOCK.BOMB) {
          // Bombas são sempre visíveis: marcador vermelho pulsante.
          const pulse = 0.55 + 0.35 * Math.sin(this._time * 6);
          ctx.fillStyle = `rgba(224,75,75,${pulse.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x + t / 2, y + t / 2, t * 0.3, 0, Math.PI * 2);
          ctx.fill();
          Painter.text(ctx, "!", x + t / 2, y + t / 2 + 1, {
            size: 16, color: "#fff", align: "center", baseline: "middle", weight: "bold",
          });
        }

        // Sombreamento sutil nas bordas (leitura de relevo).
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x, y + t - 3, t, 3);
        ctx.fillRect(x + t - 3, y, 3, t);
      }
    }

    // Linha do solo.
    ctx.fillStyle = pal.groundLine;
    ctx.fillRect(0, w.groundY - 3, w.width, 6);
  }

  _renderStation(ctx, w) {
    const t = TILE.SIZE;
    const x = this.player.col * t; // base perto de onde a sonda nasce
    const baseY = w.groundY;
    // Torre de perfuração simples (derrick).
    ctx.strokeStyle = PALETTE.ACCENT_DARK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14, baseY);
    ctx.lineTo(x + t / 2, baseY - 46);
    ctx.lineTo(x + t + 14, baseY);
    ctx.moveTo(x - 4, baseY - 20);
    ctx.lineTo(x + t + 4, baseY - 20);
    ctx.stroke();
    Painter.text(ctx, "BASE", x + t / 2, baseY - 52, {
      size: 11, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold",
    });
  }

  // ---- HUD --------------------------------------------------------------
  _renderHud(ctx) {
    const p = this.player;

    // Painel de combustível + coletados (à direita do botão de menu ☰).
    const hx = this._hamburger.x + this._hamburger.w + 12;
    Painter.panel(ctx, hx, 12, 230, 70, { fill: "rgba(0,0,0,0.55)", radius: 10 });

    Painter.text(ctx, "COMBUSTÍVEL", hx + 12, 30, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });
    const fuelRatio = p.fuel / p.maxFuel;
    const fuelColor = fuelRatio > 0.3 ? PALETTE.OK : PALETTE.DANGER;
    Painter.bar(ctx, hx + 12, 38, 206, 12, fuelRatio, { fill: fuelColor, bg: "#2a2620" });

    const prof = this.game.profile;
    Painter.text(ctx, `petróleo: ${prof.barris} barris   •   gemas: ${prof.gemas}`, hx + 12, 66, {
      size: 12, color: PALETTE.TEXT_DIM, baseline: "middle",
    });

    // Painel superior-direito: dinheiro + profundidade.
    Painter.panel(ctx, VIEW.WIDTH - 222, 12, 210, 70, { fill: "rgba(0,0,0,0.55)", radius: 10 });
    Painter.text(ctx, `$ ${p.money}`, VIEW.WIDTH - 24, 38, {
      size: 24, color: PALETTE.ACCENT, align: "right", baseline: "middle", weight: "bold",
    });
    Painter.text(ctx, `profundidade: ${p.depthMeters} m`, VIEW.WIDTH - 24, 66, {
      size: 12, color: PALETTE.TEXT_DIM, align: "right", baseline: "middle",
    });

    // Mensagem flutuante (vendeu, achou gás, reabasteceu...).
    if (p.flash) {
      Painter.text(ctx, p.flash, VIEW.WIDTH / 2, VIEW.HEIGHT - 40, {
        size: 18, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold", shadow: true,
      });
    }

    // Dica de controles nos primeiros segundos.
    if (this._time < 7) {
      Painter.text(ctx, "↓ perfurar  •  ← → mover/cavar  •  ↑/Espaço jato  •  pegue petróleo 🛢️ e joias 💎  •  BASE reabastece", VIEW.WIDTH / 2, VIEW.HEIGHT - 16, {
        size: 12, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
      });
    }
  }

  _renderOverlay(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    const win = this._over === "win";
    const loseMsg = this.player.boom ? "BOOM! A SONDA EXPLODIU" : "SEM COMBUSTÍVEL";
    Painter.text(ctx, win ? "VOCÊ ENRIQUECEU!" : loseMsg, VIEW.WIDTH / 2, VIEW.HEIGHT / 2 - 40, {
      size: 44, color: win ? PALETTE.OK : PALETTE.DANGER, align: "center", baseline: "middle", weight: "bold", shadow: true,
    });
    Painter.text(ctx, `Dinheiro: $${this.player.money}   •   Profundidade máx.: ${this.player.maxDepth} m`, VIEW.WIDTH / 2, VIEW.HEIGHT / 2 + 6, {
      size: 18, color: PALETTE.TEXT, align: "center", baseline: "middle",
    });
    Painter.text(ctx, "R = jogar de novo     •     ESC = menu", VIEW.WIDTH / 2, VIEW.HEIGHT / 2 + 48, {
      size: 16, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });
  }
}
