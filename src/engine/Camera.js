/* =========================================================================
   Camera.js
   Câmera 2D. Converte coordenadas do MUNDO para a TELA e segue um alvo
   (ex.: o jogador) com suavização. Suporta um leve "screen shake" usado
   pelos efeitos de impacto/explosão.
   ========================================================================= */

import { VIEW } from "../config/Constants.js";
import { damp } from "../utils/MathUtils.js";

export class Camera {
  constructor() {
    this.x = 0; // canto superior-esquerdo da câmera no mundo
    this.y = 0;
    this.width = VIEW.WIDTH;
    this.height = VIEW.HEIGHT;

    this._shake = 0;       // intensidade atual do tremor
    this._shakeX = 0;
    this._shakeY = 0;

    // Limites do mundo (definidos pelo mapa). null = sem limite.
    this.bounds = null;
  }

  /** Define limites do mundo: { minX, minY, maxX, maxY }. */
  setBounds(bounds) {
    this.bounds = bounds;
  }

  /** Centraliza suavemente a câmera num alvo {x, y} (centro do alvo). */
  follow(targetX, targetY, dt, smoothing = 0.0008) {
    const desiredX = targetX - this.width / 2;
    const desiredY = targetY - this.height / 2;
    this.x = damp(this.x, desiredX, smoothing, dt);
    this.y = damp(this.y, desiredY, smoothing, dt);
    this._clampToBounds();
  }

  _clampToBounds() {
    if (!this.bounds) return;
    const { minX, minY, maxX, maxY } = this.bounds;
    this.x = Math.max(minX, Math.min(this.x, maxX - this.width));
    this.y = Math.max(minY, Math.min(this.y, maxY - this.height));
  }

  /** Dispara um tremor de tela com a intensidade dada (px). */
  shake(intensity) {
    this._shake = Math.max(this._shake, intensity);
  }

  /** Atualiza o decaimento do tremor. Chamar uma vez por frame. */
  update(dt) {
    if (this._shake > 0.1) {
      this._shakeX = (Math.random() * 2 - 1) * this._shake;
      this._shakeY = (Math.random() * 2 - 1) * this._shake;
      this._shake *= Math.pow(0.0001, dt); // decai rápido
    } else {
      this._shake = this._shakeX = this._shakeY = 0;
    }
  }

  /** Aplica a transformação da câmera ao contexto (chamar antes de desenhar o mundo). */
  apply(ctx) {
    ctx.save();
    ctx.translate(
      -Math.round(this.x + this._shakeX),
      -Math.round(this.y + this._shakeY)
    );
  }

  /** Restaura o contexto (chamar após desenhar o mundo). */
  reset(ctx) {
    ctx.restore();
  }
}
