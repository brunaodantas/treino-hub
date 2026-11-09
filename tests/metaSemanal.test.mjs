import test from 'node:test'
import assert from 'node:assert/strict'
import { letraDoNome, tipoParaMeta, resumoSemanal, possivelMesmoTreino } from '../src/logic/metaSemanal.ts'

const stamp = (day, hour = '10:00') => `${day}T${hour}:00-03:00`
const session = (day, letra, opts = {}) => ({
  treino: letra, nome: letra ? `Treino ${letra}` : 'Musculação',
  iniciadaEm: stamp(day), finalizadaEm: stamp(day, '10:40'),
  fonte: letra ? 'app' : 'strava', stravaId: null, ...opts,
})
const ref = new Date('2026-11-08T12:00:00-03:00')

test('regex distingue A-E e ignora caixa', () => {
  for (const name of ['Treino E', 'Força E', 'treino e', 'FORÇA E']) assert.equal(letraDoNome(name), 'E')
  assert.equal(letraDoNome('Treino Extra'), null)
  assert.equal(letraDoNome('WeightTraining'), null)
  for (const l of 'ABCD') assert.equal(letraDoNome(`Treino ${l}`), l)
})
test('A-D somam quatro; E apenas bonus', () => {
  const s = [...'ABCDE'].map((l, i) => session(`2026-11-0${2 + i}`, l))
  assert.deepEqual(resumoSemanal(s, ref), { base: 4, bonus: 1 })
})
test('E isolado nao soma base', () => {
  assert.deepEqual(resumoSemanal([session('2026-11-05', 'E')], ref), { base: 0, bonus: 1 })
})
test('Strava sem letra soma base; bonus sem letra e reconhecido', () => {
  const s = [
    session('2026-11-02', null, { nome: 'WeightTraining', stravaId: 1 }),
    session('2026-11-03', null, { nome: 'Treino E', stravaId: 2 }),
    session('2026-11-04', null, { nome: 'treino e', stravaId: 3 }),
    session('2026-11-05', null, { nome: 'Bônus opcional · Ombros', stravaId: 4 }),
  ]
  assert.deepEqual(resumoSemanal(s, ref), { base: 1, bonus: 3 })
})
test('sessao inacabada e semana anterior nao contam', () => {
  assert.deepEqual(resumoSemanal([
    session('2026-11-02', 'A', { finalizadaEm: null }),
    session('2026-11-01', 'B'),
    session('2026-11-08', 'C'),
  ], ref), { base: 1, bonus: 0 })
})
test('mesmo Strava ID nao duplica', () => {
  const a = session('2026-11-03', null, { stravaId: 19 })
  assert.deepEqual(resumoSemanal([a, {...a, id: 999}], ref), { base: 1, bonus: 0 })
})
test('app e Strava do mesmo treino contam uma vez em qualquer ordem', () => {
  const a = session('2026-11-03', 'A')
  const b = session('2026-11-03', null, { stravaId: 19,
    iniciadaEm: stamp('2026-11-03', '10:03'), finalizadaEm: stamp('2026-11-03', '10:43') })
  assert.deepEqual(resumoSemanal([a, b], ref), { base: 1, bonus: 0 })
  assert.deepEqual(resumoSemanal([b, a], ref), { base: 1, bonus: 0 })
})
test('sessoes diferentes em horarios distintos nao se fundem', () => {
  const a = session('2026-11-03', 'A')
  const b = session('2026-11-03', null, { stravaId: 20,
    iniciadaEm: stamp('2026-11-03', '16:00'), finalizadaEm: stamp('2026-11-03', '16:40') })
  assert.equal(possivelMesmoTreino(a, b), false)
  assert.deepEqual(resumoSemanal([a, b], ref), { base: 2, bonus: 0 })
})
test('dois registros manuais contam dois', () => {
  assert.deepEqual(resumoSemanal([session('2026-11-03', 'A'), session('2026-11-03', 'B')], ref), { base: 2, bonus: 0 })
})
test('manual sem letra nao conta', () => {
  assert.equal(tipoParaMeta(session('2026-11-03', null, { fonte: 'app' })), 'ignorar')
})
test('domingo e segunda sao semanas diferentes', () => {
  const monday = new Date('2026-11-09T12:00:00-03:00')
  assert.deepEqual(resumoSemanal([session('2026-11-08', 'A'), session('2026-11-09', 'B')], monday),
    { base: 1, bonus: 0 })
})
test('classificacoes divergentes A/E nunca sao fundidas', () => {
  const a = session('2026-11-03', 'A')
  const b = session('2026-11-03', 'E', { fonte: 'strava', stravaId: 22 })
  assert.deepEqual(resumoSemanal([a, b], ref), { base: 1, bonus: 1 })
})
test('domingo 23h30 Bahia nao entra na semana seguinte', () => {
  const s = session('2026-11-08', 'A', {
    iniciadaEm: '2026-11-08T23:30:00-03:00',
    finalizadaEm: '2026-11-08T23:50:00-03:00',
  })
  assert.deepEqual(resumoSemanal([s], new Date('2026-11-09T00:30:00-03:00')),
    { base: 0, bonus: 0 })
})
test('Forca B importada sem letra no banco conta base', () => {
  const s = session('2026-11-05', null, { nome: 'Força B · Inferior A', stravaId: 33 })
  assert.deepEqual(resumoSemanal([s], ref), { base: 1, bonus: 0 })
})
