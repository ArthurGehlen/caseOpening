# Problemas conhecidos e melhorias sugeridas

[← Voltar ao README](../README.md)

Pontos identificados durante a análise do código. Nenhum deles foi alterado nesta documentação — servem como referência para futuras correções.

## Redirecionamento do `index.html`

`js/pages/index.js` redireciona para `home.html` ou `login.html` com caminho relativo. Como o `index.html` fica na raiz, o navegador vai para `/home.html` e `/login.html`, que **não existem** (as páginas estão em `/pages/`). No site publicado, `/home.html` retorna 404.

**Sugestão:** usar `pages/home.html` e `pages/login.html` em `index.js`, ou configurar *rewrites* na Vercel.

## Imagem de feedback do modal de resultado

`js/components/resultModal.js` usa `./assets/result.jpeg`. Como o caminho é resolvido a partir de `pages/case.html`, o navegador procura `/pages/assets/result.jpeg`, que não existe. O erro é tratado (o bloco fica oculto), então a imagem de "derrota" **não aparece**.

**Sugestão:** usar `../assets/result.jpeg`.

## Imagens de *fallback* inexistentes

Os controladores usam `./img/placeholder.png` (e `./img/cases/placeholder.png` na home) como imagem reserva, mas a pasta `img/` não existe no repositório. Se a imagem original de um item falhar, a reserva também falha (o *listener* usa `once: true`, então não há laço infinito, mas a imagem fica quebrada).

**Sugestão:** usar a constante `IMAGE_FALLBACK` já definida em `js/utils/constants.js` (`https://placehold.co/200`) ou adicionar o arquivo ao repositório.

## Arquivos legados

- **`js/utils/case.js`** — lógica antiga de abertura (sorteio no navegador). Não é importado por nenhuma página e importa arquivos inexistentes (`./js/items.js`, etc.).
- **`style.css`** (raiz) — estilos da versão antiga, não referenciados por nenhuma página.

**Sugestão:** remover os dois arquivos.

## Moeda inconsistente

`format_price` formata em **dólar** (`en-US`/`USD`), mas os valores iniciais escritos no HTML do inventário e do dashboard são `R$ 0,00`. Durante o carregamento aparece "R$" e depois "$".

**Sugestão:** escolher uma moeda única e usar o mesmo formato nos *placeholders* do HTML.

## Duplicação de código

Os helpers `el()` e `$()`, as constantes `IMAGE_FALLBACK` e `RARITY_ORDER` e funções de ordenação são redefinidos em vários módulos.

**Sugestão:** centralizar em `js/utils/` (por exemplo, `js/utils/dom.js`).

## Favicon ausente no mercado

`pages/market.html` não declara o `<link rel="shortcut icon">` que as outras páginas usam.

## Esquema do banco fora do repositório

Tabelas, *views*, funções RPC e políticas de RLS existem apenas no projeto Supabase. Isso dificulta recriar o ambiente e revisar mudanças.

**Sugestão:** versionar o esquema com a [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase/migrations/`). Veja o levantamento atual em [Banco de dados](banco-de-dados.md).

## Fonte não carregada

A família `"Inter"` é declarada em `base.css`, mas não é importada (nem via Google Fonts, nem localmente). Em sistemas sem a fonte instalada, é usada a fonte padrão do sistema.

## Testes automatizados

Não há testes. Funções puras como os cálculos do mercado (`build_index`, `change_over`, `slice_range`) e as estatísticas das caixas são boas candidatas a testes unitários.
