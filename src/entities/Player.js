/* =========================================================================
   Player.js
   A sonda de perfuração. Move-se por CÉLULAS (estilo "passo a passo"), o que
   mantém a física simples e sem bugs de colisão: a sonda só age quando está
   parada e centrada numa célula. As ações possíveis dependem da vizinhança:

     - cair          : se a célula de baixo está vazia (gravidade);
     - perfurar baixo: estando apoiada, segura ↓ para furar e descer;
     - perfurar lados: ←/→ furam/entram na célula ao lado;
     - jato (subir)  : ↑/Espaço sobe por túneis já abertos (gasta combustível).

   Coletar petróleo/esmeralda enche a CARGA (vendida na superfície); bolsões
   de gás devolvem combustível na hora.
   ========================================================================= */

import { TILE } from "../config/Constants.js";
import { BLOCK, blockDef } from "../world/BlockTypes.js";
import { GameConfig } from "../config/GameConfig.js";
import { clamp } from "../utils/MathUtils.js";

const FUEL = GameConfig.fuel;

export class Player {
  constructor(world, col, row) {
    this.world = world;
    this.size = TILE.SIZE - 6; // um pouco menor que a célula

    // Posição lógica (célula) e posição em pixels (centro, para render/câmera).
    this.col = col;
    this.row = row;
    this.x = this._cellCenterX(col);
    this.y = this._cellCenterY(row);

    // Estado de movimento entre células.
    this.moving = false;
    this.tx = this.x;
    this.ty = this.y;
    this._falling = false;

    // Estado de perfuração.
    this.digging = false;
    this._digTimer = 0;
    this._digDuration = 0;
    this._digTarget = null; // {col, row}

    // Direção visual da broca (-1 esq, 1 dir, 0 baixo).
    this.facing = 0;
    this.drillDir = "down";

    // Recursos.
    this.fuel = FUEL.max;
    this.money = GameConfig.economy.startMoney;
    this.collected = 0;  // total de itens valiosos coletados (estatística)
    this.maxDepth = 0;

    // Sinais para o HUD/efeitos (consumidos pelo PlayState).
    this.dead = false;
    this.boom = false;        // morreu por bomba? (dispara a explosão)
    this.boomX = 0;
    this.boomY = 0;
    this.flash = "";          // mensagem curta ("CARGA CHEIA!", "VENDIDO +$..")
    this._flashTimer = 0;
    this.justSold = 0;        // valor vendido neste frame (para shake/efeito)
    this.justCollected = false;
  }

  _cellCenterX(col) { return col * TILE.SIZE + TILE.SIZE / 2; }
  _cellCenterY(row) { return row * TILE.SIZE + TILE.SIZE / 2; }

  get atSurface() { return this.row <= this.world.surfaceRows - 1; }
  get depthMeters() { return Math.max(0, this.row - this.world.surfaceRows + 1); }

  /** Mostra uma mensagem curta sobre a sonda por alguns segundos. */
  _setFlash(msg, secs = 1.6) {
    this.flash = msg;
    this._flashTimer = secs;
  }

