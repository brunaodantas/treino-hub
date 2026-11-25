import { useEffect, useState } from 'react'
import type { RegistroCorporalDiario } from '../db/schema'
import { db } from '../db/schema'
import { GraficoLinha, GraficoBarras, Legenda, type Ponto } from '../components/Grafico'

type Janela = 90 | 180 | 365 | 'tudo'

interface Dados {
  semanas: Array<{ rotulo: string; musc: number; km: number }>
  forma: { ctl: Ponto[]; atl: Ponto[]; tsb: Ponto[] }
  peso: Ponto[]
  fcr: Ponto[]
  ultimo: { ctl: number | null; tsb: number | null; peso: number | null; fcr: number | null }
  variacaoPeso: number | null
}

// segunda-feira da semana da data, como chave YYYY-MM-DD.
// Formata em horário LOCAL: toISOString() converte para UTC e, no fuso do
// Brasil, joga a data para o dia anterior, desalinhando as chaves das semanas.
function dataLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function segunda(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return dataLocal(x)
}

async function carregar(dias: Janela): Promise<Dados> {
  const corte = dias === 'tudo' ? new Date(2015, 0, 1) : new Date()
  if (dias !== 'tudo') corte.setDate(corte.getDate() - dias)
  const corteISO = dataLocal(corte)

  const [sessoes, corridas, diario] = await Promise.all([
    db.sessoes.filter((s) => s.finalizadaEm !== null && s.iniciadaEm.slice(0, 10) >= corteISO).toArray(),
    db.corridas.filter((c) => c.data >= corteISO).toArray(),
    db.diario.filter((d) => d.data >= corteISO).toArray(),
  ])

  // esqueleto de semanas para não sumir com as vazias (que são justamente
  // as que interessam: semana sem treino tem que aparecer como zero)
  const mapa = new Map<string, { musc: number; km: number }>()
  const [ay, am, ad] = segunda(corte).split('-').map(Number)
  for (const d = new Date(ay, am - 1, ad); d <= new Date(); d.setDate(d.getDate() + 7)) {
    mapa.set(segunda(d), { musc: 0, km: 0 })
  }
  sessoes.forEach((s) => {
    const k = segunda(new Date(s.iniciadaEm))
    const e = mapa.get(k); if (e) e.musc += 1
  })
  corridas.forEach((c) => {
    const k = segunda(new Date(`${c.data}T12:00`))
    const e = mapa.get(k); if (e) e.km += c.distanciaKm ?? 0
  })
  const semanas = [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({
    rotulo: new Date(`${k}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    musc: v.musc,
    km: Math.round(v.km * 10) / 10,
  }))

  diario.sort((a, b) => a.data.localeCompare(b.data))
  const ptos = (f: (d: typeof diario[number]) => number | null): Ponto[] =>
    diario.map((d) => ({ x: d.data, y: f(d) }))

  const forma = {
    ctl: ptos((d) => d.ctl),
    atl: ptos((d) => d.atl),
    tsb: ptos((d) => (d.ctl !== null && d.atl !== null ? Math.round((d.ctl - d.atl) * 10) / 10 : null)),
  }
  const peso = ptos((d) => d.pesoKg)
  const fcr = ptos((d) => d.fcRepouso)

  const ult = <T,>(arr: Array<{ y: T | null }>): T | null =>
    [...arr].reverse().find((p) => p.y !== null)?.y ?? null
  const pesosValidos = peso.filter((p) => p.y !== null)
  const variacaoPeso = pesosValidos.length >= 2
    ? Math.round(((pesosValidos.at(-1)!.y! - pesosValidos[0].y!)) * 10) / 10
    : null

  return {
    semanas, forma, peso, fcr,
    ultimo: { ctl: ult(forma.ctl), tsb: ult(forma.tsb), peso: ult(peso), fcr: ult(fcr) },
    variacaoPeso,
  }
}

const hojeLocal = () => new Date().toLocaleDateString('sv-SE')
const vazioDiario = (data: string): RegistroCorporalDiario => ({ data, proteinaG: null, caloriasKcal: null, aguaMl: null, apetite: null, mounjaroAplicado: false, mounjaroHorario: null, efeitos: '' })

export default function Evolucao({ onComposicao }: { onComposicao: () => void }) {
  const [janela, setJanela] = useState<Janela>(90)
  const [d, setD] = useState<Dados | null>(null)
  const [diarioCorporal, setDiarioCorporal] = useState<RegistroCorporalDiario>(vazioDiario(hojeLocal()))
  const [salvo, setSalvo] = useState('')

  useEffect(() => { carregar(janela).then(setD) }, [janela])
  useEffect(() => {
    const data = hojeLocal()
    db.corporalDiario.get(data).then(r => setDiarioCorporal(r ?? vazioDiario(data)))
  }, [])
  async function salvarDiario() {
    await db.corporalDiario.put(diarioCorporal)
    setSalvo('Registro de hoje salvo neste dispositivo.')
    setTimeout(() => setSalvo(''), 3000)
  }

  if (!d) return <div className="wrap screen"><div className="vazio">Carregando…</div></div>

  const semanasVis = janela === 'tudo' ? d.semanas : d.semanas.slice(-Math.min(16, d.semanas.length))
  const mediaMusc = semanasVis.length
    ? Math.round((semanasVis.reduce((s, x) => s + x.musc, 0) / semanasVis.length) * 10) / 10
    : 0
  const kmTotal = Math.round(d.semanas.reduce((s, x) => s + x.km, 0))

  const n = (v: number | null, casas = 0) =>
    v === null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

  return (
    <div className="wrap screen">
      <div>
        <div className="eyebrow">Evolução corporal</div>
        <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.2rem, 11vw, 3.2rem)' }}>
          <span className="tipo">SEU CORPO</span>
        </h1>
        <div className="hero-sub">TENDÊNCIA, NÃO O DIA DE HOJE</div>
      </div>

      <div className="week-strip" style={{ marginTop: 16 }}>
        {([90, 180, 365, 'tudo'] as Janela[]).map((j) => (
          <button key={j}
            className={`week-day${janela === j ? ' hoje' : ''}`}
            style={{ ['--dia-cor' as string]: 'var(--c-a)' }}
            onClick={() => setJanela(j)}>
            {j === 'tudo' ? 'TUDO' : j === 365 ? '1 ANO' : `${j} DIAS`}
          </button>
        ))}
      </div>

      <button className="btn-main" onClick={onComposicao}>Composição corporal ›</button>
      <div className="card evolucao-diaria">
        <div className="eyebrow">Hoje · nutrição e apetite</div>
        <div className="evo-campos">
          <label>Proteína (g)<input inputMode="decimal" type="number" min="0" value={diarioCorporal.proteinaG ?? ''} onChange={e => setDiarioCorporal({ ...diarioCorporal, proteinaG: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          <label>Calorias (kcal)<input inputMode="numeric" type="number" min="0" value={diarioCorporal.caloriasKcal ?? ''} onChange={e => setDiarioCorporal({ ...diarioCorporal, caloriasKcal: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          <label>Água (ml)<input inputMode="numeric" type="number" min="0" value={diarioCorporal.aguaMl ?? ''} onChange={e => setDiarioCorporal({ ...diarioCorporal, aguaMl: e.target.value === '' ? null : Number(e.target.value) })} /></label>
        </div>
        <div className="eyebrow" style={{ marginTop: 16 }}>Apetite · 1 sem fome → 5 muita fome</div>
        <div className="evo-escala">{([1,2,3,4,5] as const).map(v => <button key={v} className={diarioCorporal.apetite === v ? 'ativo' : ''} onClick={() => setDiarioCorporal({ ...diarioCorporal, apetite: v })}>{v}</button>)}</div>
      </div>
      <div className="card evolucao-diaria">
        <div className="eyebrow">Mounjaro · acompanhamento</div>
        <label className="evo-check"><input type="checkbox" checked={diarioCorporal.mounjaroAplicado} onChange={e => setDiarioCorporal({ ...diarioCorporal, mounjaroAplicado: e.target.checked })} />Aplicação feita hoje</label>
        {diarioCorporal.mounjaroAplicado && <label>Horário<input type="time" value={diarioCorporal.mounjaroHorario ?? ''} onChange={e => setDiarioCorporal({ ...diarioCorporal, mounjaroHorario: e.target.value || null })} /></label>}
        <label>Efeitos percebidos, se houver<textarea rows={2} placeholder="Ex.: náusea, refluxo, constipação" value={diarioCorporal.efeitos} onChange={e => setDiarioCorporal({ ...diarioCorporal, efeitos: e.target.value })} /></label>
        <button className="btn-main" onClick={salvarDiario}>Salvar registro de hoje</button>
        {salvo && <p className="g-nota" role="status">{salvo}</p>}
        <p className="g-nota">Este registro serve para acompanhar padrões. Não altera dose nem faz recomendação de medicação.</p>
      </div>
      <div className="card">
        <div className="eyebrow">Musculação por semana</div>
        <p className="g-nota">
          Média de <b>{n(mediaMusc, 1)}</b> por semana {janela === 'tudo' ? `em todo o histórico (${semanasVis.length} semanas)` : `nas últimas ${semanasVis.length}`}. A linha tracejada é a meta de 3.
        </p>
        <GraficoBarras
          pontos={semanasVis.map((s) => ({ x: s.rotulo, y: s.musc }))}
          cor="var(--c-a)" meta={3} formato={(v) => String(Math.round(v))}
        />
        <div className="g-eixo-x"><span>{semanasVis[0]?.rotulo}</span><span>{semanasVis.at(-1)?.rotulo}</span></div>
      </div>

      <div className="card">
        <div className="eyebrow">Forma</div>
        <p className="g-nota">
          CTL é o preparo acumulado, ATL é o cansaço recente, TSB é a diferença.
          Hoje: CTL <b>{n(d.ultimo.ctl)}</b>, TSB <b>{n(d.ultimo.tsb, 1)}</b>.
        </p>
        <GraficoLinha
          series={[
            { nome: 'CTL', cor: 'var(--c-b)', pontos: d.forma.ctl },
            { nome: 'ATL', cor: 'var(--c-a)', pontos: d.forma.atl },
          ]}
        />
        <Legenda itens={[{ nome: 'CTL · preparo', cor: 'var(--c-b)' }, { nome: 'ATL · cansaço', cor: 'var(--c-a)' }]} />
      </div>

      <div className="card">
        <div className="eyebrow">TSB · frescor</div>
        <p className="g-nota">
          Acima de −10 você está recuperado. Abaixo de −20, fadigado.
        </p>
        <GraficoLinha
          series={[{ nome: 'TSB', cor: 'var(--c-run)', pontos: d.forma.tsb }]}
          zeroRef formato={(v) => v.toFixed(0)}
        />
      </div>

      <div className="card">
        <div className="eyebrow">Corrida por semana</div>
        <p className="g-nota">
          <b>{n(kmTotal)} km</b> no período.
        </p>
        <GraficoBarras
          pontos={semanasVis.map((s) => ({ x: s.rotulo, y: s.km }))}
          cor="var(--c-run)" formato={(v) => `${v.toFixed(0)} km`}
        />
      </div>

      <div className="card">
        <div className="eyebrow">Peso</div>
        <p className="g-nota">
          {d.ultimo.peso !== null
            ? <>Último: <b>{n(d.ultimo.peso, 1)} kg</b>{d.variacaoPeso !== null && d.variacaoPeso !== 0 && <> · {d.variacaoPeso > 0 ? '+' : ''}{n(d.variacaoPeso, 1)} kg no período</>}</>
            : 'Sem pesagem registrada no período.'}
        </p>
        <GraficoLinha series={[{ nome: 'Peso', cor: 'var(--c-c)', pontos: d.peso }]}
          conectar formato={(v) => `${v.toFixed(1)}`} />
      </div>

      <div className="card">
        <div className="eyebrow">FC de repouso</div>
        <p className="g-nota">
          Sua faixa normal vai até 74. Acima de 78 é atenção, acima de 80 é alerta.
          {d.ultimo.fcr !== null && <> Último: <b>{n(d.ultimo.fcr)} bpm</b>.</>}
        </p>
        <GraficoLinha series={[{ nome: 'FCR', cor: 'var(--c-d)', pontos: d.fcr }]}
          conectar formato={(v) => v.toFixed(0)} />
      </div>
    </div>
  )
}
