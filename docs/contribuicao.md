# Guia de contribuição

[← Voltar ao README](../README.md)

## Ambiente

Não há dependências nem build. Basta um editor e um servidor estático (veja [Como executar localmente](../README.md#como-executar-localmente)). Recomenda-se o VS Code com a extensão **Live Server** e o **Prettier** para manter a formatação.

## Convenções de código

### JavaScript

- **ES Modules** nativos, sempre com a extensão no caminho: `import { x } from "../utils/format.js";`.
- **`snake_case`** para funções e variáveis (`list_cases`, `render_header`, `case_items`); **`UPPER_SNAKE_CASE`** para constantes (`MAX_CASES`, `RARITY_ORDER`); **`PascalCase`** apenas para classes (`TrackConstructor`).
- *Top-level await* nos controladores de página.
- Renderização com DOM puro: crie elementos com o helper `el(tag, classe, texto)` e use `textContent` (nunca `innerHTML` com dados vindos do banco).
- Selecione elementos por `id` com o atalho `const $ = (id) => document.getElementById(id);`.
- Consultas ao Supabase **somente** dentro de `js/services/`.
- Trate erros com `try/catch`, registre com `console.error` e mostre uma mensagem amigável ao usuário.
- Imagens devem ter *fallback* em caso de erro:

  ```js
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), { once: true });
  ```

- Comentários curtos e em português, apenas quando explicam o "porquê".

### HTML

- `lang="pt-BR"` e a meta `viewport` com `viewport-fit=cover`.
- Elementos que o JS preenche têm `id` em `snake_case`.
- Mensagens de erro usam `<p id="message" class="form_message is_error" role="alert" hidden>`.

### CSS

Veja [Estilos](estilos.md#convenções).

### Textos da interface

Toda a interface é em **português do Brasil**. Os nomes das raridades seguem os nomes originais do CS (*Industrial Grade*, *Covert* etc.).

## Commits

O histórico segue o padrão **Conventional Commits** com a descrição em português, no imperativo/presente do indicativo:

```text
feat: Adiciona o mercado
fix: Corrige o path do favicon
```

| Prefixo | Quando usar |
| --- | --- |
| `feat:` | nova funcionalidade ou redesign de tela |
| `fix:` | correção de bug ou pequeno ajuste |
| `docs:` | documentação |
| `refactor:` | mudança interna sem alterar comportamento |

## Passo a passo: adicionar uma nova página

1. **HTML** — crie `pages/minha_pagina.html` a partir de uma página interna existente, importando `base.css`, `layout.css`, `ui.css` e o CSS próprio, além do script:

   ```html
   <script type="module" src="../js/pages/minha_pagina.js"></script>
   ```

2. **Controlador** — crie `js/pages/minha_pagina.js`:

   ```js
   import { require_auth } from "../utils/guard.js";
   import { mount_navbar } from "../components/navbar.js";

   const session = await require_auth();
   if (!session) throw new Error("Sem sessão");

   const navbar = await mount_navbar();

   try {
     // buscar dados nos serviços e renderizar
   } catch (err) {
     console.error(err);
     // mostrar mensagem de erro
   }
   ```

3. **CSS** — crie `css/minha_pagina.css` usando as variáveis de `base.css`.
4. **Navbar** — adicione o link em `NAV_LINKS` (`js/components/navbar.js`). Use `badge: "Novo"` para destacar a novidade.

## Passo a passo: adicionar uma consulta ao banco

1. Crie (ou edite) um arquivo em `js/services/`.
2. Use o cliente de `../supabaseClient.js`, lance o erro e normalize os dados:

   ```js
   import { supabase } from "../supabaseClient.js";

   export async function list_algo() {
     const { data, error } = await supabase.from("tabela").select("id, price");
     if (error) throw error;
     return data.map((row) => ({ ...row, price: Number(row.price) }));
   }
   ```

3. Operações que alteram saldo ou inventário devem ser **funções RPC** no Supabase, nunca `insert`/`update` direto do cliente.

## Passo a passo: adicionar uma caixa ou item

Caixas e itens vivem no banco, não no código:

1. Cadastre o item em `items` (com `rarity` igual a uma das chaves de `RARITIES`, `price` e `base_price`).
2. Cadastre a caixa em `cases`.
3. Relacione-os em `case_items` com o `weight` desejado (veja [Probabilidades por peso](regras-de-negocio.md#probabilidades-por-peso)).

Nenhuma alteração no front-end é necessária — a caixa aparece automaticamente no catálogo.

## Testes manuais (checklist)

Não há testes automatizados. Antes de publicar, verifique:

- [ ] Cadastro, login e logout.
- [ ] Acessar uma página interna deslogado redireciona para o login.
- [ ] Abrir 1, 3 e 15 caixas; conferir saldo, animação e modal.
- [ ] Vender um item pelo modal e usar "Vender tudo".
- [ ] Vender itens no inventário (individual e em lote).
- [ ] Mercado: trocar período, intervalo do gráfico, filtros e selecionar itens.
- [ ] Dashboard: valores, ranking e últimas aberturas.
- [ ] Bônus diário (quando disponível).
- [ ] Layout no celular.

## Implantação

O site é hospedado na **Vercel** como site estático, em [case-oppening.vercel.app](https://case-oppening.vercel.app). Não há comando de build nem diretório de saída — a Vercel serve os arquivos como estão. Como os caminhos são relativos, as páginas ficam em `/pages/*.html`.
