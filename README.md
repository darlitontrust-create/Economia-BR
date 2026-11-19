# Economia Brasil | Indicadores

Painel público com os principais indicadores econômicos do Brasil: Selic, IPCA, IGP-M, dólar,
desemprego, atividade (IBC-Br) e dívida pública. Tem estado atual e histórico mês a mês de cada um.

Os dados vêm do **Sistema Gerenciador de Séries Temporais (SGS) do Banco Central**.

## Como funciona a atualização

1. **A cada 3 horas**, uma rotina do GitHub (`.github/workflows/atualizar-dados.yml`) baixa as séries
   do Banco Central e grava a cópia em `data/`.
2. **Ao abrir o link**, o painel carrega essa cópia na hora e tenta também buscar direto no Banco Central.
   Se a busca direta funcionar, troca pelos dados mais novos; se o navegador bloquear, fica com a cópia.
3. Ao terminar, aparece o aviso verde *"Dados atualizados em DD/MM/AAAA às HH:MM"*, e o selo
   **Última atualização** da capa mostra essa mesma data e hora.

O botão **⟳ Atualizar dados**, no menu lateral, refaz a busca a qualquer momento.

## Publicar no GitHub Pages (sem login para quem acessa)

1. Crie um repositório **público** no GitHub (ex.: `painel-economia`).
2. Envie todo o conteúdo desta pasta para a raiz do repositório, incluindo as pastas `.github` e `data`.
3. Ative o Pages: em **Settings → Pages**, em *Build and deployment*, escolha *Source*: **Deploy from a branch**,
   depois *Branch*: **main** e a pasta **/ (root)**, e salve.
4. Libere a rotina diária para gravar: em **Settings → Actions → General → Workflow permissions**, marque
   **Read and write permissions** e salve.
5. Rode a rotina uma vez na mão: aba **Actions → Atualizar dados do painel → Run workflow**.
6. Em um ou dois minutos o painel fica no ar em:
   `https://SEU-USUARIO.github.io/painel-economia/`

Qualquer pessoa com o link abre o painel, sem login.

## Estrutura

```
index.html                 página do painel (capa + 8 telas)
css/style.css              visual (menu lateral, cartões, painéis, filtros, aviso)
js/d3.min.js               biblioteca de gráficos (D3 v7)
js/dash-shim.js            busca no Banco Central, cópia de reserva, aviso de atualização
js/core.js                 formatação e desenho dos gráficos (colunas, linha, velocímetro)
js/calc.js                 cálculos: IGP-M 12 meses, variações, resumo de cada indicador
js/draw.js                 liga cada visual aos dados
js/nav.js                  menu, filtros de Ano e Mês (Ctrl + clique, trimestre → mês)
data/*.json                cópia salva dos dados (renovada pela rotina diária)
scripts/atualizar_dados.py script usado pela rotina diária
assets/hero.svg            ilustração da capa
```

## Séries usadas (SGS / Banco Central)

| Indicador | Série |
|---|---|
| Meta Selic (decisões do Copom) | 432 |
| Selic efetiva no mês, anualizada | 4189 |
| IPCA no mês / em 12 meses | 433 / 13522 |
| IGP-M no mês (12 meses calculado no painel) | 189 |
| Dólar PTAX venda, diário / média mensal | 1 / 3698 |
| Taxa de desocupação (PNAD Contínua) | 24369 |
| IBC-Br com ajuste sazonal | 24364 |
| Dívida bruta do governo geral (% do PIB) | 13762 |

## Testar no computador

Os arquivos JSON precisam ser servidos por HTTP. Na pasta do projeto, rode:

```
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Ajustes comuns

- **Faixas dos velocímetros**: `GAUGES` em `js/core.js`. Só a do IPCA segue a meta oficial; as outras são referências.
- **Horário da rotina diária**: linha `cron` em `.github/workflows/atualizar-dados.yml` (horário UTC).
- **Período carregado**: começa em janeiro de dois anos atrás (em `dash-shim.js` e em `atualizar_dados.py`).
