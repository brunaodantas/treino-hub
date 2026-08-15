// Strava direto do navegador (endpoints liberam CORS).
// O refresh_token fica no banco local e o access_token é renovado sozinho
// antes de cada chamada: conectou uma vez, não "cai" mais.
import { db } from '../db/schema'
import type { LetraTreino } from '../logic/programa'
import { ROTULOS, nomeTreino } from '../logic/programa'

interface AppStrava { clientId: string; clientSecret: string }
interface TokensStrava { access: string; refresh: string; expiraEm: number }

const SCOPE = 'activity:read_all,activity:write'

async function cfg(chave: string): Promise<string | null> {
  const c = await db.config.get(chave)
  return c ? c.valor : null
}

export async function appStrava(): Promise<AppStrava | null> {
  const v = await cfg('strava_app')
  return v ? JSON.parse(v) : null
}

export async function salvarAppStrava(app: AppStrava): Promise<void> {
  await db.config.put({ chave: 'strava_app', valor: JSON.stringify(app) })
}

export async function stravaConectado(): Promise<boolean> {
  return (await cfg('strava_tokens')) !== null
}

// 1) redireciona para autorizar; o Strava volta com ?code=
export async function iniciarConexaoStrava(): Promise<void> {
  const app = await appStrava()
  if (!app) throw new Error('Informe Client ID e Secret primeiro')
  const url = new URL('https://www.strava.com/oauth/authorize')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', window.location.origin + import.meta.env.BASE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('approval_prompt', 'auto')
  url.searchParams.set('scope', SCOPE)
  window.location.href = url.toString()
}

// 2) chamado no boot quando a URL tem ?code=
export async function tratarCallbackStrava(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return false
  const app = await appStrava()
  if (!app) return false
  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: app.clientId, client_secret: app.clientSecret,
      code, grant_type: 'authorization_code',
    }),
  })
  if (!resp.ok) throw new Error(`Troca de código falhou: ${resp.status}`)
  const d = await resp.json()
  await salvarTokens({ access: d.access_token, refresh: d.refresh_token, expiraEm: d.expires_at })
  window.history.replaceState({}, '', window.location.pathname)
  return true
}

async function salvarTokens(t: TokensStrava): Promise<void> {
  await db.config.put({ chave: 'strava_tokens', valor: JSON.stringify(t) })
}

// renova sozinho quando faltar menos de 10 min para expirar
async function tokenValido(): Promise<string> {
  const raw = await cfg('strava_tokens')
  if (!raw) throw new Error('Strava não conectado')
  let t = JSON.parse(raw) as TokensStrava
  if (t.expiraEm * 1000 - Date.now() < 600000) {
    const app = await appStrava()
    if (!app) throw new Error('Config do app Strava sumiu')
    const resp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: app.clientId, client_secret: app.clientSecret,
        grant_type: 'refresh_token', refresh_token: t.refresh,
      }),
    })
    if (!resp.ok) throw new Error(`Renovação de token falhou: ${resp.status}`)
    const d = await resp.json()
    t = { access: d.access_token, refresh: d.refresh_token, expiraEm: d.expires_at }
    await salvarTokens(t)
  }
  return t.access
}

function letraDoNome(nome: string): LetraTreino | null {
  const m = nome.match(/(?:Treino|Força)\s+([A-D])\b/)
  return (m ? m[1] : null) as LetraTreino | null
}

