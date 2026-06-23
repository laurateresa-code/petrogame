/* =========================================================================
   PlayState.js
   Estado de JOGO. Monta o mundo (subsolo), a sonda do jogador e o HUD, e
   coordena câmera, perfuração e economia. Objetivo: cavar, achar petróleo e
   esmeraldas, voltar à superfície para vender/reabastecer e atingir a META —
   sem ficar sem combustível lá no fundo.

   Controles:
     ← →  (A/D)        mover / perfurar para os lados
     ↓    (S)          perfurar para baixo
     ↑ / Espaço (W)    jato: subir por túneis abertos
     ESC               menu     •  R  reiniciar (no fim de jogo)
   ========================================================================= */

import { State } from "./State.js";
import { STATES, PALETTE, VIEW, TILE } from "../config/Constants.js";
import { Painter } from "../ui/Painter.js";
import { World } from "../world/World.js";
import { Player } from "../entities/Player.js";
import { BLOCK, blockDef } from "../world/BlockTypes.js";
import { GameConfig } from "../config/GameConfig.js";

const META = 4000; // dinheiro para vencer

export class PlayState extends State {
  enter() {
    this._newRun();
  }

  _newRun() {
    this.world = new World({ cols: 30, rows: 140, surfaceRows: 3 }).generate();

    const col = this.world.randomSurfaceColumn();
    const row = this.world.surfaceRows - 1; // sobre o solo
    this.player = new Player(this.world, col, row);

    this.game.camera.setBounds(this.world.bounds);
    // Centraliza a câmera imediatamente (sem deslize no primeiro frame).
    this.game.camera.x = this.player.x - VIEW.WIDTH / 2;
    this.game.camera.y = this.player.y - VIEW.HEIGHT / 2;
    this.game.camera._clampToBounds();

    this._over = null;      // null | "win" | "lose"
    this._explosion = null; // efeito ativo de explosão (bomba)
    this._time = 0;
  }

  update(dt) {
    this._time += dt;

    if (this.game.input.wasPressed("Escape")) {
      this.game.states.change(STATES.MENU);
      return;
    }

    // A explosão roda mesmo após a morte (para ser vista antes do overlay).
    if (this._explosion) this._explosion.t += dt;

    // Fim de jogo: aguarda R (reiniciar) ou ESC (já tratado acima).
    if (this._over) {
      if (this.game.input.wasPressed("KeyR")) this._newRun();
      return;
    }

    this.player.update(dt, this.game.input);

    if (this.player.justSold > 0) this.game.camera.shake(6);
    if (this.player.justCollected) this.game.camera.shake(3);

    // Câmera segue a sonda (ou a explosão).
    this.game.camera.follow(this.player.x, this.player.y, dt);

    // Vitória.
    if (this.player.money >= META) { this._over = "win"; return; }

    // Derrota.
    if (this.player.dead) {
      if (this.player.boom) {
        // Dispara a explosão uma vez e segura o overlay até ela tocar.
        if (!this._explosion) {
          this._explosion = this._spawnExplosion(this.player.boomX, this.player.boomY);
          this.game.camera.shake(26);
        }
        if (this._explosion.t >= this._explosion.dur) this._over = "lose";
      } else {
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

  render(ctx) {
    const cam = this.game.camera;
    cam.apply(ctx);
    this._renderWorld(ctx, cam);
    // Durante a explosão a sonda some (foi destruída).
    if (!this.player.boom) this.player.render(ctx);
    if (this._explosion) this._renderExplosion(ctx, this._explosion);
    cam.reset(ctx);

    this._renderHud(ctx);
    if (this._over) this._renderOverlay(ctx);
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

    // Faixa de céu (gradiente) no topo do mundo.
    const sky = ctx.createLinearGradient(0, 0, 0, w.groundY);
    sky.addColorStop(0, PALETTE.SKY_TOP);
    sky.addColorStop(1, PALETTE.SKY_BOTTOM);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w.width, w.groundY);

    // Subsolo (fundo escuro — túneis mostram esta cor).
    ctx.fillStyle = "#241910";
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
        }

        // Sombreamento sutil nas bordas (leitura de relevo).
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x, y + t - 3, t, 3);
        ctx.fillRect(x + t - 3, y, 3, t);
      }
    }

    // Linha do solo.
    ctx.fillStyle = PALETTE.GROUND_LINE;
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

    // Painel superior-esquerdo: combustível + carga.
    Painter.panel(ctx, 12, 12, 230, 86, { fill: "rgba(0,0,0,0.55)", radius: 10 });

    Painter.text(ctx, "COMBUSTÍVEL", 24, 30, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });
    const fuelRatio = p.fuel / GameConfig.fuel.max;
    const fuelColor = fuelRatio > 0.3 ? PALETTE.OK : PALETTE.DANGER;
    Painter.bar(ctx, 24, 38, 206, 12, fuelRatio, { fill: fuelColor, bg: "#2a2620" });

    Painter.text(ctx, `CARGA  ${p.cargo}/${p.cargoMax}`, 24, 70, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });
    Painter.bar(ctx, 24, 78, 206, 10, p.cargo / p.cargoMax, { fill: PALETTE.ACCENT, bg: "#2a2620" });

    // Painel superior-direito: dinheiro + meta + profundidade.
    Painter.panel(ctx, VIEW.WIDTH - 222, 12, 210, 86, { fill: "rgba(0,0,0,0.55)", radius: 10 });
    Painter.text(ctx, `$ ${p.money}`, VIEW.WIDTH - 24, 36, {
      size: 24, color: PALETTE.ACCENT, align: "right", baseline: "middle", weight: "bold",
    });
    Painter.text(ctx, `meta: $${META}`, VIEW.WIDTH - 24, 58, {
      size: 12, color: PALETTE.TEXT_DIM, align: "right", baseline: "middle",
    });
    Painter.text(ctx, `profundidade: ${p.depthMeters} m`, VIEW.WIDTH - 24, 80, {
      size: 12, color: PALETTE.TEXT_DIM, align: "right", baseline: "middle",
    });

    // Valor da carga a bordo (ainda não vendido).
    if (p.cargoValue > 0) {
      Painter.text(ctx, `carga vale $${p.cargoValue}`, VIEW.WIDTH / 2, 26, {
        size: 13, color: PALETTE.TEXT, align: "center", baseline: "middle",
      });
    }

    // Mensagem flutuante (vendeu, achou gás, carga cheia...).
    if (p.flash) {
      Painter.text(ctx, p.flash, VIEW.WIDTH / 2, VIEW.HEIGHT - 40, {
        size: 18, color: PALETTE.ACCENT, align: "center", baseline: "middle", weight: "bold", shadow: true,
      });
    }

    // Dica de controles nos primeiros segundos.
    if (this._time < 7) {
      Painter.text(ctx, "↓ perfurar  •  ← → mover/cavar  •  ↑/Espaço jato  •  volte à BASE para vender", VIEW.WIDTH / 2, VIEW.HEIGHT - 16, {
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
