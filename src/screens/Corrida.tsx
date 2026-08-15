import { useEffect, useState } from 'react'
import { planoDoDia } from '../logic/programa'
import { db, type CorridaLog } from '../db/schema'

// Fase 1: registro manual + plano do dia. Import do Strava entra na fase 2.
export default function Corrida() {
  const plano = planoDoDia()
  const [corridas, setCorridas] = useState<CorridaLog[]>([])
  const [form, setForm] = useState({ km: '', min: '' })

  const carregar = () =>
    db.corridas.orderBy('data').reverse().limit(20).toArray().then(setCorridas)

  useEffect(() => { carregar() }, [])

  async function salvar() {
    const km = parseFloat(form.km.replace(',', '.'))
    const min = parseFloat(form.min.replace(',', '.'))
    if (!km || !min) return
    await db.corridas.add({
      data: new Date().toISOString().slice(0, 10),
      tipo: plano.corrida?.tipo ?? 'Livre',
      distanciaKm: km,
      duracaoMin: min,
      paceMinKm: Math.round((min / km) * 100) / 100,
      fcMedia: null,
      fonte: 'manual',
      stravaId: null,
    })
    setForm({ km: '', min: '' })
    carregar()
  }

  const ultima = corridas[0]
  const pace = (p: number | null) => {
    if (!p) return ''
    const m = Math.floor(p), s = Math.round((p - m) * 60)
    return `${m}'${String(s).padStart(2, '0')}"`
  }

  return (
    <div className="wrap screen" style={{ ['--cor' as string]: 'var(--c-run)' }}>
      <div>
        <div className="eyebrow">Corrida</div>
        <h1 className="hero-dia" style={{ marginTop: 8 }}>
          <span className="tipo" style={{ color: 'var(--c-run)' }}>
            {plano.corrida ? plano.corrida.tipo.toUpperCase() : 'SEM CORRIDA HOJE'}
          </span>
        </h1>
        {plano.corrida && <div className="hero-sub">{plano.corrida.duracao} · {plano.corrida.descricao}</div>}
      </div>

      {ultima && (
        <div className="stat-grid">
          <div className="stat-big"><div className="v">{String(ultima.distanciaKm).replace('.', ',')}</div><div className="l">km · última</div></div>
          <div className="stat-big"><div className="v">{pace(ultima.paceMinKm)}</div><div className="l">pace</div></div>
        </div>
      )}

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>Registrar manual</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="peso-edit" style={{ flex: 1, width: 'auto' }} placeholder="km" inputMode="decimal" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} />
          <input className="peso-edit" style={{ flex: 1, width: 'auto' }} placeholder="min" inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
        </div>
        <button className="btn-main" style={{ marginTop: 12 }} onClick={salvar}>Salvar corrida</button>
        <p style={{ fontSize: '0.72rem', color: 'var(--faint)', marginTop: 10, lineHeight: 1.5 }}>
          Corrida registrada no relógio chega sozinha pelo Strava na fase 2. Aqui é só o que ficou de fora.
        </p>
      </div>

      {corridas.map((c) => (
        <div key={c.id} className="hist-row" style={{ ['--cor' as string]: 'var(--c-run)' }}>
          <div className="hist-badge">🏃</div>
          <div className="info">
            <div className="t1">{c.tipo}</div>
            <div className="t2">{new Date(c.data + 'T12:00').toLocaleDateString('pt-BR')}</div>
          </div>
          <div className="num">{c.distanciaKm ?? ''} km · {pace(c.paceMinKm)}</div>
        </div>
      ))}
      {corridas.length === 0 && <div className="vazio">Nenhuma corrida registrada ainda.<br />A importação do Strava chega na fase 2.</div>}
    </div>
  )
}
