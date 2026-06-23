/* =========================================================================
   Save.js
   Persistência do PERFIL do jogador no LocalStorage. Guarda o dinheiro
   (que agora acumula entre partidas) e o que foi comprado na loja: brocas,
   cenários e o detector de bombas. Falha de forma silenciosa se o navegador
   bloquear o armazenamento (ex.: modo privativo).
   ========================================================================= */

import { SAVE_KEY } from "../config/Constants.js";

/** Perfil novo (zerado). Função para sempre devolver arrays próprios. */
function defaultProfile() {
  return {
    money: 0,
    drill: "iron",
    ownedDrills: ["iron"],
    scenario: "desert",
    ownedScenarios: ["desert"],
    bombDetector: false,
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
