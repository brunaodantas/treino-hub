import { useEffect, useState } from 'react'
import { db, type DiaSaude } from '../db/schema'
import { credenciaisIntervals, sincronizarIntervals } from '../sync/intervals'

// Lê a tabela `diario`, que junta Apple Health (passos, calorias, FC; já traz
// o Huawei) e Intervals.icu (sono, CTL/ATL, peso). TSB é sempre CTL − ATL,
// calculado aqui: a API devolve tsb null.
export default function Recuperacao() {
  const [dias, setDias] = useState<DiaSaude[]>([])
  const [temCreds, setTemCreds] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [totalDias, setTotalDias] = useState(0)
  // passos vêm do Apple Health, que só atualiza quando você exporta à mão:
  // busca em toda a tabela e mostra de quando é, em vez de aparecer vazio
  const [ultPassos, setUltPassos] = useState<DiaSaude | null>(null)

  const carregar = async () => {
    setDias(await db.diario.orderBy('data').reverse().limit(30).toArray())
    setTotalDias(await db.diario.count())
    setUltPassos(
      (await db.diario.orderBy('data').reverse().filter((d) => d.passos !== null).first()) ?? null,
    )
  }

  useEffect(() => {
    carregar()
    credenciaisIntervals().then((c) => setTemCreds(c !== null))
  }, [])

  async function sincronizar() {
    setSincronizando(true)
    try { await sincronizarIntervals(); await carregar() } catch { /* Ajustes mostra o erro */ }
    setSincronizando(false)
  }

  // o dia de hoje pode ainda não ter métrica: usa o último com dado
  const ultimo = <K extends keyof DiaSaude>(campo: K): DiaSaude[K] | null =>
    dias.find((d) => d[campo] !== null && d[campo] !== undefined)?.[campo] ?? null

  const ctl = ultimo('ctl'), atl = ultimo('atl')
  const tsb = ctl !== null && atl !== null ? Math.round((ctl - atl) * 10) / 10 : null
  const fcr = ultimo('fcRepouso')
  const sono = ultimo('sonoHoras')
  const passos = ultimo('passos')
  const peso = ultimo('pesoKg')

  // limiares pessoais, não genéricos
  const corFcr = (v: number | null) =>
    v === null ? 'var(--faint)' : v <= 74 ? 'var(--c-rest)' : v <= 78 ? 'var(--c-c)' : 'var(--c-a)'
  const corTsb = (v: number | null) =>
    v === null ? 'var(--faint)' : v > -10 ? 'var(--c-rest)' : v >= -20 ? 'var(--c-c)' : 'var(--c-a)'

  const n = (v: number | null, casas = 0) =>
    v === null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

  return (
    <div className="wrap screen">
      <div>
        <div className="eyebrow">Recuperação{totalDias > 0 && ` · ${totalDias.toLocaleString('pt-BR')} dias`}</div>
        <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.2rem, 11vw, 3.2rem)' }}>
          <span className="tipo">COMO VOCÊ ESTÁ</span>
        </h1>
      </div>

      <div className="stat-grid">
        <div className="stat-big">
          <div className="v" style={{ color: corFcr(fcr) }}>{n(fcr)}</div>
          <div className="l">FC repouso · bpm</div>
        </div>
        <div className="stat-big">
          <div className="v" style={{ color: corTsb(tsb) }}>{tsb !== null ? String(tsb).replace('.', ',') : ''}</div>
          <div className="l">TSB · frescor</div>
        </div>
        <div className="stat-big">
          <div className="v">{sono !== null ? `${String(sono).replace('.', ',')}h` : ''}</div>
          <div className="l">Sono</div>
        </div>
        <div className="stat-big">
          <div className="v">{n(ctl)}</div>
          <div className="l">CTL · fitness</div>
        </div>
        <div className="stat-big">
          <div className="v">{n(passos ?? ultPassos?.passos ?? null)}</div>
          <div className="l">
            Passos{!passos && ultPassos && ` · ${new Date(`${ultPassos.data}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
          </div>
        </div>
        <div className="stat-big">
          <div className="v">{peso !== null ? `${n(peso, 1)}` : ''}</div>
          <div className="l">Peso · kg</div>
        </div>
      </div>

      {temCreds && (
        <button className="btn-ghost" onClick={sincronizar} disabled={sincronizando}>
          {sincronizando ? 'Sincronizando…' : 'Sincronizar com Intervals.icu'}
        </button>
      )}

      {dias.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Últimos dias</div>
          {dias.slice(0, 14).map((d) => {
            const t = d.ctl !== null && d.atl !== null ? Math.round((d.ctl - d.atl) * 10) / 10 : null
            return (
              <div key={d.data} className="hist-row" style={{ ['--cor' as string]: corFcr(d.fcRepouso) }}>
                <div className="info">
                  <div className="t1">{new Date(`${d.data}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                  <div className="t2">
                    {[
                      d.fcRepouso !== null && `FC ${d.fcRepouso}`,
                      d.sonoHoras !== null && `sono ${String(d.sonoHoras).replace('.', ',')}h`,
                      t !== null && `TSB ${String(t).replace('.', ',')}`,
                      d.passos !== null && `${n(d.passos)} passos`,
                    ].filter(Boolean).join(' · ') || 'sem dados'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {dias.length === 0 && (
        <div className="vazio">
          Sem dados ainda.<br />
          {temCreds ? 'Toque em sincronizar acima.' : 'Configure o Intervals.icu na aba Ajustes.'}
        </div>
      )}
    </div>
  )
}
