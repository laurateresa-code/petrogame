/* =========================================================================
   Shop.js
   Catálogo da LOJA: brocas, cenários e o detector de bombas. Cada item tem
   id, nome, descrição, preço e o efeito que aplica no jogo. Centralizar aqui
   facilita balancear preços e adicionar novos itens sem mexer na lógica.
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

/** Detector de bombas: item único e mais caro; revela as bombas no mapa. */
export const DETECTOR = Object.freeze({
  id: "detector",
  name: "Detector de Bombas",
  desc: "revela onde as bombas estão escondidas",
  price: 4000,
});

/** Acha um item por id com fallback no primeiro (padrão). */
export const findDrill = (id) => DRILLS.find((d) => d.id === id) ?? DRILLS[0];
export const findScenario = (id) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
