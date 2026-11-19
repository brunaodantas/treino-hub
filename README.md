# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Composição corporal e importação local

Acesse Evolução > Composição corporal. O cadastro manual distingue músculo
esquelético, massa muscular OKOK e massa magra Apple Saúde. Campos vazios não
viram zero. Há histórico, gráficos por medida e filtro de jejum informado.

Os dados são guardados somente no IndexedDB deste navegador, na nova tabela
`composicao` (versão 4). A migração é aditiva e preserva as demais tabelas.
Baixe o backup JSON antes de trocar de dispositivo. Nenhuma medição pessoal
inicial é incluída no código ou no repositório público: importe o arquivo
privado fornecido separadamente e confirme a medição na prévia.

Apple Saúde: no iPhone, abra Saúde > sua foto > Exportar Todos os Dados de
Saúde e salve em Arquivos. Toque no ZIP para descompactar e selecione
`export.xml` no Treino Hub. O XML é processado em blocos por um Worker local,
sem upload e sem acesso direto a HealthKit. ZIP direto ainda não é aceito.
Só são lidos peso, IMC, gordura, massa magra, altura e cintura a partir de
18/11/2026. A medição de 17/11 é descartada. O arquivo não informa jejum.

A prévia começa sem registros selecionados. Confirme datas, fontes e valores
antes de salvar. Registros de fontes ou horários distintos permanecem
separados. Reimportações idênticas não duplicam registros. Massa magra nunca
é convertida em massa muscular. A gordura do XML é uma fração e é convertida
em percentual (`0.2` vira `20%`).

Referências: [exportação Apple Saúde](https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/ios),
[unidade percentual HealthKit](https://developer.apple.com/documentation/healthkit/hkunit/percent()).

## Meta semanal e Strava

Correção adaptada da PR #3: ao abrir Hoje ou retomar o app, o Strava conectado
é consultado e a meta é recalculada (intervalo mínimo de um minuto ao retomar).
A semana inteira é consultada, mesmo se houver corrida mais recente.
Só sessões de musculação contam, inclusive WeightTraining sem letra; E fica
separado como bônus. Corridas ficam fora da meta. Importação e exportação são
serializadas entre abas com Web Locks, com alternativa local por aba.
Registros são vinculados por ID ou por horário/duração compatíveis sem
fundir treinos com letras ou IDs distintos. Uma sessão já vinculada não é
reenviada pela fila. Os treinos A/B/C/D/E e marcadores de potência foram
preservados integralmente da versão atual de master.

## Verificação

- `npm test`: regras da meta, importação XML, unidades e migração v3 a v4.
- `npm run lint`: código-fonte e testes, sem arquivos de distribuição.
- `npm run build`: TypeScript, pacote de produção e cache offline da PWA.
- `node tests/fluxo.e2e.mjs`: com Vite em `http://127.0.0.1:5173` e Chromium
  instalado por `npx playwright install chromium`. Para Chrome já instalado,
  informe `PLAYWRIGHT_CHROME` com o caminho do executável. Usa banco isolado,
  dados fictícios e Strava simulado. Não acessa credenciais pessoais.

### Foto da OKOK

Em Evolução > Composição corporal, selecione “Ler foto da OKOK”. O
reconhecimento é feito localmente no navegador, sem enviar a imagem. O app
preenche a prévia, destaca possíveis dúvidas na leitura e pede confirmação da
condição de jejum. Confira os valores antes de salvar. Foto com mesma data e
peso de um registro existente exige confirmação adicional para evitar repetir
a medição. Os dados do reconhecedor são servidos pelo próprio app e incluídos
no cache offline. Fotos nunca são armazenadas no histórico.
