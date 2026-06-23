/* =========================================================================
   State.js
   Classe base para todos os estados do jogo (Menu, Play, Pause, Shop...).
   Define o "contrato" do ciclo de vida. Estados concretos sobrescrevem
   apenas o que precisam.
   ========================================================================= */

export class State {
  /** @param {Game} game referência ao núcleo do jogo (acesso a engine/serviços) */
  constructor(game) {
    this.game = game;
  }

  /** Chamado ao entrar no estado. `params` vem de StateMachine.change(). */
  enter(_params = {}) {}

  /** Chamado ao sair do estado (limpeza). */
  exit() {}

  /** Lógica do estado. dt em segundos. */
  update(_dt) {}

  /** Desenho do estado. */
  render(_ctx) {}
}
