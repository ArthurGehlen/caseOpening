# Case Opening Simulator

> Simulador de abertura de caixas inspirado no Counter-Strike, feito com HTML, CSS e JavaScript puro, usando o Supabase como backend.

**Demonstração:** [case-oppening.vercel.app](https://case-oppening.vercel.app)

O usuário cria uma conta, recebe saldo virtual, abre caixas com uma animação de "roleta", guarda ou vende os itens que ganhou, acompanha a variação de preços no mercado e compete com outros jogadores no ranking. **Nenhum dinheiro real é envolvido** — todo o saldo é fictício.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como executar localmente](#como-executar-localmente)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Documentação completa](#documentação-completa)
- [Implantação (deploy)](#implantação-deploy)

---

## Funcionalidades

| Área | O que faz |
| --- | --- |
| **Autenticação** | Cadastro (nome de usuário, e-mail e senha), login e logout via Supabase Auth. Páginas internas exigem sessão ativa. |
| **Catálogo de caixas** | Lista todas as caixas com preço, melhor prêmio, chance de lucro e uma barra de composição por raridade. |
| **Abertura de caixas** | Abre de 1 a 15 caixas de uma vez. O sorteio acontece no servidor; o navegador exibe até 3 "fitas" animadas, confete e um modal de resultado. |
| **Resultado** | Itens iguais são agrupados. Cada grupo pode ser guardado ou vendido; há também o botão "Vender tudo". |
| **Inventário** | Lista os itens obtidos, com filtro por raridade, ordenação, seleção múltipla e venda individual ou em lote. |
| **Mercado** | Índice de mercado (base 100), gráfico de preços (7, 30 ou 90 dias), maiores altas e quedas, busca, filtros e em quais caixas cada item aparece. |
| **Dashboard** | Patrimônio total (saldo + inventário), estatísticas de aberturas, ranking dos jogadores e últimas aberturas. |
| **Bônus diário** | Botão na barra de navegação que concede um bônus a cada 24 horas. |

## Tecnologias

- **HTML5 + CSS3** — sem frameworks nem pré-processadores.
- **JavaScript (ES Modules)** — carregado direto no navegador, sem etapa de build.
- **[Supabase](https://supabase.com/)** — autenticação, banco PostgreSQL, *views* e funções RPC.
  - Cliente: `@supabase/supabase-js@2`, importado via [esm.sh](https://esm.sh).
- **[canvas-confetti](https://github.com/catdad/canvas-confetti)** `1.9.3` — efeito de confete na abertura (via CDN jsDelivr).
- **[Lightweight Charts](https://github.com/tradingview/lightweight-charts)** `4.2.0` — gráfico da página de mercado (via CDN jsDelivr).
- **[Vercel](https://vercel.com/)** — hospedagem estática.

## Como executar localmente

O projeto é 100% estático: não há `package.json`, dependências para instalar ou etapa de compilação. Como os scripts usam **ES Modules** (`<script type="module">`), os arquivos **precisam ser servidos por HTTP** — abrir o HTML direto pelo `file://` não funciona.

1. Clone o repositório:

   ```bash
   git clone https://github.com/ArthurGehlen/caseOpening.git
   cd caseOpening
   ```

2. Suba qualquer servidor estático na raiz do projeto. Exemplos:

   ```bash
   # Python 3
   python3 -m http.server 5500

   # ou Node.js
   npx serve .
   ```

   No VS Code, a extensão **Live Server** também funciona.

3. Acesse **http://localhost:5500/pages/login.html** (ajuste a porta conforme o servidor).

> O projeto já aponta para o projeto Supabase de produção (veja [`js/supabaseClient.js`](js/supabaseClient.js)). Para usar outro backend, consulte [Banco de dados](docs/banco-de-dados.md).

## Estrutura de pastas

```text
caseOpening/
├── index.html              # Ponto de entrada: redireciona para login ou home
├── favicon.ico
├── style.css               # Folha de estilo legada (não é usada pelas páginas atuais)
├── assets/
│   └── result.jpeg         # Imagem de "derrota" exibida no modal de resultado
├── pages/                  # Uma página HTML por tela
│   ├── login.html
│   ├── signup.html
│   ├── home.html           # Catálogo de caixas
│   ├── case.html           # Abertura de uma caixa (?id=<id da caixa>)
│   ├── inventory.html
│   ├── market.html
│   └── dashboard.html
├── css/                    # Estilos divididos por responsabilidade
│   ├── base.css            # Variáveis (cores) e reset
│   ├── layout.css          # Container e barra de navegação
│   ├── ui.css              # Componentes visuais reutilizáveis
│   ├── auth.css            # Login e cadastro
│   ├── home.css | case.css | result.css | inventory.css | market.css | dashboard.css
└── js/
    ├── supabaseClient.js   # Instância única do cliente Supabase
    ├── pages/              # Um script por página (controladores)
    ├── services/           # Acesso a dados (consultas e RPCs do Supabase)
    ├── components/         # Componentes de interface reutilizáveis
    └── utils/              # Constantes, formatação, guardas de rota e formulários
```

## Documentação completa

A documentação detalhada está na pasta [`docs/`](docs/):

| Documento | Conteúdo |
| --- | --- |
| [Arquitetura](docs/arquitetura.md) | Visão geral das camadas, fluxo de navegação e ciclo de vida de uma página. |
| [Páginas](docs/paginas.md) | Funcionamento detalhado de cada tela. |
| [Componentes e utilitários](docs/componentes.md) | `navbar`, `TrackConstructor`, modal e card de resultado, `utils/`. |
| [Serviços (camada de dados)](docs/servicos.md) | Referência de todas as funções que conversam com o Supabase. |
| [Banco de dados](docs/banco-de-dados.md) | Tabelas, *views* e funções RPC esperadas no Supabase. |
| [Regras de negócio e cálculos](docs/regras-de-negocio.md) | Raridades, probabilidades, chance de lucro, índice de mercado, bônus. |
| [Estilos (CSS)](docs/estilos.md) | Organização das folhas de estilo, variáveis e convenções visuais. |
| [Guia de contribuição](docs/contribuicao.md) | Convenções de código, commits e passo a passo para adicionar funcionalidades. |
| [Problemas conhecidos](docs/problemas-conhecidos.md) | Limitações e pontos de melhoria identificados no código. |

## Implantação (deploy)

O site é publicado na **Vercel** como site estático. Não há configuração de build no repositório: a Vercel apenas serve os arquivos como estão. Consulte o [guia de contribuição](docs/contribuicao.md#implantação) para mais detalhes.
