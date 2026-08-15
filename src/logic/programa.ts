// Programa vigente desde 29/07/2026 — portado de treino_app/logic/schedule.py
// Split sem sobreposição de grupos. Peito é a prioridade declarada.

export type Bloco = 'BASE' | 'ACESS' | 'CORE'
export type LetraTreino = 'A' | 'B' | 'C' | 'D'

export interface Exercicio {
  nome: string
  series: number
  reps: string // "10-12", "8", "40s"
  pesoAtual: number
  pesoProg: number
  bloco: Bloco
  descanso: number // segundos, após marcar a série
}

export const DESCANSO_BLOCO: Record<Bloco, number> = { BASE: 90, ACESS: 60, CORE: 45 }

const ex = (
  nome: string, series: number, reps: string,
  pesoAtual: number, pesoProg: number, bloco: Bloco,
): Exercicio => ({ nome, series, reps, pesoAtual, pesoProg, bloco, descanso: DESCANSO_BLOCO[bloco] })

export const EXERCICIOS: Record<LetraTreino, Exercicio[]> = {
  A: [
    ex('Supino Reto Halter', 3, '8-10', 20, 22, 'BASE'),
    ex('Supino Inclinado Halter', 3, '10-12', 20, 22, 'BASE'),
    ex('Supino Reto Máquina', 2, '10-12', 40, 45, 'ACESS'),
    ex('Desenvolvimento Ombro Máquina', 3, '10-12', 30, 35, 'BASE'),
    ex('Elevação Lateral Polia', 2, '12-15', 9, 11, 'ACESS'),
    ex('Tríceps Corda Barra', 2, '12-15', 50, 55, 'ACESS'),
    ex('Prancha', 2, '40s', 0, 0, 'CORE'),
  ],
  B: [
    ex('Puxada Alta Polia', 3, '10-12', 45, 50, 'BASE'),
    ex('Remada Sentada c/ Pegada V', 3, '10-12', 45, 50, 'BASE'),
    ex('Remada Unilateral Halter', 2, '10-12', 24, 27, 'ACESS'),
    ex('Crucifixo Inverso Polia', 2, '12-15', 9, 11, 'ACESS'),
    ex('Rosca Direta Polia', 2, '12-15', 25, 26, 'ACESS'),
    ex('Rosca Martelo Halter', 2, '10-12', 14, 16, 'ACESS'),
    ex('Encolhimento Halter', 2, '12-15', 24, 27, 'ACESS'),
  ],
  C: [
    ex('Leg Press Horizontal', 3, '12-15', 100, 110, 'BASE'),
    ex('Cadeira Flexora', 3, '12-15', 41, 46, 'BASE'),
    ex('Cadeira Extensora', 2, '15-20', 63, 70, 'ACESS'),
    ex('Adução Quadril Máquina', 2, '15-20', 50, 55, 'ACESS'),
    ex('Abdução Quadril Máquina', 2, '15-20', 50, 55, 'ACESS'),
    ex('Panturrilha Sentado', 2, '15-20', 50, 55, 'ACESS'),
    ex('Elevação de Pernas', 2, '12', 0, 0, 'CORE'),
  ],
  D: [
    ex('Supino Inclinado Máquina', 3, '10-12', 40, 45, 'BASE'),
    ex('Crossover Polia', 2, '12-15', 13, 15, 'BASE'),
    ex('Crucifixo Máquina (Peck Deck)', 2, '12-15', 35, 40, 'ACESS'),
    ex('Elevação Lateral Halter', 2, '12-15', 8, 10, 'ACESS'),
    ex('Elevação Frontal Polia', 2, '12-15', 9, 11, 'ACESS'),
    ex('Tríceps Francês Polia', 2, '10-12', 25, 30, 'ACESS'),
  ],
}

export const ROTULOS: Record<LetraTreino, string> = {
  A: 'Peito · Ombro · Tríceps',
  B: 'Costas · Bíceps',
  C: 'Perna',
  D: 'Peito · Ombro · 2ª dose',
}

/** Nome completo, usado em toda a interface: "Treino A · Peito · Ombro · Tríceps" */
export function nomeTreino(letra: LetraTreino): string {
  return `Treino ${letra} · ${ROTULOS[letra]}`
}

// ── Agenda semanal ─────────────────────────────────────────────────────────────
// Seg = só corrida · Ter = A + Z1 · Qua = B + Z1 · Qui = descanso
// Sex = C + esteira · Sáb = D (eventual, não é bônus: é só o 4º dia) · Dom = descanso
// Meta real: 3 musculações/semana. Bater 3 é vitória.

export type TipoDia = 'treino' | 'corrida' | 'descanso'

export interface Corrida {
  tipo: string
  duracao: string
  descricao: string
}

export interface PlanoDia {
  tipo: TipoDia
  treino: LetraTreino | null
  eventual: boolean // Treino D: conta como 4º dia, meta segue sendo 3
  corrida: Corrida | null
}

// weekday JS: 0=Dom … 6=Sáb
export const PLANO_SEMANA: Record<number, PlanoDia> = {
  1: { tipo: 'corrida', treino: null, eventual: false, corrida: { tipo: 'Intervalada 1:1', duracao: '30-40 min', descricao: '1 min corre / 1 min anda. Dia sem musculação, corrida longa.' } },
  2: { tipo: 'treino', treino: 'A', eventual: false, corrida: { tipo: 'Z1 curta', duracao: '20 min', descricao: 'FC ≤ 130 bpm, depois da musculação.' } },
  3: { tipo: 'treino', treino: 'B', eventual: false, corrida: { tipo: 'Z1 curta', duracao: '20 min', descricao: 'FC ≤ 130 bpm, depois da musculação.' } },
  4: { tipo: 'descanso', treino: null, eventual: false, corrida: null },
  5: { tipo: 'treino', treino: 'C', eventual: false, corrida: { tipo: 'Esteira intervalada', duracao: '30-40 min', descricao: 'Dia sem corrida de rua, intervalada na esteira.' } },
  6: { tipo: 'treino', treino: 'D', eventual: true, corrida: null },
  0: { tipo: 'descanso', treino: null, eventual: false, corrida: null },
}

export const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
export const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function planoDoDia(d: Date = new Date()): PlanoDia {
  return PLANO_SEMANA[d.getDay()]
}

// ── Fila deslizante ────────────────────────────────────────────────────────────
// O treino do dia é sempre o POSTERIOR ao último concluído, nunca fixo por dia
// da semana (decisão de 14/08/2026). O ciclo é A → B → C → A. O D é a 2ª dose
// de peito: quando feito, a fila volta para A (peito já foi dobrado, recomeça).
const SUCESSOR: Record<LetraTreino, LetraTreino> = { A: 'B', B: 'C', C: 'A', D: 'A' }

export function proximaLetra(ultimoConcluido: LetraTreino | null): LetraTreino {
  return ultimoConcluido ? SUCESSOR[ultimoConcluido] : 'A'
}

export function totalSeries(letra: LetraTreino): number {
  return EXERCICIOS[letra].reduce((s, e) => s + e.series, 0)
}

// Volume: séries com peso contam peso × reps-alvo mínimo; corpo livre não soma
export function repsNum(reps: string): number {
  const m = reps.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}
