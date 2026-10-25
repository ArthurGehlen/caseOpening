# Páginas

[← Voltar ao README](../README.md)

Cada tela é composta por um arquivo HTML em `pages/` e um controlador em `js/pages/`. Este documento descreve o comportamento de cada uma.

- [`index.html` — Ponto de entrada](#indexhtml--ponto-de-entrada)
- [Login](#login--pagesloginhtml)
- [Cadastro](#cadastro--pagessignuphtml)
- [Catálogo de caixas (Home)](#catálogo-de-caixas--pageshomehtml)
- [Abertura de caixa](#abertura-de-caixa--pagescasehtml)
- [Inventário](#inventário--pagesinventoryhtml)
- [Mercado](#mercado--pagesmarkethtml)
- [Dashboard](#dashboard--pagesdashboardhtml)

---

## `index.html` — Ponto de entrada

**Script:** `js/pages/index.js`

Página sem conteúdo visual. Consulta a sessão com `get_session()` e redireciona:

- com sessão → `home.html`
- sem sessão → `login.html`

> Veja [Problemas conhecidos](problemas-conhecidos.md#redirecionamento-do-indexhtml) sobre o caminho do redirecionamento.

---

## Login — `pages/login.html`

**Script:** `js/pages/login.js` · **CSS:** `base.css`, `auth.css`

- Se o usuário já estiver logado, é redirecionado para `home.html` (`redirect_if_logged_in`).
- Formulário com **e-mail** e **senha**.
- Ao enviar:
  1. Limpa mensagens anteriores e coloca o botão em estado de carregamento ("Entrando...").
  2. Chama `sign_in({ email, password })`.
  3. Sucesso → `home.html`. Erro → exibe a mensagem amigável traduzida pelo `authService` (ex.: "E-mail ou senha incorretos.").
- Link para a página de cadastro.

---

## Cadastro — `pages/signup.html`

**Script:** `js/pages/signup.js` · **CSS:** `base.css`, `auth.css`

Campos e validações (HTML5):

| Campo | Regras |
| --- | --- |
| Nome de usuário | obrigatório, 3 a 20 caracteres |
| E-mail | obrigatório, formato de e-mail |
| Senha | obrigatória, mínimo 6 caracteres |
| Confirmar senha | obrigatória, mínimo 6 caracteres, deve ser igual à senha (validado no JS) |

Ao enviar, chama `sign_up({ email, password, username })`. O nome de usuário vai nos metadados do usuário (`options.data.username`), de onde o banco cria o perfil.

- Se o Supabase devolver uma sessão (confirmação de e-mail desligada) → redireciona para `home.html`.
- Caso contrário (confirmação de e-mail ligada) → mostra "Conta criada! Confira seu e-mail para confirmar o cadastro." e limpa o formulário.

---

## Catálogo de caixas — `pages/home.html`

**Script:** `js/pages/home.js` · **CSS:** `base.css`, `layout.css`, `ui.css`, `home.css`

Exige login e monta a navbar. Busca as caixas com `list_cases()` (ordenadas por preço crescente) e descarta caixas sem itens.

Para cada caixa é criado um *tile* (link para `case.html?id=<id>`) com:

- imagem da caixa;
- nome e preço;
- **barra de composição** — fatia proporcional à probabilidade de cada raridade;
- **Melhor prêmio** — preço do item mais caro da caixa;
- **Chance de lucro** — probabilidade de tirar um item que valha pelo menos o preço da caixa.

O subtítulo mostra quantas caixas estão disponíveis. Mensagens de estado: "Carregando...", "Nenhuma caixa disponível." e "Erro ao carregar as caixas.".

Os cálculos estão detalhados em [Regras de negócio](regras-de-negocio.md#estatísticas-de-uma-caixa).

---

## Abertura de caixa — `pages/case.html`

**Script:** `js/pages/case.js` · **CSS:** `base.css`, `layout.css`, `ui.css`, `case.css`, `result.css`
**Bibliotecas:** `canvas-confetti`

URL: `case.html?id=<id da caixa>`. Sem `id`, ou se a caixa não existir/não tiver itens, exibe "Caixa não encontrada." e desabilita os controles.

### Cabeçalho

Nome da caixa (também usado como título da aba) e quatro estatísticas: **Preço**, **Melhor prêmio**, **Chance de lucro** e **Itens** (quantidade de itens distintos).

### Palco (área de abertura)

- **Fitas animadas:** uma por caixa aberta, até o máximo de **3** (`MAX_TRACKS`). As fitas só são recriadas quando a quantidade de fitas muda.
- **Quantidade:** controle deslizante de 1 a **15** (`MAX_CASES`).
- **Total:** preço da caixa × quantidade.
- **Botão:** "Abrir caixa" ou "Abrir N caixas".
- Ao abrir mais de 3 caixas, aparece o aviso: "As fitas mostram os 3 melhores prêmios. Todos aparecem no resultado."

Os cards "decorativos" das fitas são sorteados no navegador respeitando os pesos reais dos itens (`draw_decor_item`), para que a fita pareça fiel às probabilidades.

### Ao clicar em abrir (`handle_spin`)

1. Desabilita o botão e o controle de quantidade.
2. Chama `open_cases(case_id, quantidade)` — o servidor debita o saldo e sorteia os itens.
3. Atualiza o saldo na navbar com o valor devolvido.
4. Ordena os itens ganhos por preço e entrega os N mais caros às N fitas.
5. Aguarda todas as fitas pararem (`Promise.all`).
6. Dispara o confete — mais intenso (200 partículas) se houver item *Classified* ou *Covert*.
7. Abre o [modal de resultado](componentes.md#resultmodaljs) com:
   - `cost`: custo total da abertura (usado para mostrar o feedback de "derrota");
   - `on_sell`: vende os itens via `sell_items` e atualiza o saldo;
   - `on_close`: reabilita os controles.

Em caso de erro (ex.: saldo insuficiente), a mensagem do servidor é exibida no topo da página.

### Probabilidades

Abaixo do palco, a seção de chances mostra:

- barra de composição e legenda com a probabilidade total de cada raridade;
- lista de todos os itens (da raridade mais alta para a mais baixa, e do mais caro para o mais barato), com imagem, nome, raridade, preço e chance individual. A barra lateral de cada linha é proporcional ao peso do item em relação ao mais comum.

---

## Inventário — `pages/inventory.html`

**Script:** `js/pages/inventory.js` · **CSS:** `base.css`, `layout.css`, `ui.css`, `inventory.css`

### Resumo (topo)

- **Valor do inventário:** soma dos preços atuais de todos os itens.
- Quantidade de itens.
- Barra de composição proporcional ao **valor** de cada raridade (com *tooltip* mostrando o valor).

### Filtros e ordenação

- *Chips* de raridade com contador ("Todos" + cada raridade). Raridades sem itens ficam ocultas, exceto a que estiver selecionada.
- Ordenação: **Mais recentes** (padrão), **Maior valor**, **Menor valor**, **Raridade**.

### Grade de itens

Cada item exibe imagem, raridade, nome, data de obtenção, preço, uma caixa de seleção e o botão **Vender**.

### Venda

- **Individual:** botão "Vender" do card → `sell_item(inventory_id)`.
- **Em lote:** selecione itens (ou use "Selecionar visíveis") e clique em "Vender $X" na barra de ações. Uma confirmação (`confirm`) é exibida antes da venda → `sell_items(ids)`.
- Após vender, o saldo da navbar é atualizado e os itens saem da lista sem recarregar a página. Se a raridade filtrada ficar vazia, o filtro volta para "Todos".

Mensagens: "Seu inventário está vazio. Abra algumas caixas.", "Nenhum item nesta raridade.", e mensagens de erro de venda.

---

## Mercado — `pages/market.html`

**Script:** `js/pages/market.js` · **CSS:** `base.css`, `layout.css`, `ui.css`, `market.css`
**Bibliotecas:** `lightweight-charts`

O mercado mostra a evolução dos preços dos itens. Ao carregar, busca em paralelo:

- todos os itens (`list_market_items`) com preço atual e **preço âncora** (`base_price`);
- o histórico de preços dos últimos **90 dias** (`list_price_history`);
- em quais caixas cada item aparece (`list_item_cases`; se falhar, segue sem essa informação).

### Seções

| Seção | Descrição |
| --- | --- |
| **Índice do mercado** | Valor atual do índice (base 100) com animação de contagem, variação em 24h, número de itens e horário da última atualização. |
| **Amplitude** | Barra e legenda com quantos itens estão **Em alta**, **Estáveis** ou **Em queda** nas últimas 24h. |
| **Destaques** | Maior alta (24h), maior queda (24h), item mais caro e variação média (24h). |
| **Detalhe / gráfico** | Gráfico de área do índice ou do item selecionado, com linha tracejada de referência ("base" = 100 para o índice, "âncora" = `base_price` para um item). Intervalos de **7D**, **30D** (padrão) e **90D**. Ao passar o mouse, o painel mostra o valor, a data e a variação no período. |
| **Estatísticas do detalhe** | Item: preço atual, âncora, mínimo e máximo do período. Índice: valor atual, mínimo e máximo. |
| **Faixa de mercado** | Só para itens: posição do preço atual entre −20% e +20% da âncora. |
| **Disponível em** | Links para as caixas em que o item pode ser obtido. |
| **Lista de itens** | Busca por nome, *chips* de raridade, período da variação (**24h**, **7d**, **30d**) e ordenação (Maior alta, Maior queda, Maior preço, Menor preço, Raridade, Nome). Cada linha tem um *sparkline* SVG, o preço atual e a variação. |

### Interação

- Clicar em um item o seleciona (e rola até o gráfico, se necessário); clicar novamente ou em "Ver índice" volta ao índice.
- O item selecionado fica salvo no *hash* da URL (`market.html#<id>`), permitindo compartilhar o link.
- Respeita a preferência do sistema **"reduzir movimento"** (`prefers-reduced-motion`), desativando animações.
- O gráfico não captura rolagem nem zoom, para não atrapalhar o *scroll* no celular.

Os cálculos do índice e das variações estão em [Regras de negócio](regras-de-negocio.md#mercado).

---

## Dashboard — `pages/dashboard.html`

**Script:** `js/pages/dashboard.js` · **CSS:** `base.css`, `layout.css`, `ui.css`, `dashboard.css`

Busca em paralelo as estatísticas do usuário (`get_dashboard_stats`), o ranking (`get_leaderboard(10)`) e as últimas aberturas (`list_recent_openings(6)`).

| Seção | Conteúdo |
| --- | --- |
| **Saldo Total** | Patrimônio = saldo + valor do inventário, com barra dividindo as duas partes. |
| **Estatísticas** | Caixas abertas, total gasto, média gasta por caixa e itens guardados. |
| **Ranking** | Top 10 por saldo. A linha do usuário recebe a etiqueta "você"; se ele estiver fora do top, aparece depois de um separador indicando o salto de posições. A barra de cada linha é proporcional ao maior saldo. |
| **Últimas aberturas** | Item obtido, raridade, data e o resultado da abertura (preço do item − custo), em verde (lucro) ou vermelho (prejuízo). |