  update(dt, input) {
    this.justSold = 0;
    this.justCollected = false;
    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) this.flash = "";
    }

    if (this.dead) return;

    if (this.digging) {
      this._updateDig(dt);
    } else if (this.moving) {
      this._updateMove(dt);
    } else {
      this._decide(dt, input);
    }
  }

  // ---- Perfuração -------------------------------------------------------
  _updateDig(dt) {
    this._digTimer += dt;
    this._spendFuel(FUEL.drainDrill * dt);
    if (this.dead) return;

    if (this._digTimer >= this._digDuration) {
      const { col, row } = this._digTarget;
      const def = this.world.remove(col, row);
      this.digging = false;
      this._digTarget = null;

      // Bomba escondida: a broca encostou — explode e o jogador perde.
      if (def.bomb) {
        this._explode(col, row);
        return;
      }

      this._collect(def);
      // Entra na célula recém-aberta.
      this._beginMove(col, row, false);
    }
  }

  _startDig(col, row) {
    const def = blockDef(this.world.get(col, row));
    this.digging = true;
    this._digTimer = 0;
    this._digDuration = def.hardness / GameConfig.player.drillSpeed;
    this._digTarget = { col, row };
    return true;
  }

  _collect(def) {
    if (def.fuel > 0) {
      this.fuel = clamp(this.fuel + def.fuel, 0, FUEL.max);
      this._setFlash(`+${def.fuel} COMBUSTÍVEL`, 1.2);
    }
    // Venda imediata: o item vira dinheiro no instante da coleta.
    if (def.cargo && def.value > 0) {
      this.money += def.value;
      this.collected += 1;
      this.justSold = def.value;   // dispara o efeito de venda (shake/flash)
      this.justCollected = true;
      this._setFlash(`+$${def.value}`, 1.0);
    }
  }

  // ---- Movimento entre células -----------------------------------------
  _beginMove(col, row, falling) {
    this.col = col;
    this.row = row;
    this.tx = this._cellCenterX(col);
    this.ty = this._cellCenterY(row);
    this.moving = true;
    this._falling = falling;
  }

  _updateMove(dt) {
    const speed = (this._falling ? GameConfig.player.gravity : GameConfig.player.moveSpeed);
    const step = speed * dt;
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);

    if (d <= step) {
      this.x = this.tx;
      this.y = this.ty;
      this.moving = false;
      this._falling = false;
      this.maxDepth = Math.max(this.maxDepth, this.depthMeters);
      if (this.atSurface) this._dock();
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
    }
  }

  // ---- Decisão quando parada -------------------------------------------
  _decide(dt, input) {
    const { col, row } = this;

    const down = input.isDown("ArrowDown") || input.isDown("KeyS");
    const left = input.isDown("ArrowLeft") || input.isDown("KeyA");
    const right = input.isDown("ArrowRight") || input.isDown("KeyD");
    const up = input.isDown("ArrowUp") || input.isDown("KeyW") || input.isDown("Space");

    // Jato (subir) tem PRIORIDADE sobre a gravidade — sem isso seria impossível
    // sair do próprio poço (a gravidade puxaria de volta a cada frame).
    if (up && row - 1 >= 0 && !this.world.isSolid(col, row - 1)) {
      this.drillDir = "up";
      if (this.fuel <= 0) { this._die(); return; }
      this._spendFuel(1.6);
      this._beginMove(col, row - 1, false);
      return;
    }

    // Gravidade: se há vazio abaixo e não estamos subindo, cai (de graça).
    if (!this.world.isSolid(col, row + 1)) {
      this._beginMove(col, row + 1, true);
      return;
    }

    // Apoiada: perfurar / mover.
    if (down) {
      this.drillDir = "down"; this.facing = 0;
      if (this.world.isDiggable(col, row + 1)) this._startDig(col, row + 1);
      return;
    }

    if (left || right) {
      const dir = left ? -1 : 1;
      this.facing = dir;
      this.drillDir = "side";
      const tc = col + dir;
      if (tc < 0 || tc >= this.world.cols) return; // não sai do mundo
      if (!this.world.isSolid(tc, row)) {
        this._spendFuel(FUEL.drainMove * 0.4);
        this._beginMove(tc, row, false);
      } else if (this.world.isDiggable(tc, row)) {
        this._startDig(tc, row);
      }
      return;
    }
  }

  // ---- Superfície: reabastece de graça na BASE --------------------------
  _dock() {
    if (this.fuel < FUEL.max) this._setFlash("REABASTECIDO", 1.2);
    this.fuel = FUEL.max; // reabastecimento gratuito na base
  }

  // ---- Combustível / morte ----------------------------------------------
  _spendFuel(amount) {
    this.fuel = clamp(this.fuel - amount, 0, FUEL.max);
    if (this.fuel <= 0 && !this.atSurface) this._die();
  }

  _die() {
    this.fuel = 0;
    this.dead = true;
    this.digging = false;
    this.moving = false;
  }

  /** Morte por bomba: marca a origem da explosão (centro da célula da bomba). */
  _explode(col, row) {
    this.boom = true;
    this.boomX = this._cellCenterX(col);
    this.boomY = this._cellCenterY(row);
    // Posiciona a sonda sobre a bomba para a explosão sair de onde a broca tocou.
    this.x = this.boomX;
    this.y = this.boomY;
    this.dead = true;
    this.digging = false;
    this.moving = false;
  }

  // ---- Render -----------------------------------------------------------
  render(ctx) {
    const s = this.size;
    const x = Math.round(this.x - s / 2);
    const y = Math.round(this.y - s / 2);

    // Corpo da sonda.
    ctx.fillStyle = this.dead ? "#7a2a2a" : "#ffb22e";
    this._roundRect(ctx, x, y, s, s, 5);
    ctx.fill();

    // Cabine.
    ctx.fillStyle = "#15324a";
    this._roundRect(ctx, x + 5, y + 4, s - 10, s - 13, 3);
    ctx.fill();
    ctx.fillStyle = "#bfe6ff";
    this._roundRect(ctx, x + 7, y + 6, s - 14, 6, 2);
    ctx.fill();

    // Broca, apontando para a direção atual.
    ctx.fillStyle = "#d9d9d9";
    ctx.beginPath();
    if (this.drillDir === "down") {
      ctx.moveTo(this.x - 5, y + s);
      ctx.lineTo(this.x + 5, y + s);
      ctx.lineTo(this.x, y + s + 7);
    } else if (this.drillDir === "up") {
      ctx.moveTo(this.x - 5, y);
      ctx.lineTo(this.x + 5, y);
      ctx.lineTo(this.x, y - 7);
    } else {
      const dir = this.facing >= 0 ? 1 : -1;
      const ex = dir > 0 ? x + s : x;
      ctx.moveTo(ex, this.y - 5);
      ctx.lineTo(ex, this.y + 5);
      ctx.lineTo(ex + dir * 7, this.y);
    }
    ctx.fill();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
