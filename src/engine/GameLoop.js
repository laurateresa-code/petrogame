/* =========================================================================
   GameLoop.js
   Laço principal baseado em requestAnimationFrame. Separa claramente
   update(dt) e render(), oferece controle de pausa e é resiliente a
   travadas (o deltaTime é limitado pelo módulo Time).

   Não conhece o jogo: recebe callbacks. Isso mantém o loop reutilizável e
   desacoplado da lógica.
   ========================================================================= */

export class GameLoop {
  /**
   * @param {object} cfg
   * @param {(dt:number)=>void} cfg.update  lógica do jogo (dt em segundos)
   * @param {()=>void}          cfg.render  desenho
   * @param {Time}              cfg.time    controlador de tempo
   */
  constructor({ update, render, time }) {
    this._update = update;
    this._render = render;
    this._time = time;

    this.running = false;
    this.paused = false;

    this._lastTs = 0;
    this._rafId = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastTs = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._rafId);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    // Evita um "salto" grande de dt ao retomar.
    this._lastTs = performance.now();
  }

  togglePause() {
    this.paused ? this.resume() : this.pause();
  }

  /** Um passo do laço. */
  _tick(ts) {
    if (!this.running) return;

    const rawDeltaMs = ts - this._lastTs;
    this._lastTs = ts;

    // Mesmo pausado, contamos o tempo para manter o dt coerente ao retomar,
    // mas NÃO atualizamos a lógica. O render continua (telas de pausa etc.).
    if (!this.paused) {
      this._time.tick(rawDeltaMs);
      this._update(this._time.delta);
    }

    this._render();

    this._rafId = requestAnimationFrame(this._tick);
  }
}
