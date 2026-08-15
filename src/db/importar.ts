// Importa o histórico antigo (seed embutido no deploy: cache do app Streamlit
// + Strava até 14/08/2026). Roda uma vez por dispositivo; dedupe por stravaId.
import { db } from './schema'
import type { LetraTreino } from '../logic/programa'

interface SeedSessao {
  data: string
  nome: string
  letra: LetraTreino | null
  duracaoMin: number | null
  stravaId: number | null
}
interface SeedCorrida {
  data: string
  tipo: string
  distanciaKm: number | null
  duracaoMin: number | null
  paceMinKm: number | null
  fcMedia: number | null
  stravaId: number | null
}

export async function importarSeed(): Promise<void> {
  const feito = await db.config.get('seed_importado')
  if (feito) return
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}historico-seed.json`)
    if (!resp.ok) return
    const seed = await resp.json() as { sessoes: SeedSessao[]; corridas: SeedCorrida[] }

    const sessoes = seed.sessoes.map((s) => {
      const inicio = new Date(`${s.data}T12:00:00`)
      const fim = s.duracaoMin ? new Date(inicio.getTime() + s.duracaoMin * 60000) : inicio
      return {
        treino: s.letra,
        nome: s.nome,
        iniciadaEm: inicio.toISOString(),
        finalizadaEm: fim.toISOString(),
        volumeKg: 0,
        seriesFeitas: 0,
        seriesTotal: 0,
        fonte: 'strava' as const,
        stravaId: s.stravaId,
      }
    })
    const corridas = seed.corridas.map((c) => ({
      data: c.data,
      tipo: c.tipo,
      distanciaKm: c.distanciaKm,
      duracaoMin: c.duracaoMin,
      paceMinKm: c.paceMinKm,
      fcMedia: c.fcMedia,
      fonte: 'strava' as const,
      stravaId: c.stravaId,
    }))

    await db.transaction('rw', db.sessoes, db.corridas, db.config, async () => {
      // guarda DENTRO da transação: execuções concorrentes (StrictMode roda o
      // boot 2x em dev) serializam aqui e a segunda vê a trava — sem duplicar
      const ja = await db.config.get('seed_importado')
      if (ja) return
      await db.sessoes.bulkAdd(sessoes)
      await db.corridas.bulkAdd(corridas)
      await db.config.put({ chave: 'seed_importado', valor: new Date().toISOString() })
    })
  } catch {
    // sem rede no primeiro boot: tenta de novo no próximo
  }
}
