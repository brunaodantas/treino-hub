import { useEffect, useState } from 'react'
import { db, type Sessao, type CorridaLog, type Atividade } from '../db/schema'
import { COR_TREINO } from '../logic/cores'
import { nomeTreino, type LetraTreino } from '../logic/programa'

type Filtro = 'tudo' | 'musculacao' | 'corrida' | 'outras'

interface Item {
  chave: string
  data: string // YYYY-MM-DD
  titulo: string
  detalhe: string
  cor: string
  sigla: string
  numero: string
}

const COR_TIPO: Record<string, string> = {
  Corrida: 'var(--c-run)',
  Caminhada: 'var(--c-rest)',
  Pedalada: 'var(--c-b)',
  Elíptico: 'var(--c-d)',
}

const fmtPace = (p: number | null) => {
  if (!p) return ''
  const m = Math.floor(p), s = Math.round((p - m) * 60)
  return `${m}'${String(s).padStart(2, '0')}"/km`
}
const dia = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR')
const juntar = (...partes: (string | number | false | null | undefined)[]) =>
  partes.filter((p): p is string => typeof p === 'string' && p !== '').join(' · ')

function deSessao(s: Sessao): Item {
  const data = s.iniciadaEm.slice(0, 10)
  const letra = s.treino as LetraTreino | null
  const min = s.finalizadaEm
    ? Math.round((new Date(s.finalizadaEm).getTime() - new Date(s.iniciadaEm).getTime()) / 60000)
    : 0
  return {
    chave: `s${s.id}`,
    data,
    titulo: letra ? nomeTreino(letra) : (s.nome || 'Musculação'),
    detalhe: juntar(dia(data), min > 0 && `${min} min`, s.seriesTotal > 0 && `${s.seriesFeitas}/${s.seriesTotal} séries`),
    cor: letra ? COR_TREINO[letra] : 'var(--c-a)',
    sigla: letra ?? '💪',
    numero: s.volumeKg > 0 ? `${s.volumeKg.toLocaleString('pt-BR')} kg` : '',
  }
}

function deCorrida(c: CorridaLog): Item {
  return {
    chave: `c${c.id}`,
    data: c.data,
    titulo: c.tipo || 'Corrida',
    detalhe: juntar(dia(c.data), c.duracaoMin && `${c.duracaoMin} min`, fmtPace(c.paceMinKm), c.fcMedia && `${Math.round(c.fcMedia)} bpm`),
    cor: 'var(--c-run)',
    sigla: '🏃',
    numero: c.distanciaKm ? `${c.distanciaKm.toFixed(2).replace('.', ',')} km` : '',
  }
}

function deAtividade(a: Atividade): Item {
  return {
    chave: `a${a.id}`,
    data: a.data,
    titulo: a.tipo,
    detalhe: juntar(dia(a.data), a.duracaoMin && `${a.duracaoMin} min`, a.fcMedia && `${Math.round(a.fcMedia)} bpm`),
    cor: COR_TIPO[a.tipo] ?? 'var(--c-rest)',
    sigla: a.tipo === 'Pedalada' ? '🚴' : a.tipo === 'Caminhada' ? '🚶' : '🎿',
    numero: a.distanciaKm ? `${a.distanciaKm.toFixed(2).replace('.', ',')} km` : '',
  }
}

export default function Historico() {
  const [itens, setItens] = useState<Item[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [limite, setLimite] = useState(50)
  const [totais, setTotais] = useState({ m: 0, c: 0, o: 0 })

  useEffect(() => {
    (async () => {
      const [ss, cc, aa] = await Promise.all([
        db.sessoes.filter((s) => s.finalizadaEm !== null).toArray(),
        db.corridas.toArray(),
        db.atividades.toArray(),
      ])
      setTotais({ m: ss.length, c: cc.length, o: aa.length })
      const todos = [...ss.map(deSessao), ...cc.map(deCorrida), ...aa.map(deAtividade)]
      todos.sort((x, y) => y.data.localeCompare(x.data))
      setItens(todos)
    })()
  }, [])

  const filtrado = itens.filter((i) => {
    if (filtro === 'tudo') return true
    if (filtro === 'musculacao') return i.chave[0] === 's'
    if (filtro === 'corrida') return i.chave[0] === 'c'
    return i.chave[0] === 'a'
  })
  const visiveis = filtrado.slice(0, limite)
  const desde = itens.length ? itens[itens.length - 1].data.slice(0, 4) : ''

  const abas: Array<[Filtro, string]> = [
    ['tudo', `Tudo ${itens.length}`],
    ['musculacao', `Força ${totais.m}`],
    ['corrida', `Corrida ${totais.c}`],
    ['outras', `Outras ${totais.o}`],
  ]

  return (
    <div className="wrap screen">
      <div>
        <div className="eyebrow">Histórico{desde && ` · desde ${desde}`}</div>
        <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.4rem, 13vw, 3.6rem)' }}>
          <span className="tipo">{itens.length}</span>
        </h1>
        <div className="hero-sub">ATIVIDADES REGISTRADAS</div>
      </div>

      <div className="week-strip" style={{ marginTop: 16 }}>
        {abas.map(([f, rotulo]) => (
          <button
            key={f}
            className={`week-day${filtro === f ? ' hoje' : ''}`}
            style={{ ['--dia-cor' as string]: 'var(--c-a)' }}
            onClick={() => { setFiltro(f); setLimite(50) }}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        {visiveis.map((i) => (
          <div key={i.chave} className="hist-row" style={{ ['--cor' as string]: i.cor }}>
            <div className="hist-badge">{i.sigla}</div>
            <div className="info">
              <div className="t1">{i.titulo}</div>
              <div className="t2">{i.detalhe}</div>
            </div>
            {i.numero && <div className="num">{i.numero}</div>}
          </div>
        ))}
      </div>

      {filtrado.length > limite && (
        <button className="btn-ghost" onClick={() => setLimite((l) => l + 100)}>
          Ver mais ({filtrado.length - limite} restantes)
        </button>
      )}
      {itens.length === 0 && (
        <div className="vazio">Nada aqui ainda. O histórico baixa no primeiro acesso com internet.</div>
      )}
    </div>
  )
}
