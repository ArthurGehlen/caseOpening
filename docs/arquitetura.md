# Arquitetura

[← Voltar ao README](../README.md)

## Visão geral

O **Case Opening Simulator** é uma aplicação *front-end* estática (sem etapa de build) que usa o **Supabase** como *Backend as a Service*. Toda a lógica sensível — sorteio dos itens, débito do saldo, venda de itens, bônus diário e ranking — é executada **no servidor**, por meio de funções RPC do PostgreSQL. O navegador é responsável apenas por exibir os dados e animar os resultados.

```text
┌──────────────────────────── Navegador ────────────────────────────┐
│                                                                    │
│  pages/*.html ──► js/pages/*.js  (controlador de cada tela)        │
│                        │                                           │
│          ┌─────────────┼──────────────┐                            │
│          ▼             ▼              ▼                            │
│   js/components/   js/utils/     js/services/  (acesso a dados)    │
│                                       │                            │
│                               js/supabaseClient.js                 │
└───────────────────────────────────────┼────────────────────────────┘
                                        │ HTTPS (supabase-js)
┌───────────────────────────────────────▼────────────────────────────┐
│                             Supabase                               │
│   Auth  ·  Tabelas (cases, items, inventory, ...)  ·  Views         │
│   Funções RPC (open_cases, sell_items, claim_bonus, ...)            │
│   Row Level Security (RLS) por usuário                              │
└────────────────────────────────────────────────────────────────────┘
```

## Camadas do front-end

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| **Páginas (HTML)** | `pages/` | Estrutura estática de cada tela, com elementos identificados por `id` que serão preenchidos pelo JavaScript. |
| **Controladores** | `js/pages/` | Um módulo por página. Verifica a sessão, monta a navbar, busca os dados nos serviços, renderiza a interface e registra os eventos. |
| **Componentes** | `js/components/` | Peças de interface reutilizáveis: barra de navegação, fita animada, modal e card de resultado. |
| **Serviços** | `js/services/` | Única camada que conversa com o Supabase. Converte as respostas para objetos simples (por exemplo, transforma `numeric` em `Number`). |
| **Utilitários** | `js/utils/` | Constantes (raridades), formatação de valores, guardas de rota e helpers de formulário. |
| **Cliente Supabase** | `js/supabaseClient.js` | Cria e exporta uma instância única do cliente `supabase-js`. |

### Regras de dependência

- Os **controladores** podem importar componentes, serviços e utilitários.
- Os **componentes** podem importar serviços (caso da `navbar`) e utilitários.
- Os **serviços** importam apenas o `supabaseClient.js`.
- Os **utilitários** não dependem de nenhuma outra camada (exceto `guard.js`, que usa o `authService`).

Isso mantém o acesso ao banco concentrado em `js/services/`, facilitando trocar ou ajustar consultas sem mexer na interface.

## Fluxo de navegação

```text
index.html
   │  (verifica a sessão)
   ├── sem sessão ──► login.html ◄──► signup.html
   │                      │ login/cadastro com sucesso
   └── com sessão ──────► home.html (Catálogo de caixas)
                              │
          ┌───────────────────┼───────────────────┬─────────────────┐
          ▼                   ▼                   ▼                 ▼
   case.html?id=…       market.html        inventory.html     dashboard.html
   (abrir caixa)        (mercado)          (inventário)       (estatísticas)
```

- **Guardas de rota** (`js/utils/guard.js`):
  - `require_auth()` — usado nas páginas internas; se não houver sessão, redireciona para `login.html`.
  - `redirect_if_logged_in()` — usado em login e cadastro; se já houver sessão, redireciona para `home.html`.
- A **navbar** (presente em todas as páginas internas) dá acesso a Caixas, Mercado, Inventário e Dashboard, além do bônus diário, do saldo e do logout.

## Ciclo de vida de uma página interna

Todas as páginas internas seguem o mesmo padrão, aproveitando o *top-level await* dos ES Modules:

```js
const session = await require_auth();      // 1. Garante que há usuário logado
if (!session) throw new Error("Sem sessão"); //   (interrompe o script se redirecionou)

const navbar = await mount_navbar();        // 2. Monta a barra de navegação (busca o perfil)

try {
  const dados = await algum_servico();      // 3. Busca os dados
  renderizar(dados);                        // 4. Renderiza a interface
} catch (err) {
  console.error(err);
  mostrar_mensagem_de_erro();               // 5. Exibe erro amigável
}
```

A renderização é feita com DOM puro (`document.createElement`, `replaceChildren`), geralmente por meio de um pequeno helper `el(tag, classe, texto)` definido em cada módulo. O texto é sempre atribuído via `textContent`, o que evita injeção de HTML.

## Fluxo de abertura de uma caixa

```text
Usuário clica em "Abrir caixa"
        │
        ▼
case.js → caseService.open_cases(case_id, quantidade)
        │
        ▼  RPC no Supabase
open_cases: valida saldo, debita, sorteia os itens pelos pesos,
            grava em inventory/openings e devolve { items, balance }
        │
        ▼
case.js: atualiza o saldo na navbar
         escolhe os N melhores itens (N = nº de fitas, máx. 3)
         anima as fitas (TrackConstructor.spin) até o item sorteado
         dispara o confete
         abre o modal de resultado (resultModal)
        │
        ▼
Usuário guarda ou vende (inventoryService.sell_items)
```

> **Importante:** a animação é apenas visual. O resultado já foi definido pelo servidor antes de a fita começar a girar; o front-end só posiciona o item sorteado no índice vencedor da fita.

## Dependências externas

| Biblioteca | Como é carregada | Onde é usada |
| --- | --- | --- |
| `@supabase/supabase-js@2` | `import` de `https://esm.sh/@supabase/supabase-js@2` | `js/supabaseClient.js` |
| `canvas-confetti@1.9.3` | `<script>` do jsDelivr (variável global `confetti`) | `pages/case.html` |
| `lightweight-charts@4.2.0` | `<script>` do jsDelivr (variável global `LightweightCharts`) | `pages/market.html` |

Os scripts tratam a ausência dessas bibliotecas: sem `confetti` o efeito simplesmente não aparece, e sem `LightweightCharts` o mercado mostra a mensagem "Gráfico indisponível".
