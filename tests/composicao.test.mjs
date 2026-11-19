import test from 'node:test'
import assert from 'node:assert/strict'
import { criarLeitorApple } from '../src/importacao/appleSaude.ts'
import { validarMedicao, lerBackup } from '../src/logic/composicao.ts'

const registro = (tipo, v, unit, dia = '2026-11-18', fonte = 'OKOK') => `<Record type="HKQuantityTypeIdentifier${tipo}" value="${v}" unit="${unit}" startDate="${dia} 06:15:00 -0300" endDate="${dia} 06:15:00 -0300" sourceName="${fonte}"/>`
function ler(xml) { const l = criarLeitorApple(); for (let i = 0; i < xml.length; i += 19) l.escrever(xml.slice(i, i + 19)); return l.concluir() }
test('XML em fragmentos converte unidades, preserva fontes, tipos e exclui 17/11', () => {
 const r = ler(`<HealthData>${registro('BodyMass',80.5,'kg')}${registro('BodyMass',85,'kg','2026-11-17')}${registro('LeanBodyMass',63,'kg')}${registro('BodyFatPercentage',0.2,'%')}${registro('Height',1.78,'m')}${registro('BodyMass',180,'lb','2026-11-19','Outro aparelho')}${registro('BodyMass',80.5,'kg')}</HealthData>`)
 assert.equal(r.medicoes.length,5); assert.equal(r.ignorados,1)
 assert.equal(r.medicoes[0].valores.pesoKg,80.5)
 assert.equal(r.medicoes[1].valores.massaMagraKg,63)
 assert.equal(r.medicoes[1].valores.massaMuscularKg,undefined)
 assert.equal(r.medicoes[2].valores.gorduraPct,20)
 assert.equal(r.medicoes[3].valores.alturaCm,178)
 assert.equal(r.medicoes[4].origem,'Outro aparelho')
 assert.ok(Math.abs(r.medicoes[4].valores.pesoKg - 81.6466) < .001)
 assert.equal(r.medicoes[0].contexto,'nao-informado')
})
test('malformado, unidade desconhecida, NaN e XXE não entram', () => {
 assert.throws(() => ler('<HealthData><Record></HealthData>'))
 assert.throws(() => ler('<!DOCTYPE HealthData [<!ENTITY x SYSTEM "https://example.com">]><HealthData>&x;</HealthData>'))
 assert.throws(() => ler('<outro/>'))
 assert.equal(ler(`<HealthData>${registro('BodyMass','NaN','kg')}${registro('BodyMass',84,'stone')}</HealthData>`).medicoes.length,0)
})
test('backup mantém campos distintos e campos vazios ausentes', () => {
 const m = { id:'teste',data:'2026-11-18',fonte:'manual',origem:'OKOK',contexto:'jejum',valores:{pesoKg:80.5,musculoEsqueleticoKg:30,massaMuscularKg:55} }
 assert.doesNotThrow(() => validarMedicao(m))
 const [v] = lerBackup(JSON.stringify({formato:'treino-hub-composicao-v1',medicoes:[m]}))
 assert.deepEqual(v,m); assert.equal(v.valores.cinturaCm,undefined)
 for(const valores of [{gorduraPct:101},{pesoKg:0},{pesoKg:NaN},{falso:12}]) assert.throws(() => validarMedicao({...m,valores}))
 assert.throws(() => validarMedicao({...m,data:'2026-11-17'}))
 assert.throws(() => validarMedicao({...m,data:'2026-11-31'}))
})
