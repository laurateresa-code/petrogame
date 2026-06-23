/* =========================================================================
   Canvas.js
   Encapsula o <canvas> e o contexto 2D. Mantém uma RESOLUÇÃO LÓGICA fixa
   (VIEW) e escala visualmente para preencher a janela preservando a
   proporção (letterbox). O resto do jogo desenha sempre em coordenadas
   lógicas, sem se preocupar com o tamanho real da tela.
   ========================================================================= */

import { VIEW } from "../config/Constants.js";

export class Canvas {
  /** @param {string} canvasId id do elemento <canvas> no HTML */
  constructor(canvasId) {
    /** @type {HTMLCanvasElement} */
    this.el = document.getElementById(canvasId);
    if (!this.el) {
      throw new Error(`Canvas "#${canvasId}" não encontrado no HTML.`);
    }

    /** @type {CanvasRenderingContext2D} */
    this.ctx = this.el.getContext("2d", { alpha: false });

    this.width = VIEW.WIDTH;
    this.height = VIEW.HEIGHT;

    // A resolução interna (buffer) é fixa; só a apresentação CSS escala.
    this.el.width = this.width;
    this.el.height = this.height;

    // Pixel art nítida.
    this.ctx.imageSmoothingEnabled = false;

    this._fitToWindow = this._fitToWindow.bind(this);
    window.addEventListener("resize", this._fitToWindow);
    this._fitToWindow();
  }

  /** Escala o canvas via CSS para caber na janela mantendo a proporção. */
  _fitToWindow() {
    const scale = Math.min(
      window.innerWidth / this.width,
      window.innerHeight / this.height
    );
    // Floor para múltiplos inteiros quando possível (pixel art mais limpa).
    const cssW = Math.floor(this.width * scale);
    const cssH = Math.floor(this.height * scale);
    this.el.style.width = `${cssW}px`;
    this.el.style.height = `${cssH}px`;
    this._scale = scale;
  }

  /** Converte uma coordenada de tela (mouse) para coordenada lógica do canvas. */
  screenToCanvas(clientX, clientY) {
    const rect = this.el.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.width,
      y: ((clientY - rect.top) / rect.height) * this.height,
    };
  }

  /** Limpa a tela inteira com uma cor sólida. */
  clear(color = "#000") {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
