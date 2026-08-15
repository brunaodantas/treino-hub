import { useEffect, useState } from 'react'
import { db, type Wellness } from '../db/schema'
import { credenciaisIntervals, sincronizarIntervals } from '../sync/intervals'

// Lê o espelho local (tabela wellness), preenchido pelo sync com o Intervals.
// TSB é sempre CTL − ATL, calculado aqui: a API devolve tsb null.
export default function Recuperacao() {
  const [dias, setDias] = useState<Wellness[]>([])
  const [temCreds, setTemCreds] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  const carregar = () => db.wellness.orderBy('data').reverse().limit(7).toArray().then(setDias)

  useEffect(() => {
    carregar()
    credenciaisIntervals().then((c) => setTemCreds(c !== null))
  }, [])

  async function sincronizar() {
    setSincronizando(true)
    try { await sincronizarIntervals(); await carregar() } catch { /* Ajustes mostra o erro */ }
    setSincronizando(false)
  }

  const hoje = dias[0]
  const tsb = hoje && hoje.ctl !== null && hoje.atl !== null
    ? Math.round((hoje.ctl - hoje.atl) * 10) / 10
    : null

  // limiares pessoais, não genéricos
  const corFcr = (v: number | null) =>
    v === null ? 'var(--faint)' : v <= 74 ? 'var(--c-rest)' : v <= 78 ? 'var(--c-c)' : 'var(--c-a)'
  const corTsb = (v: number | null) =>
    v === null ? 'var(--faint)' : v > -10 ? 'var(--c-rest)' : v >= -20 ? 'var(--c-c)' : 'var(--c-a)'

  return (
    <div className="wrap screen">
      <div>
        <div className="eyebrow">Recuperação</div>
        <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.2rem, 11vw, 3.2rem)' }}>
          <span className="tipo">COMO VOCÊ ESTÁ</span>
        </h1>
      </div>

      <div className="stat-grid">
        <div className="stat-big">
          <div className="v" style={{ color: corFcr(hoje?.fcRepouso ?? null) }}>{hoje?.fcRepouso ?? ''}</div>
          <div className="l">FC repouso · bpm</div>
        </div>
        <div className="stat-big">
          <div className="v" style={{ color: corTsb(tsb) }}>{tsb !== null ? String(tsb).replace('.', ',') : ''}</div>
          <div className="l">TSB · frescor</div>
        </div>
        <div className="stat-big">
          <div className="v">{hoje?.sonoHoras !== null && hoje?.sonoHoras !== undefined ? `${String(hoje.sonoHoras).replace('.', ',')}h` : ''}</div>
          <div className="l">Sono</div>
        </div>
        <div className="stat-big">
          <div className="v">{hoje?.ctl !== null && hoje?.ctl !== undefined ? Math.round(hoje.ctl) : ''}</div>
          <div className="l">CTL · fitness</div>
        </div>
      </div>

      {temCreds && (
        <button className="btn-ghost" onClick={sincronizar} disabled={sincronizando}>
          {sincronizando ? 'Sincronizando…' : 'Sincronizar com Intervals.icu'}
        </button>
      )}
      {dias.length === 0 && (
        <div className="vazio">
          Sem dados de recuperação ainda.<br />
          {temCreds ? 'Toque em sincronizar acima.' : 'Configure o Intervals.icu na aba Ajustes.'}
        </div>
      )}
    </div>
  )
}
