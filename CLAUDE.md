# Treino Hub v2 — PWA offline-first

Sucessor do app Streamlit (`../treino_app/`, que continua no ar até a v2 estar completa).
Decisões de 14/08/2026: PWA em vez de React Native (Apple Health direto dispensado,
os dados de saúde chegam via Intervals.icu). Sem aba de nutrição, por decisão explícita.

## Stack
- React 19 + Vite + TypeScript, `vite-plugin-pwa` (instalável, offline)
- Dexie (IndexedDB) — banco local, tudo grava local primeiro
- `@fontsource-variable/archivo` — fonte embutida (offline; nunca usar CDN de fonte)
- Sem router: abas por estado em `App.tsx`

## Estrutura
- `src/logic/programa.ts` — split Superior/Inferior (A/B/C/D desde 02/09/2026, era A/B/C/D peito·costas·perna·peito 29/07 a 01/09/2026) + agenda semanal
- `src/logic/cores.ts` — cor por tipo de sessão (A laranja · B azul · C dourado · D salmão · corrida ciano · descanso musgo)
- `src/db/schema.ts` — Dexie: sessoes, series, corridas, wellness, pesos, syncQueue, config
- `src/screens/` — Hoje (hero estilo RECOMP), Sessao, Corrida, Historico, Recuperacao
- `src/theme.css` — tema industrial escuro, grão em SVG, Archivo Variable (wdth 118 display / 78 labels)

## Regras que vieram do app antigo (não perder)
- **Split trocado em 02/09/2026** para Superior/Inferior, 4 dias estruturais: Seg Superior A + corrida curta · Ter Inferior A (pesado, joelho) + corrida curta (nunca longa) · Qua descanso ou longa (alterna c/ Qui) · Qui Superior B + corrida · Sex parada total · Sáb Inferior B (leve) · Dom descanso. Não existe mais "3 reais + 1 bônus", ver `project-treino-hub-programa-atual` na memória do Claude Code.
- **Fila deslizante (14/08/2026):** o treino do dia é sempre o POSTERIOR ao último concluído (A→B→C→D→A desde 02/09/2026; antes A→B→C→A com D voltando pra A), nunca letra fixa por dia da semana. O calendário só define SE o dia é de musculação, corrida ou descanso, não QUAL treino. `proximaLetra()` em programa.ts
- Nada de travar tela por dia. A tela Hoje lista **os 4 treinos sempre clicáveis**, todos
  circulados na própria cor — nenhum é "o certo".
- **O app marca o ÚLTIMO treino feito, não o próximo** (decisão de 15/08/2026): contorno cheio
  e "último treino, há N dias". Quem escolhe é o Bruno; o app só lembra onde ele parou.
  `proximaLetra()` continua em programa.ts mas não é mais usada na UI.
- O título grande da tela Hoje é o **dia da semana** com uma frase curta abaixo, nunca o nome
  do treino: o nome estourava em duas linhas no iPhone e a tela virou um menu, não um comando.
- Descanso pós-série: BASE 90s · ACESS 60s · CORE 45s; timer auto-dispara ao marcar série, beep ao zerar
- Wake lock durante a sessão; crash recovery via `config.sessao_ativa`
- `reps` aceita "10-12", "8" e "40s" — nunca fazer parseInt direto (usar `repsNum`)
- TSB nunca vem da API do Intervals (vem null): calcular sempre CTL − ATL
- FCR limiares pessoais: ≤74 normal, ≤78 atenção, >80 alerta; descartar <65 (erro de sync)
- HRV descontinuado em 17/07/2026: não buscar, não exibir
- Duas partes de treino na mesma ida à academia = UMA atividade no Strava, não duas
- **Nome padrão em toda a interface e no Strava: `nomeTreino()`** → "Treino D · Peito · Ombro · 2ª dose".
  Ponto único: mudou ali, mudou em todo lugar. Exceção: o header da sessão usa só "Treino D",
  porque divide a linha com o cronômetro.
- **Registrar treino já feito** (tela Hoje): grava sessão concluída com a duração informada E
  enfileira para o Strava. Sem o enfileiramento o treino ficava só no app e sumia do resumo.
- Falha de envio ao Strava nunca pode ser só um toast: grava na `syncQueue` e mostra pendência

## Deploy
- **Produção: https://treino-hub.vercel.app** — projeto `treino-hub` na conta pessoal
  **Hobby (gratuita)**, escopo `bruno-dantas-projects1`.
- **Nunca publicar no time `esquina`**: é o plano pago da agência. Deploy sempre com
  `vercel deploy --prod --yes --scope bruno-dantas-projects1` de dentro de `treino-app-v2/`.
- Código em https://github.com/brunaodantas/treino-hub (público, sem credenciais).
- Strava exige o domínio em strava.com/settings/api → "Domínio de autorização callback"
  = `treino-hub.vercel.app`. Sem isso o OAuth devolve `redirect_uri invalid`.
