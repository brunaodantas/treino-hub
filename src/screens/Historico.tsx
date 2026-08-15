import { useEffect, useState } from 'react'
import { db, type Sessao } from '../db/schema'
import { COR_TREINO } from '../logic/cores'
import { ROTULOS, type LetraTreino } from '../logic/programa'

function corDe(s: Sessao): string {
  return s.treino ? COR_TREINO[s.treino as LetraTreino] : 'var(--c-rest)'
}
function tituloDe(s: Sessao): string {
  if (s.treino && ROTULOS[s.treino as LetraTreino]) return `Treino ${s.treino} · ${ROTULOS[s.treino as LetraTreino]}`
  return s.nome || 'Musculação'
}
function duracaoMin(s: Sessao): number | null {
  if (!s.finalizadaEm) return null
  const m = Math.round((new Date(s.finalizadaEm).getTime() - new Date(s.iniciadaEm).getTime()) / 60000)
  return m > 0 ? m : null
}

export default function Historico() {
  const [sessoes, setSessoes] = useState<Sessao[]>([])

  useEffect(() => {
    db.sessoes
      .orderBy('iniciadaEm').reverse()
      .filter((s) => s.finalizadaEm !== null)
      .limit(60)
      .toArray()
      .then(setSessoes)
  }, [])

  const ultima = sessoes[0]

  return (
    <div className="wrap screen">
      <div>
        <div className="eyebrow">Histórico · musculação</div>
        {ultima ? (
          <>
            <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.2rem, 11vw, 3.2rem)' }}>
              <span className="apagado" style={{ fontSize: '0.4em', letterSpacing: '0.1em' }}>ÚLTIMO TREINO</span>
              <span className="tipo" style={{ color: corDe(ultima) }}>
                {ultima.treino ? `TREINO ${ultima.treino}` : 'FORÇA'}
              </span>
            </h1>
            <div className="hero-sub">
              {new Date(ultima.iniciadaEm).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).toUpperCase()}
              {duracaoMin(ultima) ? ` · ${duracaoMin(ultima)} MIN` : ''}
              {ultima.volumeKg > 0 ? ` · ${ultima.volumeKg.toLocaleString('pt-BR')} KG` : ''}
            </div>
          </>
        ) : (
          <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.2rem, 11vw, 3.2rem)' }}>
            <span className="tipo">MUSCULAÇÃO</span>
          </h1>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        {sessoes.map((s) => (
          <div key={s.id} className="hist-row" style={{ ['--cor' as string]: corDe(s) }}>
            <div className="hist-badge">{s.treino ?? '•'}</div>
            <div className="info">
              <div className="t1">{tituloDe(s)}</div>
              <div className="t2">
                {new Date(s.iniciadaEm).toLocaleDateString('pt-BR')}
                {duracaoMin(s) ? ` · ${duracaoMin(s)} min` : ''}
                {s.seriesTotal > 0 ? ` · ${s.seriesFeitas}/${s.seriesTotal} séries` : ''}
                {s.fonte === 'strava' ? ' · Strava' : ''}
              </div>
            </div>
            {s.volumeKg > 0 && <div className="num">{s.volumeKg.toLocaleString('pt-BR')} kg</div>}
          </div>
        ))}
      </div>
      {sessoes.length === 0 && (
        <div className="vazio">Nenhuma sessão ainda. O histórico importado aparece aqui no primeiro carregamento com internet.</div>
      )}
    </div>
  )
}
