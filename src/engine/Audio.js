/* =========================================================================
   Audio.js
   Som do jogo gerado por código (Web Audio API) — sem arquivos externos.
   Oferece efeitos sonoros curtos (sfx) e uma música de fundo alegre em loop,
   feita com um pequeno sequenciador (melodia pentatônica + baixo + chimbal).

   Navegadores bloqueiam áudio até um gesto do usuário, então a classe se
   "desbloqueia" sozinha no primeiro clique/tecla e só então inicia a música.
   Se a Web Audio não existir, tudo vira no-op silencioso.
   ========================================================================= */

// Frequências (Hz) das notas usadas.
const N = {
  A1: 55.0, C2: 65.41, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

// Melodia (16 passos, colcheias) — dó maior pentatônico, bem-humorada.
const MELODY = [
  N.C5, N.E5, N.G5, N.E5, N.A4, N.C5, N.A4, N.G4,
  N.C5, N.E5, N.D5, N.C5, N.A4, N.G4, N.E4, N.G4,
];
// Baixo: um acorde a cada 4 passos (I – vi – IV – V).
const BASS = [N.C2, N.C2, N.C2, N.C2, N.A1, N.A1, N.A1, N.A1, N.F2, N.F2, N.F2, N.F2, N.G2, N.G2, N.G2, N.G2];

const STEP_TIME = 0.2;          // duração de um passo (s) ~ 150 BPM
const SCHEDULE_AHEAD = 0.12;    // janela de agendamento (s)

export class Audio {
  constructor() {
    this.enabled = false;
    this.muted = false;
    this._musicOn = false;
    this._step = 0;
    this._nextStepTime = 0;
    this._timer = 0;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // navegador sem Web Audio — segue mudo

    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.master);

      this._noise = this._makeNoiseBuffer();
      this.enabled = true;

      // Desbloqueia no primeiro gesto e começa a música.
      this._unlock = this._unlock.bind(this);
      ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
        window.addEventListener(ev, this._unlock, { passive: true })
      );
    } catch {
      this.enabled = false;
    }
  }

  _unlock() {
    if (!this.enabled) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.startMusic();
    ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
      window.removeEventListener(ev, this._unlock)
    );
  }

  toggleMute() {
    if (!this.enabled) return this.muted;
    this.muted = !this.muted;
    this.master.gain.value = this.muted ? 0 : 0.7;
    return this.muted;
  }

  // ---- Síntese de uma nota --------------------------------------------
  _tone(freq, when, dur, { type = "square", gain = 0.5, dest = this.sfxGain, slideTo = null } = {}) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
    osc.connect(g);
    g.connect(dest);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  _makeNoiseBuffer() {
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseBurst(when, dur, { gain = 0.5, freq = 1000, type = "lowpass", dest = this.sfxGain } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  // ---- Efeitos sonoros (disparados pelo jogo) -------------------------
  sfx(name) {
    if (!this.enabled || this.muted) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    switch (name) {
      case "click":
        this._tone(660, t, 0.07, { type: "square", gain: 0.4 });
        break;
      case "dig":
        // "crunch" curto: ruído grave + estalo.
        this._noiseBurst(t, 0.09, { gain: 0.35, freq: 700 });
        this._tone(130, t, 0.07, { type: "square", gain: 0.18 });
        break;
      case "coin":
        // Dois bipes ascendentes (dinheiro!).
        this._tone(N.E5, t, 0.09, { type: "square", gain: 0.4 });
        this._tone(N.G5, t + 0.08, 0.12, { type: "square", gain: 0.4 });
        break;
      case "fuel":
        // Arpejo rápido subindo.
        this._tone(N.C5, t, 0.08, { type: "triangle", gain: 0.4 });
        this._tone(N.E5, t + 0.06, 0.08, { type: "triangle", gain: 0.4 });
        this._tone(N.G5, t + 0.12, 0.12, { type: "triangle", gain: 0.4 });
        break;
      case "buy":
        this._tone(N.G4, t, 0.09, { type: "square", gain: 0.4 });
        this._tone(N.C5, t + 0.08, 0.09, { type: "square", gain: 0.4 });
        this._tone(N.E5, t + 0.16, 0.16, { type: "square", gain: 0.4 });
        break;
      case "explosion":
        this._noiseBurst(t, 0.6, { gain: 0.8, freq: 1800 });
        this._tone(90, t, 0.5, { type: "sawtooth", gain: 0.5, slideTo: 35 });
        break;
      case "death":
        // Tom descendente "game over".
        this._tone(400, t, 0.5, { type: "square", gain: 0.45, slideTo: 90 });
        break;
    }
  }

  // ---- Música de fundo (loop) -----------------------------------------
  startMusic() {
    if (!this.enabled || this._musicOn) return;
    this._musicOn = true;
    this._step = 0;
    this._nextStepTime = this.ctx.currentTime + 0.1;
    this._timer = window.setInterval(() => this._scheduler(), 25);
  }

  stopMusic() {
    this._musicOn = false;
    if (this._timer) window.clearInterval(this._timer);
    this._timer = 0;
  }

  /** Agenda os próximos passos da música dentro da janela de lookahead. */
  _scheduler() {
    if (!this._musicOn || this.ctx.state === "suspended") return;
    while (this._nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      this._scheduleStep(this._step, this._nextStepTime);
      this._nextStepTime += STEP_TIME;
      this._step = (this._step + 1) % MELODY.length;
    }
  }

  _scheduleStep(i, when) {
    const dest = this.musicGain;
    // Melodia.
    this._tone(MELODY[i], when, STEP_TIME * 0.9, { type: "square", gain: 0.22, dest });
    // Baixo (no início de cada tempo — passos pares).
    if (i % 2 === 0) {
      this._tone(BASS[i], when, STEP_TIME * 1.6, { type: "triangle", gain: 0.3, dest });
    }
    // Chimbal nos contratempos.
    if (i % 2 === 1) {
      this._noiseBurst(when, 0.05, { gain: 0.08, freq: 6000, type: "highpass", dest });
    }
  }
}
