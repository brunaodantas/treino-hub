export const CAMPOS = {
  pesoKg: ['Peso', 'kg', 500], imc: ['IMC', 'kg/m²', 150],
  gorduraPct: ['Gordura corporal', '%', 100], gorduraKg: ['Gordura corporal', 'kg', 300],
  musculoEsqueleticoKg: ['Músculo esquelético', 'kg', 200], musculoEsqueleticoPct: ['Músculo esquelético', '%', 100],
  massaMuscularKg: ['Massa muscular OKOK', 'kg', 300], massaMuscularPct: ['Massa muscular OKOK', '%', 100],
  massaMagraKg: ['Massa magra Apple Saúde', 'kg', 300],
  aguaPct: ['Água corporal', '%', 100], aguaKg: ['Água corporal', 'kg', 300],
  cinturaCm: ['Cintura', 'cm', 300], alturaCm: ['Altura', 'cm', 300],
  gorduraVisceral: ['Gordura visceral', 'índice', 100], basalKcal: ['Metabolismo basal estimado', 'kcal/dia', 10000],
} as const
export type CampoCorporal = keyof typeof CAMPOS
export interface MedicaoCorporal {
  id: string
  data: string // data local informada pela fonte, sem inventar horário
  horario?: string
  fonte: 'manual' | 'apple'
  origem: string
  contexto: 'jejum' | 'outro' | 'nao-informado'
  valores: Partial<Record<CampoCorporal, number>>
  observacao?: string
}
export function validarMedicao(m: MedicaoCorporal): void {
  if (!m || typeof m !== 'object' || typeof m.id !== 'string' || !m.id || m.data < '2026-11-18' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(m.data) || new Date(m.data + 'T12:00:00Z').toISOString().slice(0, 10) !== m.data ||
    !['manual', 'apple'].includes(m.fonte) || typeof m.origem !== 'string' ||
    !['jejum', 'outro', 'nao-informado'].includes(m.contexto) ||
    (m.horario !== undefined && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(m.horario))) throw new Error('Medição inválida: confira data e origem.')
  if (!m.valores || !Object.keys(m.valores).length) throw new Error('Preencha ao menos uma medida.')
  for (const [chave, v] of Object.entries(m.valores)) {
    if (!Object.hasOwn(CAMPOS, chave) || typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > CAMPOS[chave as CampoCorporal][2]) {
      throw new Error(`Valor inválido: ${CAMPOS[chave as CampoCorporal]?.[0] ?? chave}.`)
    }
  }
}
export function lerBackup(texto: string): MedicaoCorporal[] {
  const b = JSON.parse(texto)
  if (b.formato !== 'treino-hub-composicao-v1' || !Array.isArray(b.medicoes) || b.medicoes.length > 100000) throw new Error('Arquivo de composição corporal inválido.')
  b.medicoes.forEach(validarMedicao)
  return b.medicoes
}
