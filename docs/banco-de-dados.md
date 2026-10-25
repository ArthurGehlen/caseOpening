# Banco de dados (Supabase)

[← Voltar ao README](../README.md)

> **O esquema do banco não está versionado neste repositório.** As informações abaixo foram levantadas a partir das consultas feitas pelo front-end (`js/services/`) e descrevem o **mínimo** que o banco precisa oferecer. Tipos e regras internas das funções são inferidos — confira no painel do Supabase antes de recriar o ambiente.

## Diagrama (simplificado)

```text
auth.users ──1:1── profiles
                      │
                      ├──1:N── inventory ──N:1── items ──1:N── price_history
                      │                            │
                      └──1:N── openings ───N:1─────┤
                                                   │
                         cases ──1:N── case_items ─┘
```

## Tabelas

### `profiles`

Perfil de cada usuário (provavelmente criado por *trigger* a partir de `auth.users`, usando o `username` enviado nos metadados do cadastro).

| Coluna | Tipo provável | Uso no front-end |
| --- | --- | --- |
| `id` | `uuid` (= `auth.users.id`) | identificação |
| `username` | `text` | navbar e ranking |
| `balance` | `numeric` | saldo exibido na navbar |
| `last_bonus_at` | `timestamptz` | controla a disponibilidade do bônus diário |

A consulta `select(...).single()` sem filtro pressupõe que a **RLS** devolva apenas o perfil do usuário logado.

### `cases`

| Coluna | Tipo provável | Descrição |
| --- | --- | --- |
| `id` | `uuid`/`text` | identificador (usado em `case.html?id=`) |
| `name` | `text` | nome da caixa |
| `img` | `text` | URL da imagem |
| `price` | `numeric` | preço de abertura |

### `items`

| Coluna | Tipo provável | Descrição |
| --- | --- | --- |
| `id` | `uuid`/`text` | identificador do item |
| `name` | `text` | nome |
| `rarity` | `text` | uma das chaves de `RARITIES`: `industrial`, `milspec`, `restricted`, `classified`, `covert` |
| `img` | `text` | URL da imagem |
| `price` | `numeric` | preço atual de mercado (usado na venda e nas estatísticas) |
| `base_price` | `numeric` | preço **âncora**, referência para o mercado |

### `case_items`

Tabela de ligação entre caixas e itens, com o **peso** que define a probabilidade.

| Coluna | Tipo provável | Descrição |
| --- | --- | --- |
| `case_id` | FK → `cases.id` | caixa |
| `item_id` | FK → `items.id` | item |
| `weight` | `numeric` | peso relativo do item na caixa. `0` desativa o item. |

### `inventory`

Cada linha é **uma unidade** de item pertencente a um usuário.

| Coluna | Tipo provável | Descrição |
| --- | --- | --- |
| `id` | `uuid`/`bigint` | `inventory_id` no front-end |
| `user_id` | FK → `profiles.id` | dono (filtrado pela RLS) |
| `item_id` | FK → `items.id` | item |
| `obtained_at` | `timestamptz` | data de obtenção |

### `openings`

Histórico de aberturas (uma linha por caixa aberta).

| Coluna | Tipo provável | Descrição |
| --- | --- | --- |
| `id` | — | identificador |
| `user_id` | FK → `profiles.id` | quem abriu |
| `item_id` | FK → `items.id` | item obtido |
| `cost` | `numeric` | valor pago pela caixa |
| `created_at` | `timestamptz` | data |

### `price_history`

Série histórica de preços usada no mercado.

| Coluna | Tipo provável | Descrição |
| --- | --- | --- |
| `item_id` | FK → `items.id` | item |
| `price` | `numeric` | preço registrado |
| `recorded_at` | `timestamptz` | momento do registro |

> A atualização periódica de preços (que alimenta `items.price` e `price_history`) é feita no backend — por exemplo, com `pg_cron` ou uma *Edge Function* agendada. Esse processo não faz parte deste repositório. Pelo medidor "Faixa de mercado" da interface, espera-se que o preço oscile em torno de ±20% do `base_price`.

## View

### `dashboard_stats`

Uma linha com as estatísticas do usuário logado:

| Coluna | Descrição |
| --- | --- |
| `balance` | saldo atual |
| `inventory_value` | soma dos preços atuais dos itens do inventário |
| `total_spent` | soma de `openings.cost` |
| `total_openings` | quantidade de aberturas |
| `items_in_inventory` | quantidade de itens no inventário |

## Funções RPC

Todas devem atuar sobre o usuário autenticado (`auth.uid()`) e, idealmente, ser executadas de forma **atômica** (dentro de uma transação) para evitar inconsistências de saldo.

| Função | Parâmetros | Retorno esperado | Responsabilidade |
| --- | --- | --- | --- |
| `open_cases` | `p_case_id`, `p_quantity` | `{ items: [...], balance }` | Validar quantidade e saldo, debitar `price × quantidade`, sortear um item por caixa conforme os pesos de `case_items`, inserir em `inventory` e `openings` e devolver os itens (com `inventory_id`) e o novo saldo. |
| `sell_item` | `p_inventory_id` | novo saldo (`numeric`) | Remover a linha do inventário do usuário e creditar o preço atual do item. |
| `sell_items` | `p_inventory_ids` (array) | novo saldo (`numeric`) | Mesmo que `sell_item`, em lote. |
| `claim_bonus` | — | novo saldo (`numeric`) | Verificar se `last_bonus_at` tem 24h ou mais, creditar o bônus e atualizar `last_bonus_at`. Deve falhar se o bônus ainda não estiver disponível. |
| `get_leaderboard` | `p_limit` | `[{ rank_pos, username, balance, is_me }]` | Ranking por saldo, com o top `p_limit` e a posição do usuário logado. |

## Segurança (RLS)

Como o front-end usa a chave publicável, as políticas de RLS são essenciais:

- `profiles`, `inventory` e `openings`: cada usuário só pode **ler** as próprias linhas; escrita apenas pelas funções RPC.
- `cases`, `items`, `case_items` e `price_history`: leitura liberada para usuários autenticados; sem escrita pelo cliente.
- Saldo e inventário **nunca** devem ser alterados diretamente pelo cliente — somente pelas RPCs (`security definer`).

## Usando outro projeto Supabase

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Recrie as tabelas, a view, as funções e as políticas descritas acima.
3. Em **Authentication → Providers**, habilite e-mail/senha (e decida se a confirmação de e-mail será exigida).
4. Atualize `SUPABASE_URL` e `SUPABASE_KEY` em `js/supabaseClient.js` com os dados de **Project Settings → API**.
