import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'
import Dexie from 'dexie'

test('migração v3 a v4 preserva histórico, séries, fila e credenciais; importação é idempotente', async () => {
 const antigo = new Dexie('treino-hub-v2')
 antigo.version(3).stores({sessoes:'++id, treino, iniciadaEm, finalizadaEm, stravaId',series:'++id, sessaoId, exercicio, feitaEm',corridas:'++id, data, fonte, stravaId',wellness:'data',pesos:'exercicio',syncQueue:'++id, tipo, criadoEm',config:'chave',atividades:'++id, data, tipo',diario:'data'})
 await antigo.table('config').put({chave:'strava_tokens',valor:'sentinela-ficticia'})
 await antigo.table('sessoes').add({treino:'E',iniciadaEm:'2026-11-18T12:00:00Z',finalizadaEm:null})
 await antigo.table('series').add({sessaoId:1,exercicio:'teste',feitaEm:'2026-11-18'})
 await antigo.table('syncQueue').add({tipo:'strava_sessao',criadoEm:'2026-11-18'})
 antigo.close()
 const {db} = await import('../src/db/schema.ts')
 const {salvarMedicoes} = await import('../src/db/composicao.ts')
 const m = {id:'privado',data:'2026-11-18',fonte:'manual',origem:'OKOK',contexto:'jejum',valores:{pesoKg:80.5}}
 assert.equal(await salvarMedicoes([m,m]),1)
 assert.equal(await salvarMedicoes([m]),0)
 assert.equal(await db.sessoes.count(),1); assert.equal(await db.series.count(),1); assert.equal(await db.syncQueue.count(),1)
 assert.equal((await db.config.get('strava_tokens')).valor,'sentinela-ficticia')
 await assert.rejects(salvarMedicoes([{...m,id:'erro',valores:{pesoKg:NaN}}]))
 assert.equal(await db.composicao.count(),1)
 await db.delete()
})
