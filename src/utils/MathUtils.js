/* =========================================================================
   MathUtils.js
   Funções matemáticas puras e reutilizáveis. Sem estado, sem efeitos
   colaterais — fáceis de testar e usar em qualquer módulo.
   ========================================================================= */

/** Restringe um valor ao intervalo [min, max]. */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Interpolação linear entre a e b por t (0..1). */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Aproxima `current` de `target` suavemente (independente de framerate). */
export const damp = (current, target, smoothing, dt) =>
  lerp(current, target, 1 - Math.pow(smoothing, dt));

/** Mapeia um valor de um intervalo para outro. */
export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);

/** Número aleatório real em [min, max). */
export const randRange = (min, max) => min + Math.random() * (max - min);

/** Inteiro aleatório em [min, max] (inclusivo). */
export const randInt = (min, max) => Math.floor(randRange(min, max + 1));

/** Retorna true com probabilidade `p` (0..1). */
export const chance = (p) => Math.random() < p;

/** Escolhe um elemento aleatório de um array. */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Distância euclidiana entre dois pontos. */
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
