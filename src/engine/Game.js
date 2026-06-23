/* =========================================================================
   Game.js
   Núcleo do jogo (a "engine" montada). Responsável por:
     - instanciar os subsistemas (Canvas, Input, Time, Camera);
     - registrar os estados na StateMachine;
     - rodar o GameLoop, delegando update/render ao estado atual.

   É o ponto central de acesso aos serviços compartilhados — os estados
   recebem uma referência a esta instância. Mantemos a lista de serviços
   enxuta para evitar virar um "objeto-deus".
   ========================================================================= */

import { Canvas } from "./Canvas.js";
import { Input } from "./Input.js";
import { Time } from "./Time.js";
import { Camera } from "./Camera.js";
import { GameLoop } from "./GameLoop.js";
import { Save } from "./Save.js";
import { Audio } from "./Audio.js";
import { StateMachine } from "../states/StateMachine.js";
import { GameConfig } from "../config/GameConfig.js";
import { STATES, PALETTE } from "../config/Constants.js";
import { Painter } from "../ui/Painter.js";

// Estados concretos

import { BootState } from "../states/BootState.js";
import { MenuState } from "../states/MenuState.js";
import { PlayState } from "../states/PlayState.js";
import { ShopState } from "../states/ShopState.js";

export class Game {
  constructor(canvasId) {
    // --- Subsistemas da engine ---
    this.canvas = new Canvas(canvasId);
    this.ctx = this.canvas.ctx;
    this.input = new Input(this.canvas);
    this.time = new Time();
    this.camera = new Camera();
    this.audio = new Audio();

    // Flag global de depuração (alternável com F3).
    this.debug = GameConfig.debug;

    // --- Perfil persistente (dinheiro + itens comprados na loja) ---
    this.profile = Save.load();

    // --- Estados ---
    this.states = new StateMachine();
    this._registerStates();

    // --- Laço principal ---
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
      time: this.time,
    });
  }

  _registerStates() {
    this.states
      .register(STATES.BOOT, new BootState(this))
      .register(STATES.MENU, new MenuState(this))
      .register(STATES.PLAY, new PlayState(this))
      .register(STATES.SHOP, new ShopState(this));
    // Demais estados (Pause, GameOver...) serão registrados nas etapas
    // correspondentes, sem alterar o que já existe.
  }

  /** Persiste o perfil atual no LocalStorage. */
  saveProfile() {
    Save.save(this.profile);
  }

  /** Inicia o jogo no estado BOOT. */
  start() {
    this.states.change(STATES.BOOT);
    this.loop.start();
  }

  update(dt) {
    // Atalho global de depuração.
    if (this.input.wasPressed("F3")) {
      this.debug = !this.debug;
    }
    // Atalho global de mudo (M).
    if (this.input.wasPressed("KeyM")) {
      this.audio.toggleMute();
    }

    this.states.update(dt);
    this.camera.update(dt);

    // IMPORTANTE: reinicia estados de borda do input no fim do frame.
    this.input.update();
  }

  render() {
    this.canvas.clear("#000");
    this.states.render(this.ctx);
    if (this.debug) this._renderDebug();
  }

  /** Overlay mínimo de depuração (cresce na etapa de Debug). */
  _renderDebug() {
    const ctx = this.ctx;
    Painter.panel(ctx, 8, 8, 150, 46, { fill: "rgba(0,0,0,0.6)", radius: 6 });
    Painter.text(ctx, `FPS ${this.time.fps}`, 18, 26, { size: 14, color: PALETTE.OK, baseline: "middle" });
    Painter.text(ctx, `estado: ${this.states.currentId}`, 18, 44, { size: 12, color: PALETTE.TEXT_DIM, baseline: "middle" });
  }
}
