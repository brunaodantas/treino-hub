import { SaxesParser } from 'saxes'
import { validarMedicao, type CampoCorporal, type MedicaoCorporal } from '../logic/composicao'

const TIPOS: Record<string, [CampoCorporal, Record<string, number>]> = {
  HKQuantityTypeIdentifierBodyMass: ['pesoKg', { kg: 1, g: 0.001, lb: 0.45359237 }],
  HKQuantityTypeIdentifierBodyMassIndex: ['imc', { count: 1 }],
  HKQuantityTypeIdentifierBodyFatPercentage: ['gorduraPct', { '%': 100 }],
  HKQuantityTypeIdentifierLeanBodyMass: ['massaMagraKg', { kg: 1, g: 0.001, lb: 0.45359237 }],
  HKQuantityTypeIdentifierHeight: ['alturaCm', { cm: 1, m: 100, in: 2.54, ft: 30.48 }],
  HKQuantityTypeIdentifierWaistCircumference: ['cinturaCm', { cm: 1, m: 100, in: 2.54 }],
}
export function criarLeitorApple() {
  const medicoes = new Map<string, MedicaoCorporal>()
  let ignorados = 0, raiz = false
  const parser = new SaxesParser({ xmlns: false })
  parser.on('opentag', tag => {
    if (tag.name === 'HealthData') raiz = true
    if (tag.name !== 'Record') return
    const a = tag.attributes as Record<string, string>
    const tipo = TIPOS[a.type]
    if (!tipo) return
    // A linha de base começa em 18/11. A medição diurna de 17/11 não entra.
    if (!a.startDate || a.startDate.slice(0, 10) < '2026-11-18') { ignorados++; return }
    const fator = tipo[1][a.unit]
    const v = Number(a.value) * fator
    const data = a.startDate.slice(0, 10)
    const horario = a.startDate.slice(11, 19)
    const origem = a.sourceName || 'Apple Saúde'
    // Mantém timestamps, fuso, fonte e tipo: não funde aparelhos ou métricas distintas.
    const id = JSON.stringify(['apple', a.type, a.startDate, a.endDate, origem, a.sourceVersion, a.device, a.unit, a.value])
    const m: MedicaoCorporal = { id, data, horario, origem, fonte: 'apple', contexto: 'nao-informado', valores: { [tipo[0]]: v } }
    try { validarMedicao(m); medicoes.set(id, m) } catch { ignorados++ }
  })
  return {
    escrever(texto: string) { parser.write(texto) },
    concluir() {
      parser.close()
      if (!raiz) throw new Error('Selecione o XML exportado pelo Apple Saúde.')
      return { medicoes: [...medicoes.values()], ignorados }
    },
  }
}
