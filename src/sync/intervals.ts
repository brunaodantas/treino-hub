// Sync com o Intervals.icu, direto do navegador (a API libera CORS).
// Credenciais ficam no banco local do dispositivo, nunca no código.
// TSB NUNCA vem da API (retorna null): calcular sempre CTL − ATL.
import { db } from '../db/schema'

export interface CredsIntervals { athleteId: string; apiKey: string }

export async function credenciaisIntervals(): Promise<CredsIntervals | null> {
  const c = await db.config.get('intervals_creds')
  return c ? JSON.parse(c.valor) : null
}

export async function salvarCredenciaisIntervals(creds: CredsIntervals): Promise<void> {
  await db.config.put({ chave: 'intervals_creds', valor: JSON.stringify(creds) })
}

export async function sincronizarIntervals(): Promise<{ dias: number }> {
  const creds = await credenciaisIntervals()
  if (!creds) throw new Error('Sem credenciais do Intervals')

  // 1ª sincronização puxa o histórico inteiro; as seguintes só os últimos 60
  // dias, que é onde CTL/ATL ainda mudam de valor retroativamente
  const hoje = new Date()
  const jaSincronizou = (await db.config.get('intervals_ultimo_sync')) !== undefined
  const oldest = jaSincronizou
    ? new Date(hoje.getTime() - 60 * 86400000).toISOString().slice(0, 10)
    : '2015-01-01'
  const newest = hoje.toISOString().slice(0, 10)
  const url = `https://intervals.icu/api/v1/athlete/${creds.athleteId}/wellness?oldest=${oldest}&newest=${newest}`
  const resp = await fetch(url, {
    headers: { Authorization: 'Basic ' + btoa(`API_KEY:${creds.apiKey}`) },
  })
  if (!resp.ok) throw new Error(`Intervals respondeu ${resp.status}`)
  // o Intervals recebe do Apple Saúde: passos, sono, FC e peso chegam por aqui
  const dados = await resp.json() as Array<{
    id: string; restingHR: number | null; sleepSecs: number | null
    ctl: number | null; atl: number | null; weight: number | null; steps: number | null
  }>

  // merge por dia: onde a API manda null, preserva o que já estava gravado
  const existentes = await db.diario.bulkGet(dados.map((d) => d.id))
  const linhas = dados.map((d, i) => {
    const antes = existentes[i]
    const um = <T>(novo: T | null, velho: T | null | undefined) => novo ?? velho ?? null
    return {
      data: d.id,
      passos: um(d.steps ? Math.round(d.steps) : null, antes?.passos),
      calorias: antes?.calorias ?? null,
      // FCR < 65 é erro de sync do relógio, descartar (limiar pessoal)
      fcRepouso: um(d.restingHR && d.restingHR >= 65 ? Math.round(d.restingHR) : null, antes?.fcRepouso),
      sonoHoras: um(d.sleepSecs ? Math.round((d.sleepSecs / 3600) * 10) / 10 : null, antes?.sonoHoras),
      ctl: um(d.ctl !== null ? Math.round(d.ctl * 10) / 10 : null, antes?.ctl),
      atl: um(d.atl !== null ? Math.round(d.atl * 10) / 10 : null, antes?.atl),
      pesoKg: um(d.weight ? Math.round(d.weight * 10) / 10 : null, antes?.pesoKg),
    }
  })
  await db.diario.bulkPut(linhas)
  await db.config.put({ chave: 'intervals_ultimo_sync', valor: new Date().toISOString() })
  return { dias: linhas.length }
}
