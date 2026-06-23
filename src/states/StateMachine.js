/* =========================================================================
   StateMachine.js
   Máquina de estados do jogo. Registra estados por id (ver Constants.STATES)
   e faz a troca de forma organizada, chamando exit() do antigo e enter() do
   novo. Mantém o jogo desacoplado: nenhum estado conhece o outro diretamente.
   ========================================================================= */

export class StateMachine {
  constructor() {
    this._states = new Map(); // id -> instância de State
    this.current = null;
    this.currentId = null;
  }

  /** Registra um estado já instanciado sob um id. */
  register(id, state) {
    this._states.set(id, state);
    return this;
  }

  /**
   * Troca para o estado `id`, passando `params` ao enter() do novo estado.
   * Ignora a troca se o estado não existir (com aviso) para falhar de forma
   * controlada em vez de quebrar o loop.
   */
  change(id, params = {}) {
    const next = this._states.get(id);
    if (!next) {
      console.warn(`[StateMachine] Estado desconhecido: "${id}"`);
      return;
    }
    if (this.current) this.current.exit();
    this.current = next;
    this.currentId = id;
    next.enter(params);
  }

  update(dt) {
    if (this.current) this.current.update(dt);
  }

  render(ctx) {
    if (this.current) this.current.render(ctx);
  }

  is(id) {
    return this.currentId === id;
  }
}
