# Problemas conhecidos e melhorias sugeridas

[← Voltar ao README](../README.md)

Pontos identificados durante a análise do código. Nenhum deles foi alterado nesta documentação — servem como referência para futuras correções.

## Duplicação de código

Os helpers `el()` e `$()`, as constantes `IMAGE_FALLBACK` e `RARITY_ORDER` e funções de ordenação são redefinidos em vários módulos.

**Sugestão:** centralizar em `js/utils/` (por exemplo, `js/utils/dom.js`).

## Esquema do banco fora do repositório

Tabelas, _views_, funções RPC e políticas de RLS existem apenas no projeto Supabase. Isso dificulta recriar o ambiente e revisar mudanças.

**Sugestão:** versionar o esquema com a [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase/migrations/`). Veja o levantamento atual em [Banco de dados](banco-de-dados.md).

## Testes automatizados

Não há testes. Funções puras como os cálculos do mercado (`build_index`, `change_over`, `slice_range`) e as estatísticas das caixas são boas candidatas a testes unitários.
