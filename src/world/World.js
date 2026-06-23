/* =========================================================================
   World.js
   O subsolo: uma grade de blocos (ver BlockTypes). Responsável por gerar o
   mapa proceduralmente, responder consultas (sólido? perfurável?) e remover
   blocos perfurados. Trabalha em coordenadas de GRADE (col, row); a conversão
   para pixels usa TILE.SIZE.
   ========================================================================= */

import { TILE } from "../config/Constants.js";
import { BLOCK, blockDef } from "./BlockTypes.js";
import { clamp, chance, randInt } from "../utils/MathUtils.js";

export class World {
  /**
   * @param {object} cfg
   * @param {number} cfg.cols        largura do mundo em blocos
   * @param {number} cfg.rows        profundidade total em blocos
   * @param {number} cfg.surfaceRows quantas linhas de céu há no topo
   */
  constructor({ cols = 30, rows = 140, surfaceRows = 3 } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.surfaceRows = surfaceRows;
    this.tile = TILE.SIZE;

    // Mapa linear (row-major). Preenchido por generate().
    this.grid = new Int8Array(cols * rows);

    // Largura/altura do mundo em pixels.
    this.width = cols * this.tile;
    this.height = rows * this.tile;

    // Linha (em pixels) onde termina o céu e começa o solo.
    this.groundY = surfaceRows * this.tile;
  }

  generate() {
    const { cols, rows, surfaceRows } = this;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.grid[row * cols + col] = this._blockFor(col, row, surfaceRows, rows);
      }
    }
    return this;
  }

  /** Decide qual bloco nasce numa célula durante a geração. */
  _blockFor(col, row, surfaceRows, rows) {
    if (row < surfaceRows) return BLOCK.EMPTY;       // céu
    if (row >= rows - 1) return BLOCK.BEDROCK;        // base indestrutível

    const depth = row - surfaceRows;                  // profundidade em blocos

    // Bolsões de gás aparecem em qualquer profundidade (raros).
    if (chance(0.018)) return BLOCK.FUEL;

    // Esmeraldas: só fundo, bem raras.
    if (depth > 18 && chance(clamp((depth - 18) * 0.0016, 0, 0.04))) return BLOCK.GEM;

    // Petróleo: surge a partir de uns metros, fica mais comum fundo.
    if (depth > 3 && chance(clamp((depth - 3) * 0.0045, 0, 0.12))) return BLOCK.OIL;

    // Rocha dura nas camadas profundas.
    if (depth > 30 && chance(clamp((depth - 30) * 0.006, 0, 0.35))) return BLOCK.HARDROCK;

    // Rocha comum fica mais frequente com a profundidade.
    if (chance(clamp(0.06 + depth * 0.004, 0, 0.4))) return BLOCK.ROCK;

    return BLOCK.DIRT;
  }

  /** Está dentro da grade? */
  inBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  /**
   * Id do bloco na célula. Fora da grade na horizontal/topo = EMPTY;
   * abaixo do fundo = BEDROCK (impede cair para fora do mundo).
   */
  get(col, row) {
    if (col < 0 || col >= this.cols || row < 0) return BLOCK.EMPTY;
    if (row >= this.rows) return BLOCK.BEDROCK;
    return this.grid[row * this.cols + col];
  }

  isSolid(col, row) {
    return blockDef(this.get(col, row)).solid;
  }

  /** Perfurável = sólido e com dureza > 0 (a base tem dureza 0). */
  isDiggable(col, row) {
    const d = blockDef(this.get(col, row));
    return d.solid && d.hardness > 0;
  }

  /** Remove o bloco (vira EMPTY) e devolve a definição do que estava ali. */
  remove(col, row) {
    const def = blockDef(this.get(col, row));
    if (this.inBounds(col, row)) this.grid[row * this.cols + col] = BLOCK.EMPTY;
    return def;
  }

  /** Limites do mundo para a câmera. */
  get bounds() {
    return { minX: 0, minY: 0, maxX: this.width, maxY: this.height };
  }

  /** Coluna livre (sem rocha logo abaixo da superfície) para nascer o jogador. */
  randomSurfaceColumn() {
    return randInt(2, this.cols - 3);
  }
}
