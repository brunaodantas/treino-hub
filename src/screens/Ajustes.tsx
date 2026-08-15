import { useEffect, useState } from 'react'
import { db } from '../db/schema'
import {
  appStrava, salvarAppStrava, stravaConectado, iniciarConexaoStrava,
  importarStrava, exportarPendencias,
} from '../sync/strava'
import {
  credenciaisIntervals, salvarCredenciaisIntervals, sincronizarIntervals,
} from '../sync/intervals'

function Status({ ok, textoOk, textoOff }: { ok: boolean; textoOk: string; textoOff: string }) {
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: ok ? 'var(--c-rest)' : 'var(--c-a)',
    }}>
      {ok ? `● ${textoOk}` : `○ ${textoOff}`}
    </span>
  )
}

export default function Ajustes() {
  const [stravaOk, setStravaOk] = useState(false)
  const [intervalsOk, setIntervalsOk] = useState(false)
  const [pendencias, setPendencias] = useState(0)
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const [formStrava, setFormStrava] = useState({ clientId: '', clientSecret: '' })
  const [formIntervals, setFormIntervals] = useState({ athleteId: '', apiKey: '' })
  const [ultimoSync, setUltimoSync] = useState<{ strava: string | null; intervals: string | null }>({ strava: null, intervals: null })

  async function carregar() {
    setStravaOk(await stravaConectado())
    const app = await appStrava()
    if (app) setFormStrava(app)
    const creds = await credenciaisIntervals()
    if (creds) { setIntervalsOk(true); setFormIntervals(creds) }
    setPendencias(await db.syncQueue.count())
    const s = await db.config.get('strava_ultimo_sync')
    const i = await db.config.get('intervals_ultimo_sync')
    setUltimoSync({ strava: s?.valor ?? null, intervals: i?.valor ?? null })
  }

  useEffect(() => { carregar() }, [])

  const fmtSync = (iso: string | null) =>
    iso ? `último sync ${new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'nunca sincronizou'

  async function rodar(fn: () => Promise<string>) {
    setOcupado(true); setMsg('')
    try { setMsg(await fn()) } catch (e) { setMsg(`Erro: ${e instanceof Error ? e.message : e}`) }
    setOcupado(false)
    carregar()
  }

  return (
    <div className="wrap screen">
      <div>
        <div className="eyebrow">Ajustes</div>
        <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.2rem, 11vw, 3.2rem)' }}>
          <span className="tipo">CONEXÕES</span>
        </h1>
      </div>

      {msg && <div className="card card-hint" style={{ ['--cor' as string]: 'var(--c-b)' }}><b>{msg}</b></div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="eyebrow">Strava</div>
          <Status ok={stravaOk} textoOk="Conectado" textoOff="Desconectado" />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--faint)', margin: '8px 0' }}>
          {fmtSync(ultimoSync.strava)}{pendencias > 0 && ` · ${pendencias} treino(s) aguardando envio`}
        </p>
        {!stravaOk && (
          <>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>
              Cole o Client ID e o Secret do seu app em strava.com/settings/api (uma vez só; a renovação do token é automática).
            </p>
            <input className="peso-edit" style={{ width: '100%', textAlign: 'left', marginBottom: 8 }} placeholder="Client ID" value={formStrava.clientId} onChange={(e) => setFormStrava({ ...formStrava, clientId: e.target.value.trim() })} />
            <input className="peso-edit" style={{ width: '100%', textAlign: 'left' }} placeholder="Client Secret" type="password" value={formStrava.clientSecret} onChange={(e) => setFormStrava({ ...formStrava, clientSecret: e.target.value.trim() })} />
            <button className="btn-main" style={{ ['--cor' as string]: 'var(--c-a)', marginTop: 12 }} disabled={ocupado}
              onClick={async () => { await salvarAppStrava(formStrava); await iniciarConexaoStrava() }}>
              Conectar Strava
            </button>
          </>
        )}
        {stravaOk && (
          <>
            <button className="btn-main" style={{ ['--cor' as string]: 'var(--c-a)' }} disabled={ocupado}
              onClick={() => rodar(async () => {
                const r = await importarStrava()
                const totM = await db.sessoes.count()
                const totC = await db.corridas.count()
                // "0 novas" é o caso normal quando o histórico já está em dia;
                // mostrar o total evita a leitura de que nada foi importado
                return r.sessoes + r.corridas === 0
                  ? `Nada novo no Strava. Você já tem ${totM} musculações e ${totC} corridas aqui.`
                  : `+${r.sessoes} musculação, +${r.corridas} corrida(s). Total: ${totM} e ${totC}.`
              })}>
              Importar atividades novas
            </button>
            {pendencias > 0 && (
              <button className="btn-ghost" disabled={ocupado}
                onClick={() => rodar(async () => {
                  const r = await exportarPendencias()
                  return `Enviado: ${r.enviadas} · falhas: ${r.erros}`
                })}>
                Enviar {pendencias} pendência(s) ao Strava
              </button>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="eyebrow">Intervals.icu</div>
          <Status ok={intervalsOk} textoOk="Configurado" textoOff="Sem credenciais" />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--faint)', margin: '8px 0' }}>{fmtSync(ultimoSync.intervals)}</p>
        <input className="peso-edit" style={{ width: '100%', textAlign: 'left', marginBottom: 8 }} placeholder="Athlete ID (i…)" value={formIntervals.athleteId} onChange={(e) => setFormIntervals({ ...formIntervals, athleteId: e.target.value.trim() })} />
        <input className="peso-edit" style={{ width: '100%', textAlign: 'left' }} placeholder="API Key" type="password" value={formIntervals.apiKey} onChange={(e) => setFormIntervals({ ...formIntervals, apiKey: e.target.value.trim() })} />
        <button className="btn-main" style={{ ['--cor' as string]: 'var(--c-run)', marginTop: 12 }} disabled={ocupado}
          onClick={() => rodar(async () => {
            await salvarCredenciaisIntervals(formIntervals)
            const r = await sincronizarIntervals()
            return `Recuperação sincronizada: ${r.dias} dias`
          })}>
          Salvar e sincronizar
        </button>
        <p style={{ fontSize: '0.72rem', color: 'var(--faint)', marginTop: 10, lineHeight: 1.5 }}>
          FC de repouso, sono e CTL/ATL. TSB é calculado aqui (CTL − ATL). Sem HRV, por decisão de 17/07.
        </p>
      </div>

      <div className="card">
        <div className="eyebrow">Apple Saúde e Huawei</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 8, lineHeight: 1.55 }}>
          Não precisam de conexão aqui. O relógio manda para o Apple Saúde, que repassa
          para o Strava e o Intervals.icu, e é de lá que este app lê. Passos, sono, peso
          e FC de repouso chegam por esse caminho.
        </p>
      </div>
    </div>
  )
}
