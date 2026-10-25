# Componentes e utilitários

[← Voltar ao README](../README.md)

## Componentes (`js/components/`)

### `navbar.js`

Barra de navegação superior presente em todas as páginas internas.

```js
import { mount_navbar } from "../components/navbar.js";

const navbar = await mount_navbar();
navbar.set_balance(123.45); // atualiza o saldo exibido (com animação)
navbar.profile;             // perfil carregado: { id, username, balance, last_bonus_at }
```

**`mount_navbar()`** → `Promise<{ profile, set_balance }>`

- Busca o perfil com `get_profile()` e insere a `<nav class="navbar">` no início do `<body>`.
- Elementos:
  - **Marca** "Case Opening Simulator" (link para `home.html`).
  - **Links:** Caixas, Mercado, Inventário e Dashboard. O link da página atual recebe a classe `is_active` e `aria-current="page"`.
  - **Etiqueta "Novo":** links com `badge` exibem uma etiqueta até o usuário visitar a página pela primeira vez. A visita é salva no `localStorage` com a chave `nav_seen:<arquivo>.html`.
  - **Bônus:** visível apenas se o último resgate (`last_bonus_at`) foi há 24 horas ou mais. Ao clicar, chama `claim_bonus()`, atualiza o saldo, mostra "Resgatado" e some após 900 ms. Em caso de erro, mostra "Indisponível" e revalida o perfil com o servidor.
  - **Saldo**, **avatar** (inicial do nome) e **nome de usuário**.
  - **Logout:** chama `sign_out()` e redireciona para `login.html`.
- **Sincronização entre abas:** ao resgatar o bônus, grava a chave `navbar:bonus-claimed` no `localStorage`. As outras abas abertas escutam o evento `storage`, escondem o botão e atualizam o saldo.

Para adicionar um link à navbar, edite o array `NAV_LINKS`:

```js
const NAV_LINKS = [
  { href: "home.html", label: "Caixas" },
  { href: "market.html", label: "Mercado", badge: "Novo" },
  // ...
];
```

---

### `TrackConstructor.js`

Classe responsável pela **fita animada** (estilo roleta do CS) da página de abertura.

```js
const track = new TrackConstructor({
  container,        // elemento onde a fita será inserida
  createCard,       // (item) => HTMLElement — cria o card visual de um item
  drawItem,         // () => item — sorteia um item decorativo
  totalCards: 55,   // quantidade de cards na fita (padrão 55)
  winnerIndex: 45,  // posição do card vencedor (padrão 45)
  spinTime: "3.5s", // duração da animação (padrão "3.5s")
});

track.build_track();                    // insere a fita no container
const item = await track.spin(winner);  // gira até o item informado
```

| Método | Descrição |
| --- | --- |
| `build_track()` | Cria a estrutura (`.viewport` > `.marker` + `.track`) dentro do `container` e gera os cards iniciais. |
| `generate_cards(winner?)` | Recria os `totalCards` cards. Se `winner` for informado, ele é colocado na posição `winnerIndex`; os demais vêm de `drawItem()`. |
| `spin(winner?)` | Retorna uma `Promise` resolvida com o item vencedor quando a animação termina. Se a fita já estiver girando, resolve imediatamente com `null`. |

**Como a animação funciona:**

1. Reseta a posição (`translateX(0)`) sem transição e gera novos cards com o vencedor no índice 45.
2. Força um *reflow* (`offsetWidth`) para o navegador aplicar o reset.
3. Calcula a distância para centralizar o card vencedor sob o marcador, somando um deslocamento aleatório (*jitter*) de até ±40% da largura do card — assim a fita não para sempre exatamente no centro.
4. Aplica `transition: transform 3.5s cubic-bezier(0.15, 0, 0.10, 1)` (desaceleração suave).
5. Resolve a `Promise` no evento `transitionend` da propriedade `transform`.

---

### `resultModal.js`

Modal exibido após a abertura com os itens ganhos.

```js
const modal = create_result_modal(); // cria o modal (oculto) e anexa ao <body>

modal.open(winners, {
  cost: 12.5,                               // custo total da abertura
  on_sell: async (inventory_ids) => { ... }, // vende os itens no servidor
  on_close: () => { ... },                   // chamado ao fechar
});

modal.close();
```

