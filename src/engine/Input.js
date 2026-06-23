/* =========================================================================
   Input.js
   Gerencia teclado e mouse de forma centralizada. Oferece consulta de
   estado "contínuo" (isDown) e "de borda" (wasPressed — verdadeiro apenas
   no primeiro frame da tecla). update() deve ser chamado no FIM de cada
   frame para reiniciar os estados de borda.
   ========================================================================= */

export class Input {
  /** @param {Canvas} canvas para converter coordenadas do mouse */
  constructor(canvas) {
    this.canvas = canvas;

    this._down = new Set();        // teclas atualmente pressionadas
    this._pressed = new Set();     // teclas pressionadas NESTE frame (borda)
    this._released = new Set();    // teclas soltas NESTE frame

    this.mouse = { x: 0, y: 0, down: false, pressed: false, released: false };

    this._bind();
  }

  _bind() {
    window.addEventListener("keydown", (e) => {
      // Evita repetição automática do SO contar como novo "pressed".
      if (!e.repeat && !this._down.has(e.code)) {
        this._pressed.add(e.code);
      }
      this._down.add(e.code);
      // Impede rolagem da página com setas/espaço durante o jogo.
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this._down.delete(e.code);
      this._released.add(e.code);
    });

    const el = this.canvas.el;
    el.addEventListener("mousemove", (e) => {
      const p = this.canvas.screenToCanvas(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    });
    el.addEventListener("mousedown", () => {
      if (!this.mouse.down) this.mouse.pressed = true;
      this.mouse.down = true;
    });
    window.addEventListener("mouseup", () => {
      this.mouse.down = false;
      this.mouse.released = true;
    });

    // Limpa estado ao perder o foco (evita "tecla grudada").
    window.addEventListener("blur", () => this._down.clear());
  }

  /** Tecla está pressionada agora? (ex.: "ArrowLeft", "KeyA") */
  isDown(code) {
    return this._down.has(code);
  }

  /** Tecla foi pressionada NESTE frame? (disparo único) */
  wasPressed(code) {
    return this._pressed.has(code);
  }

  /** Tecla foi solta NESTE frame? */
  wasReleased(code) {
    return this._released.has(code);
  }

  /** Limpa os estados de borda. Chamar ao final de cada frame. */
  update() {
    this._pressed.clear();
    this._released.clear();
    this.mouse.pressed = false;
    this.mouse.released = false;
  }
}