// importa atividades novas (musculação e corrida), dedupe por stravaId.
// Começa da última atividade conhecida (menos 2 dias de folga), para nunca
// deixar lacuna nem depender de janela fixa.
export async function importarStrava(): Promise<{ sessoes: number; corridas: number }> {
  const token = await tokenValido()

  const ultimaSessao = await db.sessoes.orderBy('iniciadaEm').reverse()
    .filter((s) => s.stravaId != null).first()
  const ultimaCorrida = await db.corridas.orderBy('data').reverse()
    .filter((c) => c.stravaId != null).first()
  const marcos = [
    ultimaSessao ? new Date(ultimaSessao.iniciadaEm).getTime() : 0,
    ultimaCorrida ? new Date(ultimaCorrida.data + 'T00:00').getTime() : 0,
  ]
  const maisRecente = Math.max(...marcos)
  const desde = Math.floor(
    (maisRecente > 0 ? maisRecente - 2 * 86400000 : Date.now() - 30 * 86400000) / 1000,
  )

  const acts: Array<{
    id: number; name: string; type: string; start_date: string
    moving_time: number; distance: number; average_heartrate: number | null
  }> = []
  for (let pagina = 1; pagina <= 3; pagina++) {
    const resp = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${desde}&per_page=100&page=${pagina}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!resp.ok) throw new Error(`Strava respondeu ${resp.status}`)
    const lote = await resp.json() as typeof acts
    acts.push(...lote)
    if (lote.length < 100) break
  }

  let nSessoes = 0, nCorridas = 0
  for (const a of acts) {
    const dia = a.start_date.slice(0, 10)
    const minutos = a.moving_time / 60

    if (a.type === 'WeightTraining') {
      const existe = await db.sessoes.where('stravaId').equals(a.id).first()
      if (existe) continue
      // o histórico importado do seed veio sem stravaId, então a checagem acima
      // não o enxerga: sem esta segunda passada por dia+duração, cada
      // importação duplicaria as últimas semanas
      const mesmoDia = await db.sessoes
        .filter((s) => s.stravaId == null && s.iniciadaEm.slice(0, 10) === dia)
        .toArray()
      const gemea = mesmoDia.find((s) => {
        if (!s.finalizadaEm) return false
        const dur = (new Date(s.finalizadaEm).getTime() - new Date(s.iniciadaEm).getTime()) / 60000
        return Math.abs(dur - minutos) <= 3
      })
      if (gemea) { await db.sessoes.update(gemea.id!, { stravaId: a.id }); continue }
      const inicio = new Date(a.start_date)
      await db.sessoes.add({
        treino: letraDoNome(a.name),
        nome: a.name,
        iniciadaEm: inicio.toISOString(),
        finalizadaEm: new Date(inicio.getTime() + a.moving_time * 1000).toISOString(),
        volumeKg: 0, seriesFeitas: 0, seriesTotal: 0,
        fonte: 'strava', stravaId: a.id,
      })
      nSessoes++
    } else if (a.type === 'Run') {
      const existe = await db.corridas.where('stravaId').equals(a.id).first()
      if (existe) continue
      const mesmoDia = await db.corridas
        .filter((c) => c.stravaId == null && c.data === dia)
        .toArray()
      const gemea = mesmoDia.find((c) => Math.abs((c.duracaoMin ?? 0) - minutos) <= 3)
      if (gemea) { await db.corridas.update(gemea.id!, { stravaId: a.id }); continue }
      const km = Math.round((a.distance / 1000) * 100) / 100
      const min = Math.round((a.moving_time / 60) * 10) / 10
      await db.corridas.add({
        data: a.start_date.slice(0, 10),
        tipo: a.name,
        distanciaKm: km, duracaoMin: min,
        paceMinKm: km > 0.2 ? Math.round((min / km) * 100) / 100 : null,
        fcMedia: a.average_heartrate,
        fonte: 'strava', stravaId: a.id,
      })
      nCorridas++
    }
  }
  await db.config.put({ chave: 'strava_ultimo_sync', valor: new Date().toISOString() })
  return { sessoes: nSessoes, corridas: nCorridas }
}

// envia sessões finalizadas no app que estão na fila
// Falha NUNCA é só aviso que some: permanece na fila com o erro gravado.
export async function exportarPendencias(): Promise<{ enviadas: number; erros: number }> {
  const pendentes = await db.syncQueue.where('tipo').equals('strava_sessao').toArray()
  if (pendentes.length === 0) return { enviadas: 0, erros: 0 }
  const token = await tokenValido()
  let enviadas = 0, erros = 0

  for (const p of pendentes) {
    const { sessaoId, treino } = JSON.parse(p.payload) as { sessaoId: number; treino: LetraTreino }
    const s = await db.sessoes.get(sessaoId)
    if (!s || !s.finalizadaEm) { await db.syncQueue.delete(p.id!); continue }
    const dur = Math.max(60, Math.round((new Date(s.finalizadaEm).getTime() - new Date(s.iniciadaEm).getTime()) / 1000))
    const body = new URLSearchParams({
      // padrão único de nome no Strava; mudou aqui, mudou em todo lugar
      name: nomeTreino(treino),
      type: 'WeightTraining',
      // o Strava lê este campo como horário LOCAL do atleta; mandar o ISO em UTC
      // fazia a atividade aparecer 3h adiantada
      start_date_local: (() => {
        const d = new Date(s.iniciadaEm)
        const p = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
      })(),
      elapsed_time: String(dur),
      description: `${ROTULOS[treino]} · ${s.seriesFeitas}/${s.seriesTotal} séries · volume ${s.volumeKg} kg`,
    })
    try {
      const resp = await fetch('https://www.strava.com/api/v3/activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const d = await resp.json()
      await db.sessoes.update(sessaoId, { stravaId: d.id, fonte: 'app' })
      await db.syncQueue.delete(p.id!)
      enviadas++
    } catch (e) {
      await db.syncQueue.update(p.id!, {
        tentativas: p.tentativas + 1,
        ultimoErro: e instanceof Error ? e.message : String(e),
      })
      erros++
    }
  }
  return { enviadas, erros }
}
