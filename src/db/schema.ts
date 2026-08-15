// Banco local (IndexedDB via Dexie). Tudo grava aqui primeiro; sync depois.
import Dexie, { type Table } from 'dexie'
import type { LetraTreino } from '../logic/programa'

export interface Sessao {
  id?: number
  treino: LetraTreino | null // null = importada sem letra identificável
  nome?: string
  iniciadaEm: string // ISO
  finalizadaEm: string | null
  volumeKg: number
  seriesFeitas: number
  seriesTotal: number
  fonte?: 'app' | 'strava'
  stravaId?: number | null
}

export interface Serie {
  id?: number
  sessaoId: number
  exercicio: string
  ordem: number // 1ª, 2ª série…
  pesoKg: number
  reps: string
  feitaEm: string // ISO
}

export interface CorridaLog {
  id?: number
  data: string // YYYY-MM-DD
  tipo: string
  distanciaKm: number | null
  duracaoMin: number | null
  paceMinKm: number | null
  fcMedia: number | null
  fonte: 'manual' | 'strava'
  stravaId: number | null
}

export interface Wellness {
  data: string // YYYY-MM-DD, chave
  fcRepouso: number | null
  sonoHoras: number | null
  ctl: number | null
  atl: number | null
  // TSB nunca vem da API: calcular sempre CTL − ATL
}

// Caminhada, pedalada, elíptico: entram no histórico, não no plano de treino
export interface Atividade {
  id?: number
  data: string // YYYY-MM-DD
  tipo: string
  nome: string
  distanciaKm: number | null
  duracaoMin: number | null
  fcMedia: number | null
  fonte: 'manual' | 'strava'
}

// Uma linha por dia, com o que cada fonte tiver. Apple Health (que já recebe
// o Huawei) traz passos, calorias e FC; o Intervals traz sono, CTL/ATL e peso.
export interface DiaSaude {
  data: string // YYYY-MM-DD, chave
  passos: number | null
  calorias: number | null
  fcRepouso: number | null
  sonoHoras: number | null
  ctl: number | null
  atl: number | null
  pesoKg: number | null
}

export interface PesoExercicio {
  exercicio: string // chave
  pesoKg: number
  atualizadoEm: string
}

export interface SyncItem {
  id?: number
  tipo: 'strava_sessao'
  payload: string // JSON
  criadoEm: string
  tentativas: number
  ultimoErro: string | null
}

export interface Config {
  chave: string
  valor: string
}

class TreinoDB extends Dexie {
  sessoes!: Table<Sessao, number>
  series!: Table<Serie, number>
  corridas!: Table<CorridaLog, number>
  wellness!: Table<Wellness, string>
  atividades!: Table<Atividade, number>
  diario!: Table<DiaSaude, string>
  pesos!: Table<PesoExercicio, string>
  syncQueue!: Table<SyncItem, number>
  config!: Table<Config, string>

  constructor() {
    super('treino-hub-v2')
    this.version(1).stores({
      sessoes: '++id, treino, iniciadaEm, finalizadaEm',
      series: '++id, sessaoId, exercicio, feitaEm',
      corridas: '++id, data, fonte, stravaId',
      wellness: 'data',
      pesos: 'exercicio',
      syncQueue: '++id, tipo, criadoEm',
      config: 'chave',
    })
    this.version(2).stores({
      sessoes: '++id, treino, iniciadaEm, finalizadaEm, stravaId',
    })
    this.version(3).stores({
      atividades: '++id, data, tipo',
      diario: 'data',
    })
  }
}

export const db = new TreinoDB()
