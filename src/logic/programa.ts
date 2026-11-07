// Programa vigente desde 02/09/2026 — Superior/Inferior, 4 dias fixos (Seg/Ter/Qui/Sáb).
// Substituiu o split A/B/C/D (peito·ombro·tríceps / costas·bíceps / perna / peito·ombro 2ª dose)
// vigente de 29/07 a 01/09/2026, trocado por cansaço de rotina, não por problema técnico.
// Letras mantidas (A/B/C/D) para não quebrar o resto do app, mas o conteúdo mudou:
// A = Superior A (compostos) · B = Inferior A (pesado, joelho) · C = Superior B (acessórios) · D = Inferior B (leve, posterior de cadeia)
// Perna pesada continua 1x/semana (mesmo risco de joelho de antes). Superior ganhou frequência (2x/semana).

export type Bloco = 'BASE' | 'ACESS' | 'CORE'
export type LetraTreino = 'A' | 'B' | 'C' | 'D' | 'E'
export type TreinoBase = Exclude<LetraTreino, 'E'>
export const META_SEMANAL = 4
export const TREINOS_BASE: TreinoBase[] = ['A', 'B', 'C', 'D']
export const BONUS_DIAS = [3, 5] // quarta ou sexta; escolha livre sem obrigação

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
  // Superior A — compostos, um exercício de cada grupo (peito·costas·ombro·bíceps·tríceps),
  // pra fechar 2x/semana em tudo junto com Superior B. Reajustado em 02/09/2026.
  A: [
    ex('Supino Reto Halter', 3, '8-10', 20, 22, 'BASE'),
    ex('Puxada Alta Polia', 3, '10-12', 45, 50, 'BASE'),
    ex('Desenvolvimento Ombro Máquina', 2, '10-12', 30, 35, 'BASE'),
    ex('Rosca Direta Polia', 2, '12-15', 25, 26, 'ACESS'),
    ex('Tríceps Corda Barra', 2, '12-15', 50, 55, 'ACESS'),
    ex('Prancha', 2, '40s', 0, 0, 'CORE'),
  ],
  // Inferior A — pesado, único dia com carga no joelho. Igual ao antigo Treino C, já validado.
  B: [
    ex('Leg Press Horizontal', 3, '12-15', 100, 110, 'BASE'),
    ex('Cadeira Flexora', 3, '12-15', 41, 46, 'BASE'),
    ex('Cadeira Extensora', 2, '15-20', 63, 70, 'ACESS'),
    ex('Adução Quadril Máquina', 2, '15-20', 50, 55, 'ACESS'),
    ex('Abdução Quadril Máquina', 2, '15-20', 50, 55, 'ACESS'),
    ex('Panturrilha Sentado', 2, '15-20', 50, 55, 'ACESS'),
    ex('Elevação de Pernas', 2, '12', 0, 0, 'CORE'),
  ],
  // Superior B — acessórios, mesmo padrão peito·costas·ombro·bíceps·tríceps do A,
  // mais um extra de peito (prioridade declarada do Bruno desde 19/08/2026).
  // Reajustado em 02/09/2026: antes costas, bíceps e tríceps só apareciam aqui,
  // 1x/semana; agora aparecem em A e B, 2x/semana como o resto.
  C: [
    ex('Supino Inclinado Máquina', 2, '10-12', 40, 45, 'BASE'),
    ex('Crucifixo Máquina (Peck Deck)', 1, '12-15', 35, 40, 'ACESS'),
    ex('Remada Sentada c/ Pegada V', 3, '10-12', 45, 50, 'BASE'),
    ex('Elevação Lateral Halter', 2, '12-15', 8, 10, 'ACESS'),
    ex('Rosca Martelo Halter', 2, '10-12', 14, 16, 'ACESS'),
    ex('Tríceps Francês Polia', 2, '10-12', 25, 30, 'ACESS'),
      ],
  // Inferior B — leve, posterior de cadeia. Sem agachamento nem lunge (acordado em 02/09/2026).
  // Exercícios novos: pesoAtual é ponto de partida conservador, ajustar na 1ª sessão real.
  D: [
    ex('Levantamento Terra Romeno Halteres', 3, '10-12', 12, 14, 'BASE'),
    ex('Elevação Pélvica (Hip Thrust)', 3, '10-12', 20, 25, 'BASE'),
    ex('Panturrilha em Pé', 2, '15-20', 40, 45, 'ACESS'),
    // Volume transferido de A/C: ombros e braços recebem o 3º estímulo.
    ex('Elevação Lateral Halter', 2, '12-15', 8, 10, 'ACESS'),
    ex('Rosca Martelo Halter', 2, '10-12', 14, 16, 'ACESS'),
    ex('Tríceps Francês Polia', 1, '10-12', 25, 30, 'ACESS'),
  ],
  // Bônus opcional: curto, apenas acessórios de superior; nunca obrigatório.
  // Se houver fadiga de quinta, omitir ou reduzir. Não altera a fila A→D.
  E: [
    ex('Elevação Lateral Halter', 2, '12-15', 8, 10, 'ACESS'),
    ex('Rosca Martelo Halter', 2, '10-12', 14, 16, 'ACESS'),
    ex('Tríceps Francês Polia', 1, '10-12', 25, 30, 'ACESS'),
  ],
}

