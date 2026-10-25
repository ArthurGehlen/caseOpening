# Estilos (CSS)

[← Voltar ao README](../README.md)

O projeto usa **CSS puro**, sem frameworks ou pré-processadores. Os estilos são divididos em arquivos por responsabilidade, e cada página carrega apenas o que usa.

## Organização dos arquivos

| Arquivo | Conteúdo | Usado em |
| --- | --- | --- |
| `css/base.css` | Variáveis de cor (`:root`), reset, `body`, links e botão primário (`.btn_primary`). | todas as páginas |
| `css/layout.css` | `.container`, barra de navegação (`.navbar__*`), `.page_title` e `.status`. | páginas internas |
| `css/ui.css` | Componentes visuais compartilhados: `.eyebrow`, `.hero`, `.stats`/`.stat`, `.rows`/`.row`, `.composition`, `.legend`, `.form_message`. | páginas internas |
| `css/auth.css` | Cartão de autenticação (`.auth_card`), campos (`.field`) e mensagens. | login, cadastro |
| `css/home.css` | Grade de caixas (`.tiles`, `.tile_*`). | home |
| `css/case.css` | Palco, fitas (`.viewport`, `.track`, `.marker`, `.card`), controles e lista de chances (`.odds_*`). | caixa |
| `css/result.css` | Modal e cards de resultado (`.result_*`). | caixa |
| `css/inventory.css` | *Chips*, ordenação, grade de itens (`.item_*`) e barra de ações (`.actionbar`). | inventário |
| `css/market.css` | Gráfico, *readout*, medidor (`.gauge_*`), lista do mercado (`.mk_*`), controles segmentados. | mercado |
| `css/dashboard.css` | Divisão do patrimônio (`.split`), painéis, ranking (`.rank_*`) e últimas aberturas (`.recent_*`). | dashboard |
| `style.css` *(raiz)* | **Legado** — estilos da versão antiga, não referenciado por nenhuma página. | — |

Ordem de importação recomendada em uma página interna:

```html
<link rel="stylesheet" href="../css/base.css" />
<link rel="stylesheet" href="../css/layout.css" />
<link rel="stylesheet" href="../css/ui.css" />
<link rel="stylesheet" href="../css/<pagina>.css" />
```

## Variáveis de cor

Definidas em `css/base.css` (tema escuro):

| Variável | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#14161c` | fundo da página |
| `--surface` | `#1d2029` | cartões e superfícies |
| `--surface-2` | `#2a2e3b` | superfícies secundárias, trilhos de barras |
| `--text` | `#ffffff` | texto principal |
| `--muted` | `#9aa3b5` | texto secundário |
| `--accent` | `#e4ae39` | destaque (dourado): links, botão primário |
| `--danger` | `#f26767` | erros, quedas, prejuízo |
| `--success` | `#3ba55d` | sucesso, altas, lucro, bônus |
| `--radius` | `10px` | raio de borda padrão |

Variáveis derivadas usam `color-mix()`, por exemplo `--line` em `ui.css`:

```css
--line: color-mix(in srgb, var(--text) 12%, transparent);
```

## Variáveis definidas pelo JavaScript

Vários estilos dependem de variáveis CSS aplicadas inline pelo JS com `style.setProperty`:

| Variável | Onde | Significado |
| --- | --- | --- |
| `--color` | cards, linhas, *chips* | cor da raridade do item |
| `--share` | `.composition_part`, `.split_part` | peso proporcional da fatia na barra (usado como `flex-grow`) |
| `--pct` | linhas de chances e do ranking | largura do preenchimento de fundo (ex.: `"42%"`) |
| `--i` | cards de resultado, linhas do mercado | índice usado para escalonar o atraso da animação de entrada |
| `--pos` | `.gauge_marker` | posição (0–100) do marcador na faixa de mercado |
| `--tone` | `.legend_item` | cor do marcador da legenda |

Exemplo — barra de composição:

```css
.composition_part {
  flex: var(--share, 0) 1 0;
  background: var(--color);
}
```

```js
part.style.setProperty("--share", 65);       // 65% de chance
part.style.setProperty("--color", "#5e98d9"); // cor da raridade
```

## Convenções

- **Nomes de classes em `snake_case`** (`.result_card`, `.tile_name`). A navbar é a exceção, usando BEM (`.navbar__link`).
- **Estados com prefixo `is_`**: `.is_active`, `.is_sold`, `.is_kept`, `.is_selected`, `.is_up`, `.is_down`, `.is_flat`, `.is_error`, `.is_success`, `.is_updated`.
- **Estados de acessibilidade** também guiam o estilo: `[aria-pressed="true"]` em *chips* e botões segmentados, `[hidden]` para ocultar elementos.
- **Responsividade sem *media queries*:** o layout se adapta com `clamp()`, `min()`, `grid` com `auto-fit`/`minmax()` e `flex-wrap`. Exemplo:

  ```css
  .container {
    width: min(100% - 2 * var(--page-pad, 1rem), 72rem);
    margin-inline: auto;
  }
  ```

- **iPhone / *notch*:** as páginas usam `viewport-fit=cover` na meta tag `viewport`.
- **Movimento reduzido:** no mercado, a classe `.reduce_motion` no `<html>` desativa as animações quando o sistema pede menos movimento.
- **Números tabulares** (`font-variant-numeric: tabular-nums`) em valores para evitar "pulos" de largura.
- **Fonte:** `"Inter", system-ui, sans-serif`. A fonte Inter não é importada; se não estiver instalada no sistema, usa-se a fonte padrão do sistema.
