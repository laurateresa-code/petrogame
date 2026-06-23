/* =========================================================================
   BlockTypes.js
   Catálogo dos blocos do subsolo. Cada bloco tem id numérico (para guardar
   o mapa em um array compacto), aparência e propriedades de jogabilidade:
     - solid     : bloqueia o movimento (precisa perfurar para passar);
     - hardness  : tempo-base de perfuração em segundos (0 = não perfurável);
     - value     : dinheiro que rende ao ser coletado (vai para a carga);
     - fuel      : combustível que devolve ao ser coletado (bolsões de gás);
     - cargo     : ocupa espaço na carga do jogador?
   Cores de gameplay vivem aqui (a paleta de UI fica em Constants.PALETTE).
   ========================================================================= */

export const BLOCK = Object.freeze({
  EMPTY: 0,
  DIRT: 1,
  ROCK: 2,
  HARDROCK: 3,
  OIL: 4,
  GEM: 5,
  FUEL: 6,
  BEDROCK: 7,
});

/** Tabela de propriedades indexada pelo id do bloco. */
export const BLOCK_DEFS = Object.freeze({
  [BLOCK.EMPTY]:    { name: "vazio",     solid: false, hardness: 0,    value: 0,   fuel: 0,  cargo: false, color: null },
  [BLOCK.DIRT]:     { name: "terra",     solid: true,  hardness: 0.35, value: 0,   fuel: 0,  cargo: false, color: "#6b4423" },
  [BLOCK.ROCK]:     { name: "rocha",     solid: true,  hardness: 0.75, value: 0,   fuel: 0,  cargo: false, color: "#5d5b57" },
  [BLOCK.HARDROCK]: { name: "granito",   solid: true,  hardness: 1.35, value: 0,   fuel: 0,  cargo: false, color: "#3f3e3c" },
  [BLOCK.OIL]:      { name: "petróleo",  solid: true,  hardness: 0.55, value: 60,  fuel: 0,  cargo: true,  color: "#1a1a22" },
  [BLOCK.GEM]:      { name: "esmeralda", solid: true,  hardness: 0.95, value: 180, fuel: 0,  cargo: true,  color: "#27c08a" },
  [BLOCK.FUEL]:     { name: "gás",       solid: true,  hardness: 0.45, value: 0,   fuel: 35, cargo: false, color: "#d24bd2" },
  [BLOCK.BEDROCK]:  { name: "base",      solid: true,  hardness: 0,    value: 0,   fuel: 0,  cargo: false, color: "#17120c" },
});

/** Atalho seguro: retorna a definição de um id (cai em EMPTY se desconhecido). */
export const blockDef = (id) => BLOCK_DEFS[id] ?? BLOCK_DEFS[BLOCK.EMPTY];