- **Agrupamento:** itens com o mesmo `id` viram um único card com contador (`×3`) e a lista de `inventory_ids`.
- **Ordenação:** da raridade mais alta para a mais baixa; dentro da mesma raridade, do mais caro para o mais barato.
- **Resumo:** "N prêmios · $X" (valor total).
- **Vender tudo:** aparece quando há **2 ou mais** cards pendentes (nem vendidos, nem guardados), mostrando o valor total pendente.
- **Feedback de derrota:** se o valor total dos itens for menor que o custo, mostra a imagem `assets/result.jpeg` com a legenda "Não desista, jogue novamente :)". Se a imagem não carregar, o bloco fica oculto.
- **Fechamento:** botão "Fechar" ou tecla `Esc`. Enquanto aberto, o *scroll* da página fica travado.
- **Acessibilidade:** `role="dialog"`, `aria-modal="true"` e `aria-label="Resultado da abertura"`.

> Itens não vendidos já estão no inventário (o servidor grava todos ao abrir). "Guardar" apenas confirma visualmente a escolha.

---

### `ResultCard.js`

Card individual usado pelo modal de resultado.

```js
const card = create_result_card(group, { on_sell, on_change });
```

- `group`: `{ id, name, rarity, img, price, count, inventory_ids }`.
- Exibe imagem, contador (se `count > 1`), raridade, nome, valor total e, se agrupado, o valor unitário ("$X cada").
- Botões:
  - **Guardar** → marca o card como `is_kept` e mostra "No inventário".
  - **Vender $X** → chama `on_sell(inventory_ids)`; em caso de sucesso, marca como `is_sold` e mostra "Vendido". Em caso de erro, mostra "Erro ao vender." e reabilita os botões.
- Após qualquer ação, chama `on_change()` para o modal recalcular o botão "Vender tudo".
- Métodos expostos no elemento: `card.is_pending()` e `card.mark_sold()`.

---

## Utilitários (`js/utils/`)

### `constants.js`

```js
export const RARITIES = {
  industrial: { label: "Industrial Grade", color: "#5e98d9", chance: 65 },
  milspec:    { label: "Mil-Spec Grade",   color: "#5169f7", chance: 25 },
  restricted: { label: "Restricted",       color: "#a574ff", chance: 7 },
  classified: { label: "Classified",       color: "#e050f0", chance: 2.5 },
  covert:     { label: "Covert",           color: "#f26767", chance: 0.5 },
};
export const IMAGE_FALLBACK = "https://placehold.co/200";
export const MAX_CASES = 15;
```

- A **ordem das chaves** de `RARITIES` define a ordem de raridade (da mais comum para a mais rara) usada em ordenações e legendas em todo o projeto (`Object.keys(RARITIES)`).
- `color` é aplicado via variável CSS `--color` nos cards, linhas e barras.
- O campo `chance` não é usado pelas páginas atuais: as probabilidades reais vêm do **peso** (`weight`) de cada item na tabela `case_items`. Veja [Regras de negócio](regras-de-negocio.md).
- `MAX_CASES` limita o controle de quantidade da página de abertura.

### `format.js`

| Função | Exemplo de saída | Observação |
| --- | --- | --- |
| `format_price(valor)` | `$1,234.56` | Moeda **USD** no formato `en-US`. `null`/`undefined` viram `$0.00`. |
| `format_date(iso)` | `25/10/2026 14:30` | Data e hora curtas em `pt-BR`. |
| `format_percent(valor)` | `12,5%` | Até 2 casas decimais em `pt-BR`. |

### `guard.js`

| Função | Uso |
| --- | --- |
| `require_auth(redirect_to = "login.html")` | Retorna a sessão ou redireciona (e retorna `null`) se não houver usuário logado. |
| `redirect_if_logged_in(redirect_to = "home.html")` | Redireciona caso já exista sessão. Usado em login e cadastro. |

### `form.js`

| Função | Uso |
| --- | --- |
| `show_message(el, texto, tipo = "error")` | Mostra uma mensagem no elemento aplicando a classe `form_message is_<tipo>` (`is_error` ou `is_success`). Texto vazio oculta o elemento. |
| `set_loading(botao, carregando, texto = "Aguarde...")` | Desabilita o botão e troca o texto durante o carregamento, restaurando o texto original depois. |

### `case.js` (legado)

Versão antiga da lógica de abertura, anterior à integração com o Supabase (sorteio feito no navegador a partir de um arquivo `items.js`). **Não é importado por nenhuma página** e possui *imports* para arquivos que não existem mais. Veja [Problemas conhecidos](problemas-conhecidos.md#arquivos-legados).
