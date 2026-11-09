// Regras da meta semanal, independentes da UI e do banco.
export type LetraMeta = 'A' | 'B' | 'C' | 'D' | 'E'
export type SessaoParaMeta = {
  id?: number
  treino: LetraMeta | null
  nome?: string
  iniciadaEm: string
  finalizadaEm: string | null
  fonte?: 'app' | 'strava'
  stravaId?: number | null
}

const BASE = new Set(['A', 'B', 'C', 'D'])

export function letraDoNome(nome: string): LetraMeta | null {
  const match = nome.match(/(?:Treino|Força)\s+([A-E])\b/i)
  return (match?.[1].toUpperCase() as LetraMeta | undefined) ?? null
}

export function tipoParaMeta(s: SessaoParaMeta): 'base' | 'bonus' | 'ignorar' {
  if (!s.finalizadaEm) return 'ignorar'
  if (s.treino === 'E') return 'bonus'
  if (s.treino !== null) return BASE.has(s.treino) ? 'base' : 'ignorar'
  if (s.fonte !== 'strava') return 'ignorar'
  const nome = s.nome ?? ''
  if (letraDoNome(nome) === 'E' || /\bb[oô]nus\s+opcional\b/i.test(nome)) return 'bonus'
  // Sessões importadas como WeightTraining, sem letra, contam como força.
  return 'base'
}

export function inicioSemanaLocal(agora: Date): number {
  const d = new Date(agora)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

export function possivelMesmoTreino(a: SessaoParaMeta, b: SessaoParaMeta): boolean {
  if (!a.finalizadaEm || !b.finalizadaEm) return false
  const inicioA = Date.parse(a.iniciadaEm)
  const inicioB = Date.parse(b.iniciadaEm)
  const fimA = Date.parse(a.finalizadaEm)
  const fimB = Date.parse(b.finalizadaEm)
  if (![inicioA, inicioB, fimA, fimB].every(Number.isFinite)) return false
  const durA = (fimA - inicioA) / 60000
  const durB = (fimB - inicioB) / 60000
  if (durA <= 0 || durB <= 0) return false
  return Math.abs(inicioA - inicioB) <= 10 * 60000 && Math.abs(durA - durB) <= 3
}

export function resumoSemanal(sessoes: SessaoParaMeta[], agora: Date): { base: number; bonus: number } {
  const inicio = inicioSemanaLocal(agora)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 7) // Evita somar horas fixas em transições de fuso.
  const semana = sessoes.filter(s => {
    const t = Date.parse(s.iniciadaEm)
    return Number.isFinite(t) && t >= inicio && t < fim.getTime() && s.finalizadaEm !== null
  })
  const vistos = new Set<number>()
  const contaveis: SessaoParaMeta[] = []
  // Prioriza sessões do app quando houver duplicata ainda não vinculada.
  const ordenadas = [...semana].sort((a, b) => Number(a.fonte === 'strava') - Number(b.fonte === 'strava'))
  for (const s of ordenadas) {
    if (s.stravaId != null && vistos.has(s.stravaId)) continue
    if (s.stravaId != null) vistos.add(s.stravaId)
    const gemea = contaveis.some(x =>
      x.fonte !== s.fonte &&
      (x.fonte === 'strava' || s.fonte === 'strava') &&
      possivelMesmoTreino(x, s) &&
      (x.treino === null || s.treino === null || x.treino === s.treino) &&
      tipoParaMeta(x) === tipoParaMeta(s)
    )
    if (!gemea) contaveis.push(s)
  }
  return {
    base: contaveis.filter(s => tipoParaMeta(s) === 'base').length,
    bonus: contaveis.filter(s => tipoParaMeta(s) === 'bonus').length,
  }
}
