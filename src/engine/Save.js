/* =========================================================================
   Save.js
   Persistência do PERFIL do jogador no LocalStorage. Guarda o dinheiro
   (que agora acumula entre partidas) e o que foi comprado na loja: brocas,
   e os cenários. Falha de forma silenciosa se o navegador
   bloquear o armazenamento (ex.: modo privativo).
   ========================================================================= */

import { SAVE_KEY } from "../config/Constants.js";

/** Perfil novo (zerado). Função para sempre devolver arrays próprios. */
function defaultProfile() {
  return {
    money: 0,
    barris: 0,            // petróleo coletado (matéria-prima da refinaria)
    gemas: 0,             // esmeraldas coletadas
    drill: "iron",
    ownedDrills: ["iron"],
    scenario: "desert",
    ownedScenarios: ["desert"],
    fuelTank: "std",
    ownedTanks: ["std"],
    crafted: {},          // { idMaterial: quantidade já fabricada }
  };
}

export const Save = {
  load() {
    const base = defaultProfile();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      const data = JSON.parse(raw);
      // Mescla com o padrão para tolerar saves antigos/incompletos.
      return {
        ...base,
        ...data,
        ownedDrills: Array.isArray(data.ownedDrills) ? data.ownedDrills : base.ownedDrills,
        ownedScenarios: Array.isArray(data.ownedScenarios) ? data.ownedScenarios : base.ownedScenarios,
        ownedTanks: Array.isArray(data.ownedTanks) ? data.ownedTanks : base.ownedTanks,
        crafted: (data.crafted && typeof data.crafted === "object") ? data.crafted : base.crafted,
      };
    } catch {
      return base;
    }
  },

  save(profile) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
    } catch {
      /* armazenamento indisponível — segue sem persistir */
    }
  },
};
