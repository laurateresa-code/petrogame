# 🛢️ Caça ao Petróleo

Jogo 2D de exploração e gestão: comande uma empresa de perfuração, decida
onde cavar, encontre petróleo e invista em melhores equipamentos.

Feito **100% com HTML, CSS, JavaScript e Canvas API** — sem frameworks, sem
bibliotecas, sem engines.

---

## ▶️ Como executar

O jogo usa **módulos ES (`import`/`export`)**, que **não funcionam abrindo o
`index.html` direto** (`file://`) por restrições de segurança do navegador.
Rode um servidor local simples na pasta do projeto:

**Opção 1 — VS Code:** instale a extensão *Live Server* e clique em
"Go Live".

**Opção 2 — Python (já vem no Windows/macOS):**
```bash
python -m http.server 8080
```
Depois acesse: <http://localhost:8080>

**Opção 3 — Node:**
```bash
npx serve
```

---

## 🗂️ Estrutura de pastas

```
Caça Petróleo/
├── index.html          # Casca: canvas + carrega src/main.js
├── css/style.css       # Apenas o "shell" visual (UI é desenhada no canvas)
├── README.md
└── src/
    ├── main.js         # Ponto de entrada
    ├── config/         # Constantes e balanceamento
    │   ├── Constants.js
    │   └── GameConfig.js
    ├── engine/         # Núcleo reutilizável (não conhece regras do jogo)
    │   ├── Game.js         # Monta e orquestra tudo
    │   ├── Canvas.js       # Canvas + escala/resolução lógica
    │   ├── Input.js        # Teclado e mouse
    │   ├── Time.js         # deltaTime + FPS
    │   ├── Camera.js       # Câmera 2D + screen shake
    │   └── GameLoop.js     # Laço update/render
    ├── states/         # Máquina de estados (telas do jogo)
    │   ├── State.js        # Classe base
    │   ├── StateMachine.js
    │   ├── BootState.js
    │   ├── MenuState.js
    │   └── PlayState.js
    ├── ui/             # Componentes de interface reutilizáveis
    │   └── Painter.js
    └── utils/          # Funções puras
        └── MathUtils.js
```

> Pastas como `entities/`, `systems/`, `managers/`, `effects/`, `audio/` e
> `save/` serão criadas nas etapas em que forem necessárias — evitamos pastas
> vazias até haver conteúdo real.

---

## 🏗️ Arquitetura (visão geral)

- **Engine** não conhece as regras do jogo; expõe serviços (canvas, input,
  tempo, câmera, laço).
- **StateMachine** troca entre telas (`Menu`, `Play`, …) chamando
  `enter/exit/update/render`. Estados não se conhecem entre si.
- **`Game`** é o ponto central que injeta os serviços nos estados.
- **Configuração** centralizada: `Constants.js` (imutável) e
  `GameConfig.js` (balanceamento ajustável).
- **Sem números mágicos** espalhados; **uma responsabilidade por arquivo**.

### Controles atuais
- **Enter / clique em JOGAR** → inicia
- **Esc** → volta ao menu
- **F3** → liga/desliga o modo debug (FPS, estado atual)

---

## 🧩 Como estender (preenchido conforme as etapas avançam)

- **Novo estado/tela:** crie `src/states/XxxState.js` estendendo `State` e
  registre-o em `Game._registerStates()`.
- **Novos blocos / upgrades / fases / sons / sprites:** seções detalhadas
  serão adicionadas aqui nas Etapas 5, 11, 12 e 13.

---

## 🚧 Status do desenvolvimento

- [x] **Etapa 1** — Estrutura do projeto
- [x] **Etapa 2** — Engine (Canvas, Input, Time, Camera)
- [x] **Etapa 3** — Game Loop
- [x] **Etapa 4** — Sistema de estados
- [ ] Etapa 5 — Mapa · Etapa 6 — Jogador · Etapa 7 — Perfuração · …
