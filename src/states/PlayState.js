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
import { GameConfig } from "../config/GameConfig.js";
import { findDrill, findScenario } from "../config/Shop.js";

export class PlayState extends State {
  enter(params = {}) {
    this._buildPauseButtons();

    // Retomada após visitar a LOJA: mantém a partida e reaplica os upgrades.
    if (params.resume && this.world) {
      this.player.drillSpeed = findDrill(this.game.profile.drill).drillSpeed;
      this._pal = findScenario(this.game.profile.scenario).palette;
      this.game.camera.setBounds(this.world.bounds);
      this._paused = true;
      return;
    }

    this._newRun();
  }

  /** Cria os três botões do menu lateral (posições fixas). */
  _buildPauseButtons() {
    const x = 20, w = 160, h = 44, gap = 34, startY = 150;
    this._pauseButtons = [
      { id: "play", label: "PLAY", hint: "ESC" },
      { id: "restart", label: "RESTART", hint: "R" },
      { id: "shop", label: "LOJA", hint: "L" },
    ].map((b, i) => ({ ...b, rect: { x, y: startY + i * (h + gap), w, h } }));
    this._pauseHover = null;
  }

  _newRun() {
    this.world = new World({ cols: 30, rows: 140, surfaceRows: 3 }).generate();

    // Itens equipados (loja): broca define a velocidade; cenário, a paleta.
    const drill = findDrill(this.game.profile.drill);
    this._pal = findScenario(this.game.profile.scenario).palette;

    const col = this.world.randomSurfaceColumn();
    const row = this.world.surfaceRows - 1; // sobre o solo
    this.player = new Player(this.world, col, row, {
      profile: this.game.profile,
      drillSpeed: drill.drillSpeed,
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

    // --- Atalhos do menu lateral (funcionam pausado ou em jogo) ---
    if (input.wasPressed("KeyR")) { this._newRun(); return; }
    if (input.wasPressed("KeyL")) { this._openShop(); return; }
    if (input.wasPressed("Escape") || input.wasPressed("KeyP")) {
      this._paused = !this._paused;
    }

    // --- Pausado: congela o jogo e processa o menu lateral ---
    if (this._paused) {
      if (input.wasPressed("Enter")) this._paused = false;
      this._handlePauseClicks();
      return;
    }

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

  /** Detecta hover e clique nos botões do menu lateral. */
  _handlePauseClicks() {
    const { x: mx, y: my } = this.game.input.mouse;
    this._pauseHover = null;
    for (const b of this._pauseButtons) {
      if (pointInRect(mx, my, b.rect)) {
        this._pauseHover = b.id;
        if (this.game.input.mouse.pressed) this._doPauseAction(b.id);
      }
    }
  }

  _doPauseAction(id) {
    this.game.audio.sfx("click");
    if (id === "play") this._paused = false;
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
    if (this._paused) this._renderPauseMenu(ctx);
    if (this._over) this._renderOverlay(ctx);
  }

  /** Menu lateral esquerdo (pause): PLAY, RESTART e LOJA. */
  _renderPauseMenu(ctx) {
    const panelW = 200;

    // Escurece o jogo ao fundo e desenha o painel lateral.
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
    ctx.fillStyle = "rgba(12,9,6,0.96)";
    ctx.fillRect(0, 0, panelW, VIEW.HEIGHT);
    ctx.fillStyle = PALETTE.ACCENT_DARK;
    ctx.fillRect(panelW - 3, 0, 3, VIEW.HEIGHT);

    Painter.text(ctx, "PAUSA", panelW / 2, 72, {
      size: 30, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold", shadow: true,
    });
    Painter.text(ctx, `$ ${this.game.profile.money}`, panelW / 2, 104, {
      size: 18, color: PALETTE.OK, align: "center", baseline: "middle", weight: "bold",
    });

    for (const b of this._pauseButtons) {
      const { x, y, w, h } = b.rect;
      Painter.button(ctx, b.label, x, y, w, h, { hovered: this._pauseHover === b.id, size: 18 });
      Painter.text(ctx, `atalho: ${b.hint}`, x + w / 2, y + h + 12, {
        size: 11, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
      });
    }

    Painter.text(ctx, "ESC retoma o jogo", panelW / 2, VIEW.HEIGHT - 24, {
      size: 12, color: PALETTE.TEXT_DIM, align: "center", baseline: "middle",
    });
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

    // Painel superior-esquerdo: combustível + itens coletados.
    Painter.panel(ctx, 12, 12, 230, 70, { fill: "rgba(0,0,0,0.55)", radius: 10 });

    Painter.text(ctx, "COMBUSTÍVEL", 24, 30, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });
    const fuelRatio = p.fuel / GameConfig.fuel.max;
    const fuelColor = fuelRatio > 0.3 ? PALETTE.OK : PALETTE.DANGER;
    Painter.bar(ctx, 24, 38, 206, 12, fuelRatio, { fill: fuelColor, bg: "#2a2620" });

    Painter.text(ctx, `tesouros coletados: ${p.collected}`, 24, 66, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });

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
