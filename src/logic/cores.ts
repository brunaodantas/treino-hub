import type { LetraTreino, PlanoDia } from './programa'

export const COR_TREINO: Record<LetraTreino, string> = {
  A: 'var(--c-a)',
  B: 'var(--c-b)',
  C: 'var(--c-c)',
  D: 'var(--c-d)',
}

export function corDoPlano(p: PlanoDia): string {
  if (p.tipo === 'treino' && p.treino) return COR_TREINO[p.treino]
  if (p.tipo === 'corrida') return 'var(--c-run)'
  return 'var(--c-rest)'
}