- Existe também um espelho em GitHub Pages (`BASE_PATH=/treino-hub/ npm run build` → `docs/`),
  não usado no dia a dia.

## Sync (feito em 14/08/2026)
- Strava e Intervals.icu falam direto do navegador: ambos liberam CORS, não precisa de backend.
- Strava: OAuth guarda `refresh_token` no IndexedDB e renova o access token sozinho quando falta <10 min.
  Era isso que fazia a conexão "cair" no app antigo. Client ID/Secret ficam no dispositivo, nunca no código.
- Import do Strava começa da última atividade conhecida (menos 2 dias) e deduplica por `stravaId`,
  com paginação. **Segunda passada obrigatória por dia+duração (±3 min):** o histórico do seed veio
  sem `stravaId`, então a dedupe por id não o enxerga e cada importação duplicaria as últimas semanas.
  Ao achar a gêmea, carimba o `stravaId` nela em vez de criar outra.
- **Excluir** no Histórico (botão Editar → lixeira): apaga local e definitivo, junto com as séries e
  a pendência de envio. Não mexe no Strava, e o seed não volta (trava `seed_v2`).
- Envio ao Strava é POST do app (o Strava não puxa nada): `type: 'WeightTraining'` e
  `start_date_local` em horário **local** — mandar o ISO em UTC punha a atividade 3h adiantada.
- Google Fit **removido de vez**: a API REST foi descontinuada pelo Google (era a origem das quedas de conexão).
- Histórico antigo vem de `public/historico-seed.json` (807 atividades desde 2018 + 2.252 dias de métricas). Importa uma vez por dispositivo, com a trava `seed_importado` gravada DENTRO da
  transação para o StrictMode do React não duplicar. **Cuidado ao regerar: `json.dump` do Python escreve
  `NaN`, que quebra o `JSON.parse` do navegador — usar `allow_nan=False`.**
- Sessões importadas sem letra no nome ficam com `treino: null` e **não movem a fila deslizante**.

## Fontes de dados (decisão de 15/08/2026)

Só **Strava** e **Intervals.icu**. O relógio manda para o Apple Saúde, que repassa
para os dois, então não existe integração direta com Apple Health, Huawei ou Google Fit:

| Dado | Vem de |
|---|---|
| Atividades (musculação, corrida, caminhada, pedalada, elíptico) | Strava |
| Passos, sono, peso, FC de repouso, CTL/ATL | Intervals.icu (campo `steps` existe e é populado) |

- Huawei Health não tem API para pessoa física (exige contrato de parceria). Chega via Apple Saúde.
- Google Fit: API descontinuada, desligamento no fim de 2026, e o dado é redundante. Não integrar.
- `public/historico-seed.json` é gerado dos caches locais + API; **nunca gravar `NaN`**
  (`json.dumps(..., allow_nan=False)`), senão o `JSON.parse` do navegador quebra silenciosamente
  e o app fica sem histórico.
- Atividades com menos de 5 min E menos de 500 m são descartadas: são o relógio abrindo sozinho,
  não treino (era daí que vinham "Remo" e "Trilha" que o Bruno nunca fez).
- O histórico importado do Strava vem quase todo sem letra de treino ("Força"), por isso a fila
  deslizante só considera sessões COM letra; olhar a última de todas travaria a fila no A.

## Aba Evolução (15/08/2026)

Gráficos em **SVG puro** (`src/components/Grafico.tsx`): sem Chart.js/Plotly, para
não pesar o bundle nem depender de CDN — o app tem que abrir offline na academia.

- `GraficoLinha` (séries múltiplas, `zeroRef` para TSB, `conectar` para peso/FCR)
  e `GraficoBarras` (com `meta` tracejada). viewBox 0..100, `preserveAspectRatio="none"`,
  traço com `vector-effect: non-scaling-stroke` para não distorcer.
- `conectar` liga por cima dos dias sem medição: certo para peso (medido de vez em
  quando), errado para métricas diárias, onde o buraco é informação.
- **Semanas sempre em horário local.** `toISOString()` converte para UTC e, no fuso
  do Brasil, joga a data para o dia anterior — isso desalinhava as chaves e a média
  semanal dava 0. Usar o helper `dataLocal()`.
- O esqueleto de semanas é pré-criado com zero: semana sem treino precisa aparecer
  como barra vazia, é justamente o que interessa ver.
- Ajustes saiu da TabBar e virou ícone no topo (junto do recarregar): 6 abas não
  cabem em 375 px sem cortar rótulo.

## Fases
1. **Feita (14/08/2026):** app instalável, Hoje + Sessão, Corrida, Histórico com último treino em destaque, Recuperação
2. **Feita (14/08/2026):** Ajustes com status de conexão, sync Strava (importar/exportar) e Intervals, seed do histórico
3. PRs de corrida, carga semanal combinada, form-check por vídeo (MediaPipe, opcional)

## Comandos
- `npm run dev` — dev server
- `npm run build` — build + PWA (dist/)