export const ROTULOS: Record<LetraTreino, string> = {
  A: 'Superior A · Peito · Costas · Ombro',
  B: 'Inferior A · Perna (pesado)',
  C: 'Superior B · Ombro · Braços',
  D: 'Inferior B leve · Posterior · Ombros · Braços',
  E: 'Bônus opcional · Ombros · Braços',
}

/** Nome completo, usado em toda a interface: "Treino A · Peito · Ombro · Tríceps" */
export function nomeTreino(letra: LetraTreino): string {
  return `Treino ${letra} · ${ROTULOS[letra]}`
}

// ── Agenda revisada: 4 dias fixos + 1 bônus opcional ─────────────────────────
// Segunda A (corrida intervalada à noite); terça B (caminhada de manhã);
// quarta descanso ou bônus; quinta C (caminhada de manhã);
// sexta corrida intervalada 1:1 e, eventualmente, bônus E;
// sábado D leve; domingo recuperação. Corrida sempre ajustável ao joelho.

export type TipoDia = 'treino' | 'corrida' | 'descanso'

export interface Corrida {
  tipo: string
  duracao: string
  descricao: string
}

export interface PlanoDia {
  tipo: TipoDia
  treino: LetraTreino | null
  eventual: boolean // sinaliza dia de bônus opcional, sem meta obrigatória
  corrida: Corrida | null
}

// weekday JS: 0=Dom … 6=Sáb
export const PLANO_SEMANA: Record<number, PlanoDia> = {
  1: { tipo: 'treino', treino: 'A', eventual: false, corrida: { tipo: 'Intervalada 1:1', duracao: 'ajustável', descricao: 'À noite, academia ou rua. Ajuste à recuperação.' } },
  2: { tipo: 'treino', treino: 'B', eventual: false, corrida: { tipo: 'Caminhada', duracao: 'pela manhã', descricao: 'Sem corrida longa junto da perna; respeite o joelho.' } },
  3: { tipo: 'descanso', treino: null, eventual: true, corrida: null },
  4: { tipo: 'treino', treino: 'C', eventual: false, corrida: { tipo: 'Caminhada', duracao: 'pela manhã', descricao: 'Atividade habitual; controle fadiga para o fim de semana.' } },
  5: { tipo: 'corrida', treino: null, eventual: true, corrida: { tipo: 'Intervalada 1:1', duracao: 'ajustável', descricao: 'Rua ou academia. Musculação apenas se optar pelo bônus.' } },
  6: { tipo: 'treino', treino: 'D', eventual: false, corrida: null },
  0: { tipo: 'descanso', treino: null, eventual: false, corrida: null },
}

export const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
export const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function planoDoDia(d: Date = new Date()): PlanoDia {
  return PLANO_SEMANA[d.getDay()]
}

// ── Fila deslizante ────────────────────────────────────────────────────────────
// O treino do dia é sempre o POSTERIOR ao último concluído, nunca fixo por dia
// da semana (decisão de 14/08/2026, mantida na troca de split de 02/09/2026).
// Ciclo: A (Superior A) → B (Inferior A) → C (Superior B) → D (Inferior B) → A.
// Como os 4 dias agora são estruturais (não há mais "D eventual"), a fila
// estabiliza sozinha no mesmo dia da semana se ele treinar sempre Seg/Ter/Qui/Sáb.
const SUCESSOR: Record<TreinoBase, TreinoBase> = { A: 'B', B: 'C', C: 'D', D: 'A' }

export function proximaLetra(ultimoConcluido: LetraTreino | null): LetraTreino {
  return ultimoConcluido && ultimoConcluido !== 'E' ? SUCESSOR[ultimoConcluido] : 'A'
}

export function totalSeries(letra: LetraTreino): number {
  return EXERCICIOS[letra].reduce((s, e) => s + e.series, 0)
}

// Volume: séries com peso contam peso × reps-alvo mínimo; corpo livre não soma
export function repsNum(reps: string): number {
  const m = reps.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

/** E nunca entra na fila deslizante: encontrar último treino BASE concluído. */
export function ultimoTreinoBase<T extends { treino: LetraTreino | null }>(sessoes: T[]): TreinoBase | null {
  return (sessoes.find(s => s.treino !== null && s.treino !== 'E')?.treino as TreinoBase | undefined) ?? null
}
