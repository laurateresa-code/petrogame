/* =========================================================================
   Shop.js
   Catálogo da LOJA. Duas frentes:
     - UPGRADES (comprados com dinheiro): brocas, cenários e tanques;
     - REFINARIA (fabricados com petróleo/gemas coletados): materiais.
   Cada item tem id, nome, descrição e o efeito/custo. Centralizar aqui
   facilita balancear e adicionar novos itens sem mexer na lógica.
   ========================================================================= */

/** Brocas: o efeito é o multiplicador de velocidade de perfuração. */
export const DRILLS = Object.freeze([
  { id: "iron",    name: "Broca de Ferro",    desc: "padrão",          price: 0,    drillSpeed: 1.0 },
  { id: "steel",   name: "Broca de Aço",      desc: "+60% velocidade", price: 600,  drillSpeed: 1.6 },
  { id: "diamond", name: "Broca de Diamante", desc: "+150% veloc.",    price: 2500, drillSpeed: 2.5 },
]);

/** Cenários: trocam a paleta do céu e do subsolo (cosmético). */
export const SCENARIOS = Object.freeze([
  { id: "desert",  name: "Deserto",   desc: "padrão", price: 0,
    palette: { skyTop: "#7ec0ee", skyBottom: "#cfe8ff", bg: "#241910", groundLine: "#5a3a1a" } },
  { id: "arctic",  name: "Ártico",    desc: "gelo",   price: 900,
    palette: { skyTop: "#cfe9f5", skyBottom: "#eef8fc", bg: "#1b2a33", groundLine: "#41616e" } },
  { id: "volcano", name: "Vulcânico", desc: "lava",   price: 1800,
    palette: { skyTop: "#2e0f0c", skyBottom: "#8a2f1a", bg: "#2a1109", groundLine: "#5e1c0c" } },
]);

/** Tanques: aumentam a capacidade máxima de combustível. */
export const TANKS = Object.freeze([
  { id: "std", name: "Tanque Padrão", desc: "100 de combustível", price: 0,    maxFuel: 100 },
  { id: "med", name: "Tanque Médio",  desc: "150 de combustível", price: 800,  maxFuel: 150 },
  { id: "big", name: "Tanque Grande", desc: "220 de combustível", price: 2000, maxFuel: 220 },
]);

/**
 * REFINARIA — materiais derivados do petróleo. Fabricar consome barris de
 * petróleo (e às vezes gemas) que o jogador coletou e rende dinheiro (o
 * produto refinado vale mais que o bruto). `crafted` guarda quantos já fez.
 */
export const MATERIALS = Object.freeze([
  { id: "gasolina",  name: "Gasolina",   cost: { barris: 3 },            reward: 220,  desc: "combustível nobre" },
  { id: "diesel",    name: "Diesel",     cost: { barris: 5 },            reward: 400,  desc: "motores pesados" },
  { id: "plastico",  name: "Plástico",   cost: { barris: 6 },            reward: 520,  desc: "embalagens e peças" },
  { id: "asfalto",   name: "Asfalto",    cost: { barris: 8 },            reward: 720,  desc: "pavimenta estradas" },
  { id: "querosene", name: "Querosene",  cost: { barris: 5, gemas: 1 },  reward: 680,  desc: "combustível de avião" },
  { id: "parafina",  name: "Parafina",   cost: { barris: 10, gemas: 2 }, reward: 1300, desc: "velas e cosméticos" },
]);

/** Texto do custo de um material (ex.: "5 barris + 1 gema"). */
export const costText = (cost) => {
  const parts = [];
  if (cost.barris) parts.push(`${cost.barris} barris`);
  if (cost.gemas) parts.push(`${cost.gemas} gema${cost.gemas > 1 ? "s" : ""}`);
  return parts.join(" + ");
};

/** Acha um item por id com fallback no primeiro (padrão). */
export const findDrill = (id) => DRILLS.find((d) => d.id === id) ?? DRILLS[0];
export const findScenario = (id) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
export const findTank = (id) => TANKS.find((t) => t.id === id) ?? TANKS[0];
