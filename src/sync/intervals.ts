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

  const hoje = new Date()
  const oldest = new Date(hoje.getTime() - 60 * 86400000).toISOString().slice(0, 10)
  const newest = hoje.toISOString().slice(0, 10)
  const url = `https://intervals.icu/api/v1/athlete/${creds.athleteId}/wellness?oldest=${oldest}&newest=${newest}`
  const resp = await fetch(url, {
    headers: { Authorization: 'Basic ' + btoa(`API_KEY:${creds.apiKey}`) },
  })
  if (!resp.ok) throw new Error(`Intervals respondeu ${resp.status}`)
  const dados = await resp.json() as Array<{
    id: string; restingHR: number | null; sleepSecs: number | null
    ctl: number | null; atl: number | null
  }>

  const linhas = dados.map((d) => ({
    data: d.id,
    // FCR < 65 é erro de sync do relógio, descartar (limiar pessoal)
    fcRepouso: d.restingHR && d.restingHR >= 65 ? d.restingHR : null,
    sonoHoras: d.sleepSecs ? Math.round((d.sleepSecs / 3600) * 10) / 10 : null,
    ctl: d.ctl,
    atl: d.atl,
  }))
  await db.wellness.bulkPut(linhas)
  await db.config.put({ chave: 'intervals_ultimo_sync', valor: new Date().toISOString() })
  return { dias: linhas.length }
}
