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
- `src/logic/programa.ts` — split A/B/C/D + agenda semanal (portado de `treino_app/logic/schedule.py`)
- `src/logic/cores.ts` — cor por tipo de sessão (A laranja · B azul · C dourado · D salmão · corrida ciano · descanso musgo)
- `src/db/schema.ts` — Dexie: sessoes, series, corridas, wellness, pesos, syncQueue, config
- `src/screens/` — Hoje (hero estilo RECOMP), Sessao, Corrida, Historico, Recuperacao
- `src/theme.css` — tema industrial escuro, grão em SVG, Archivo Variable (wdth 118 display / 78 labels)

## Regras que vieram do app antigo (não perder)
- Dias: Seg corrida intervalada · Ter/Qua/Sex/Sáb musculação+corrida conforme tabela · Qui/Dom descanso
- **Fila deslizante (14/08/2026):** o treino do dia é sempre o POSTERIOR ao último concluído (A→B→C→A; D devolve pra A), nunca letra fixa por dia da semana. O calendário só define SE o dia é de musculação, corrida ou descanso, não QUAL treino. `proximaLetra()` em programa.ts
- Meta real é 3 musculações/semana; D é o 4º dia, ganho e não obrigação, mas nunca rotular de "bônus" na UI
- Nada de travar tela por dia: sugestão sim, bloqueio não ("Treinar mesmo assim")
- Descanso pós-série: BASE 90s · ACESS 60s · CORE 45s; timer auto-dispara ao marcar série, beep ao zerar
- Wake lock durante a sessão; crash recovery via `config.sessao_ativa`
- `reps` aceita "10-12", "8" e "40s" — nunca fazer parseInt direto (usar `repsNum`)
- TSB nunca vem da API do Intervals (vem null): calcular sempre CTL − ATL
- FCR limiares pessoais: ≤74 normal, ≤78 atenção, >80 alerta; descartar <65 (erro de sync)
- HRV descontinuado em 17/07/2026: não buscar, não exibir
- Duas partes de treino na mesma ida à academia = UMA atividade no Strava, não duas
- Falha de envio ao Strava nunca pode ser só um toast: grava na `syncQueue` e mostra pendência

## Deploy
- **Produção: https://treino-hub-bruno.vercel.app** (projeto Vercel `esquina/treino-hub-bruno`)
- `treino-app-v2.vercel.app` é **outro app do Bruno** ("Ortopedia & Treino"). Não usar esse nome de projeto.
- Deploy por `vercel deploy --prod --yes` de dentro de `treino-app-v2/`. Sem repo git.

## Sync (feito em 14/08/2026)
- Strava e Intervals.icu falam direto do navegador: ambos liberam CORS, não precisa de backend.
- Strava: OAuth guarda `refresh_token` no IndexedDB e renova o access token sozinho quando falta <10 min.
  Era isso que fazia a conexão "cair" no app antigo. Client ID/Secret ficam no dispositivo, nunca no código.
- Import do Strava começa da última atividade conhecida (menos 2 dias) e deduplica por `stravaId`, com paginação.
- Google Fit **removido de vez**: a API REST foi descontinuada pelo Google (era a origem das quedas de conexão).
- Histórico antigo vem de `public/historico-seed.json` (309 musculações + 198 corridas, cache do app Streamlit
  + Strava até 14/08). Importa uma vez por dispositivo, com a trava `seed_importado` gravada DENTRO da
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

## Fases
1. **Feita (14/08/2026):** app instalável, Hoje + Sessão, Corrida, Histórico com último treino em destaque, Recuperação
2. **Feita (14/08/2026):** Ajustes com status de conexão, sync Strava (importar/exportar) e Intervals, seed do histórico
3. PRs de corrida, carga semanal combinada, form-check por vídeo (MediaPipe, opcional)

## Comandos
- `npm run dev` — dev server
- `npm run build` — build + PWA (dist/)
