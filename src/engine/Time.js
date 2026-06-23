/* =========================================================================
   Time.js
   Controla o tempo do jogo: deltaTime (em segundos), tempo total decorrido
   e cálculo suavizado de FPS para o HUD/debug.
   ========================================================================= */

import { LOOP } from "../config/Constants.js";

export class Time {
  constructor() {
    this.delta = 0;        // segundos desde o último frame (já limitado)
    this.elapsed = 0;      // segundos totais de jogo (não pausado)
    this.frame = 0;        // contador de frames

    this._fps = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
  }

  /**
   * Atualiza o tempo a partir do timestamp do requestAnimationFrame.
   * @param {number} rawDeltaMs delta bruto em milissegundos
   */
  tick(rawDeltaMs) {
    // Converte para segundos e limita para evitar saltos enormes.
    this.delta = Math.min(rawDeltaMs / 1000, LOOP.MAX_DELTA);
    this.elapsed += this.delta;
    this.frame++;

    // FPS suavizado: média a cada ~0.25s.
    this._fpsAccum += rawDeltaMs / 1000;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.25) {
      this._fps = Math.round(this._fpsFrames / this._fpsAccum);
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }
  }

  /** FPS atual (suavizado). */
  get fps() {
    return this._fps;
  }
}
