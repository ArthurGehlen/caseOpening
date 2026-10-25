# Regras de negócio e cálculos

[← Voltar ao README](../README.md)

## Raridades

As raridades seguem o padrão do Counter-Strike e estão definidas em `js/utils/constants.js`, da mais comum para a mais rara:

| Chave | Nome exibido | Cor |
| --- | --- | --- |
| `industrial` | Industrial Grade | `#5e98d9` |
| `milspec` | Mil-Spec Grade | `#5169f7` |
| `restricted` | Restricted | `#a574ff` |
| `classified` | Classified | `#e050f0` |
| `covert` | Covert | `#f26767` |

Essa ordem é usada para ordenar listas ("mais raro primeiro"), montar legendas e barras de composição.

## Probabilidades por peso

A chance de cada item vem do seu **peso** (`weight`) na tabela `case_items`, e não de um percentual fixo por raridade:

$$
\text{chance}(i) = \frac{\text{peso}(i)}{\sum \text{pesos da caixa}} \times 100
$$

Exemplo — caixa com três itens:

| Item | Peso | Chance |
| --- | --- | --- |
| A | 80 | 80 / 100 = **80%** |
| B | 15 | 15 / 100 = **15%** |
| C | 5 | 5 / 100 = **5%** |

- Itens com peso `0` são ignorados (ficam "desativados" na caixa).
- A chance de uma **raridade** é a soma das chances dos itens daquela raridade.

O sorteio real acontece no servidor (RPC `open_cases`). No navegador, a mesma lógica de pesos é usada apenas para gerar os cards decorativos das fitas (`draw_decor_item` em `case.js`):

```js
let roll = Math.random() * total_weight;
for (const item of case_items) {
  roll -= item.weight;
  if (roll < 0) return item;
}
```

## Estatísticas de uma caixa

Calculadas em `home.js` (`summarize`) e em `case.js` (`render_header`):

| Estatística | Cálculo |
| --- | --- |
| **Melhor prêmio** | maior `price` entre os itens da caixa |
| **Chance de lucro** | soma das chances dos itens com `price >= preço da caixa` |
| **Itens** | quantidade de itens com peso > 0 |
| **Composição** | chance total de cada raridade |

## Abertura de caixas

- Quantidade: de **1** a **15** caixas por vez (`MAX_CASES`).
- Custo total: `preço da caixa × quantidade`.
- No máximo **3 fitas** são animadas (`MAX_TRACKS`); com mais caixas, as fitas mostram os 3 itens **mais caros** obtidos e todos os itens aparecem no modal.
- Confete: 80 partículas normalmente; 200 se algum item for *Classified* ou *Covert*.
- **Feedback de derrota:** se a soma dos preços dos itens obtidos for menor que o custo total, o modal mostra uma imagem de incentivo.
- Todos os itens obtidos já entram no inventário. O usuário pode vendê-los imediatamente pelo modal.

## Venda de itens

- O valor creditado é o **preço atual** do item (`items.price`), que varia com o mercado.
- A venda pode ser individual (`sell_item`) ou em lote (`sell_items`); ambas devolvem o novo saldo.

## Bônus diário

- O botão "Bônus" aparece na navbar quando `last_bonus_at` está vazio ou ocorreu há **24 horas ou mais**.
- O resgate é feito pela RPC `claim_bonus`, que é a fonte da verdade (o servidor valida o intervalo novamente).
- O valor do bônus é definido no backend.

## Dashboard

| Métrica | Cálculo |
| --- | --- |
| **Saldo Total** (patrimônio) | `balance + inventory_value` |
| **Média por caixa** | `total_spent / total_openings` (0 se não houver aberturas) |
| **Resultado de uma abertura** | `preço do item − custo da caixa` (verde se ≥ 0, vermelho se < 0) |
| **Ranking** | ordenado por **saldo** (não inclui o valor do inventário) |

## Mercado

### Preço âncora e faixa

Cada item tem um `base_price` (âncora). O medidor "Faixa de mercado" posiciona o preço atual entre **−20%** e **+20%** da âncora (`BAND = 0.2`):

$$
\text{posição} = \text{limitar}_{[0,1]}\left(\frac{\text{preço}/\text{âncora} - 0{,}8}{0{,}4}\right) \times 100\%
$$

### Índice do mercado (base 100)

Para cada instante do histórico, o índice é a **média** de `preço / âncora × 100` de todos os itens com registro naquele instante:

$$
\text{índice}(t) = \frac{1}{n}\sum_{i=1}^{n} \frac{\text{preço}_i(t)}{\text{âncora}_i} \times 100
$$

- Índice **100** = itens, em média, no preço âncora.
- Índice **110** = itens, em média, 10% acima da âncora.

Se o preço atual de um item for diferente do último ponto do histórico, um ponto com o horário atual é adicionado à série.

### Variação percentual

A variação de um período (24h, 7d, 30d) compara o último ponto com o ponto mais recente que tenha ocorrido há pelo menos N dias (com tolerância de 1 hora):

$$
\text{variação} = \left(\frac{\text{último}}{\text{referência}} - 1\right) \times 100
$$

- Variações com valor absoluto menor que **0,005%** são consideradas **estáveis** (exibidas como `0,00%`).
- Se não houver ponto antigo o suficiente, usa-se o primeiro ponto disponível.
- No gráfico, a cor da linha é **verde** se o último valor do período for maior ou igual ao primeiro, e **vermelha** caso contrário.

## Moeda

Todos os valores monetários são exibidos em **dólar americano** (`$1,234.56`), por meio de `format_price`. Datas e percentuais usam o formato brasileiro (`pt-BR`).
