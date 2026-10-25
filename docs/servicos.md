# Serviços (camada de dados)

[← Voltar ao README](../README.md)

Os módulos em `js/services/` são a **única** parte do front-end que conversa com o Supabase. Todos usam a instância exportada por `js/supabaseClient.js`:

```js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://<projeto>.supabase.co";
const SUPABASE_KEY = "<chave publicável>";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
```

> A chave usada é a **chave publicável** (*publishable/anon key*), que pode ficar exposta no navegador. A segurança dos dados depende das políticas de **Row Level Security (RLS)** e das funções RPC no banco.

### Convenções

- Todas as funções são `async`.
- Em caso de erro do Supabase, a função **lança** o erro (`throw error`); quem chama deve tratar com `try/catch`.
- Colunas do tipo `numeric` do PostgreSQL chegam como *string* e são convertidas com `Number(...)`.
- Relações são achatadas para objetos simples sempre que possível.

---

## `authService.js`

| Função | Parâmetros | Retorno | Descrição |
| --- | --- | --- | --- |
| `sign_up` | `{ email, password, username }` | `{ user, session }` | Cria a conta. O `username` vai em `options.data` (metadados do usuário). |
| `sign_in` | `{ email, password }` | `{ user, session }` | Login com e-mail e senha. |
| `sign_out` | — | — | Encerra a sessão. |
| `get_session` | — | `Session \| null` | Sessão atual (lida do armazenamento local do supabase-js). |

**Tradução de erros:** `sign_up`, `sign_in` e `sign_out` convertem o código de erro do Supabase em uma mensagem em português. O erro original fica em `err.original`.

| Código | Mensagem |
| --- | --- |
| `invalid_credentials` | E-mail ou senha incorretos. |
| `user_already_exists` / `email_exists` | Já existe uma conta com esse e-mail. |
| `weak_password` | Senha fraca. Use pelo menos 6 caracteres. |
| `email_not_confirmed` | Confirme seu e-mail antes de entrar. |
| `over_request_rate_limit` | Muitas tentativas. Aguarde um pouco. |
| `over_email_send_rate_limit` | Muitos e-mails enviados. Aguarde um pouco. |
| `validation_failed` | Dados inválidos. Confira os campos. |
| *(outros)* | Algo deu errado. Tente novamente. |

---

## `profileService.js`

| Função | Retorno | Descrição |
| --- | --- | --- |
| `get_profile()` | `{ id, username, balance, last_bonus_at }` | Perfil do usuário logado (tabela `profiles`, uma linha via RLS). |
| `claim_bonus()` | `number` (novo saldo) | RPC `claim_bonus`: resgata o bônus diário. |

---

## `caseService.js`

| Função | Parâmetros | Retorno |
| --- | --- | --- |
| `list_cases()` | — | `Array<{ id, name, img, price, items: Array<{ weight, rarity, price }> }>` |
| `get_case(id)` | `id` da caixa | `{ id, name, img, price }` |
| `list_case_items(case_id)` | `id` da caixa | `Array<{ id, name, rarity, img, price, weight }>` |
| `open_cases(case_id, quantity)` | `id` da caixa e quantidade | `{ items, balance }` (RPC `open_cases`) |

Detalhes:

- **`list_cases`** ordena por preço crescente e ignora itens com peso `0` — os dados retornados bastam para calcular melhor prêmio, chance de lucro e composição sem consultas extras.
- **`list_case_items`** retorna apenas itens com `weight > 0`.
- **`open_cases`** chama a RPC com `{ p_case_id, p_quantity }`. O retorno esperado é:

  ```js
  {
    items: [
      { inventory_id, id, name, rarity, img, price }, // um por caixa aberta
      // ...
    ],
    balance: 87.5, // saldo após o débito
  }
  ```

---

## `inventoryService.js`

| Função | Parâmetros | Retorno | Descrição |
| --- | --- | --- | --- |
| `list_inventory()` | — | `Array<{ inventory_id, obtained_at, id, name, rarity, img, price }>` | Itens do usuário, do mais recente para o mais antigo. |
| `sell_item(inventory_id)` | `id` da linha do inventário | `number` (novo saldo) | RPC `sell_item` (`p_inventory_id`). |
| `sell_items(inventory_ids)` | array de ids | `number` (novo saldo) | RPC `sell_items` (`p_inventory_ids`). Venda em lote. |

> Atenção à diferença entre `id` (identificador do **item** no catálogo) e `inventory_id` (identificador da **linha** no inventário — cada unidade obtida tem a sua).

---

## `marketService.js`

| Função | Parâmetros | Retorno |
| --- | --- | --- |
| `list_market_items()` | — | `Array<{ id, name, rarity, img, price, base_price }>` |
| `list_price_history(days = 90)` | número de dias | `Array<{ item_id, price, recorded_at }>` |
| `list_item_cases()` | — | `Map<item_id, Array<{ id, name }>>` |

- **`list_price_history`** é **paginada**: o Supabase limita cada consulta a 1000 linhas e o histórico de ~20 itens × 90 dias ultrapassa esse limite. A função busca blocos de 1000 (`range`) até receber um bloco menor, ordenando por `recorded_at` e `item_id` para manter a paginação estável.
- **`list_item_cases`** monta um mapa de "em quais caixas cada item aparece" (somente itens com peso > 0).

---

## `statsService.js`

| Função | Parâmetros | Retorno |
| --- | --- | --- |
| `get_dashboard_stats()` | — | `{ balance, inventory_value, total_spent, total_openings, items_in_inventory, ... }` (view `dashboard_stats`) |
| `get_leaderboard(limit = 10)` | quantidade | `Array<{ rank_pos, username, balance, is_me }>` (RPC `get_leaderboard`, `p_limit`) |
| `list_recent_openings(limit = 5)` | quantidade | `Array<{ id, cost, created_at, name, rarity, img, price }>` |

- O ranking pode conter, além do top `limit`, a linha do próprio usuário (`is_me = true`) quando ele está fora do top — a página insere um separador quando há salto de posições.
