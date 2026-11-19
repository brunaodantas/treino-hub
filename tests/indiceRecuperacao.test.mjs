import test from 'node:test'
import assert from 'node:assert/strict'
import { indiceRecuperacao } from '../src/logic/indiceRecuperacao.ts'
const hoje = new Date('2026-11-19T12:00:00-03:00')
const dia = (n, sono=7, fc=72) => ({ data:`2026-11-${String(n).padStart(2,'0')}`,sonoHoras:sono,fcRepouso:fc })
const base = Array.from({length:14},(_,i)=>dia(i+5))
test('referência usa histórico anterior e pontua sono e frequência no mesmo dia',()=>{
 assert.equal(indiceRecuperacao([...base,dia(19)],hoje).valor,70)
 assert.equal(indiceRecuperacao([...base,dia(19,8,70)],hoje).valor,83)
 assert.equal(indiceRecuperacao([...base,dia(19,6,76)],hoje).valor,53)
})
test('dados antigos, ausentes ou insuficientes não geram resultado',()=>{
 assert.equal(indiceRecuperacao(base,hoje),null)
 assert.equal(indiceRecuperacao([...base,dia(19,null,72)],hoje),null)
 assert.equal(indiceRecuperacao([...base.slice(0,6),dia(19)],hoje),null)
 assert.equal(indiceRecuperacao([...base,dia(19,7,60)],hoje),null)
})
test('ignora histórico futuro e atual na mediana e limita valores',()=>{
 const r=indiceRecuperacao([...base,dia(19,14,65),dia(20,2,140)],hoje)
 assert.equal(r.sonoBase,7); assert.equal(r.fcBase,72); assert.equal(r.valor,100)
})
