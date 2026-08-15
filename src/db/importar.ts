// Importa o histórico consolidado (seed embutido no deploy):
//   Strava 2018→2026 (musculação, corrida, caminhada, pedalada, elíptico)
//   Apple Health 2015→2026 (passos, calorias, FC de repouso; já inclui o Huawei)
//   Intervals.icu 2025→2026 (sono, CTL/ATL, peso, FC de repouso)
// Roda uma vez por dispositivo. Registros de menos de 5 min e 500 m já foram
// descartados na geração: eram o relógio abrindo sozinho, não treino.
import { db } from './schema'
import type { LetraTreino } from '../logic/programa'

interface SeedSessao {
  treino: LetraTreino | null
  nome: string
  data: string
  duracaoMin: number | null
  fcMedia: number | null
}
interface SeedCorrida {
  data: string; tipo: string; nome: string
  distanciaKm: number | null; duracaoMin: number | null; fcMedia: number | null
}
interface SeedAtividade extends SeedCorrida {}
interface SeedDiario {
  data: string
  passos?: number; calorias?: number; fcRepouso?: number
  sonoHoras?: number; ctl?: number; atl?: number; pesoKg?: number
}

// meio-dia local: evita que a data escorregue para o dia anterior no fuso
function em(data: string, minutos: number | null) {
  const inicio = new Date(`${data}T12:00:00`)
  const fim = minutos ? new Date(inicio.getTime() + minutos * 60000) : inicio
  return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

export async function importarSeed(): Promise<void> {
  if (await db.config.get('seed_v2')) return
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}historico-seed.json`)
    if (!resp.ok) return
    const seed = await resp.json() as {
      sessoes: SeedSessao[]; corridas: SeedCorrida[]
      atividades: SeedAtividade[]; diario: SeedDiario[]
    }

    const sessoes = seed.sessoes.map((s) => {
      const { inicio, fim } = em(s.data, s.duracaoMin)
      return {
        treino: s.treino, nome: s.nome,
        iniciadaEm: inicio, finalizadaEm: fim,
        volumeKg: 0, seriesFeitas: 0, seriesTotal: 0,
        fonte: 'strava' as const, stravaId: null,
      }
    })
    const pace = (km: number | null, min: number | null) =>
      km && min ? Math.round((min / km) * 100) / 100 : null
    const corridas = seed.corridas.map((c) => ({
      data: c.data, tipo: c.tipo,
      distanciaKm: c.distanciaKm, duracaoMin: c.duracaoMin,
      paceMinKm: pace(c.distanciaKm, c.duracaoMin),
      fcMedia: c.fcMedia, fonte: 'strava' as const, stravaId: null,
    }))
    const atividades = seed.atividades.map((a) => ({
      data: a.data, tipo: a.tipo, nome: a.nome,
      distanciaKm: a.distanciaKm, duracaoMin: a.duracaoMin,
      fcMedia: a.fcMedia, fonte: 'strava' as const,
    }))
    const diario = seed.diario.map((d) => ({
      data: d.data,
      passos: d.passos ?? null,
      calorias: d.calorias ?? null,
      fcRepouso: d.fcRepouso ?? null,
      sonoHoras: d.sonoHoras ?? null,
      ctl: d.ctl ?? null,
      atl: d.atl ?? null,
      pesoKg: d.pesoKg ?? null,
    }))

    await db.transaction('rw', db.sessoes, db.corridas, db.atividades, db.diario, db.config, async () => {
      // a trava é relida DENTRO da transação: dois boots concorrentes
      // (StrictMode roda 2x em dev) serializam aqui e o segundo desiste
      if (await db.config.get('seed_v2')) return
      const primeiraVez = (await db.sessoes.count()) === 0
      if (!primeiraVez) {
        // dispositivo que já tinha o seed antigo: troca pelo consolidado,
        // preservando as sessões feitas no app (fonte !== 'strava')
        await db.sessoes.filter((s) => s.fonte === 'strava').delete()
        await db.corridas.filter((c) => c.fonte === 'strava').delete()
      }
      await db.sessoes.bulkAdd(sessoes)
      await db.corridas.bulkAdd(corridas)
      await db.atividades.bulkAdd(atividades)
      await db.diario.bulkPut(diario)
      await db.config.put({ chave: 'seed_v2', valor: new Date().toISOString() })
    })
  } catch {
    // sem rede no primeiro boot: tenta de novo no próximo
  }
}
