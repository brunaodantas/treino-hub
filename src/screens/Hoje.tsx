import { useEffect, useState } from 'react'
import {
  planoDoDia, proximaLetra, ROTULOS, totalSeries, DIAS_LONGOS,
  type LetraTreino,
} from '../logic/programa'
import { corDoPlano, COR_TREINO } from '../logic/cores'
import WeekStrip from '../components/WeekStrip'
import { db } from '../db/schema'

const LETRAS: LetraTreino[] = ['A', 'B', 'C', 'D']

// Frase do topo por tipo de dia. Varia com a data (determinístico, não sorteio:
// abrir o app duas vezes no mesmo dia não troca a frase).
const FRASES: Record<string, string[]> = {
  treino: [
    'Uma série de cada vez.',
    'Constância vence intensidade.',
    'Apareça. O resto é detalhe.',
    'Hoje entra no acumulado.',
    'A carga sobe devagar, e sobe.',
    'Treino feito é treino que conta.',
  ],
  corrida: [
    'Ritmo confortável já resolve.',
    'Devagar também é treino.',
    'O relógio registra, você só corre.',
    'Fácil hoje, forte depois.',
  ],
  descanso: [
    'Dormir é treino.',
    'Descanso programado, não dia perdido.',
    'O músculo cresce agora.',
    'Recuperar faz parte do plano.',
  ],
}

function fraseDoDia(tipo: string, d: Date): string {
  const lista = FRASES[tipo] ?? FRASES.treino
  const diaDoAno = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  return lista[diaDoAno % lista.length]
}

export default function Hoje({ onIniciar }: { onIniciar: (t: LetraTreino) => void }) {
  const agora = new Date()
  const plano = planoDoDia(agora)
  const cor = corDoPlano(plano)
  const [feitosHoje, setFeitosHoje] = useState<LetraTreino[]>([])
  const [sugerido, setSugerido] = useState<LetraTreino>('A')

  useEffect(() => {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    db.sessoes
      .where('iniciadaEm').above(inicio.toISOString())
      .and((s) => s.finalizadaEm !== null && s.treino !== null)
      .toArray()
      .then((ss) => setFeitosHoje(ss.map((s) => s.treino as LetraTreino)))
    // fila deslizante: sugere o posterior ao último concluído COM letra
    // (o histórico do Strava vem sem letra e não deve mover a fila)
    db.sessoes
      .orderBy('iniciadaEm').reverse()
      .filter((s) => s.finalizadaEm !== null && s.treino !== null)
      .first()
      .then((s) => setSugerido(proximaLetra((s?.treino as LetraTreino) ?? null)))
  }, [])

  const dataFmt = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

  return (
    <div className="wrap screen" style={{ ['--cor' as string]: cor }}>
      <div>
        <div className="eyebrow">{dataFmt}</div>
        <h1 className="hero-dia" style={{ marginTop: 8 }}>
          <span className="tipo" style={{ color: cor }}>{DIAS_LONGOS[agora.getDay()]}</span>
        </h1>
        <div className="hero-sub">{fraseDoDia(plano.tipo, agora)}</div>
      </div>

      <WeekStrip />

      {plano.corrida && (
        <div className="card card-hint" style={{ ['--cor' as string]: 'var(--c-run)' }}>
          <b>Corrida de hoje: {plano.corrida.tipo} · {plano.corrida.duracao}</b>
          <p>{plano.corrida.descricao}</p>
        </div>
      )}

      {plano.tipo === 'descanso' && (
        <div className="card card-hint" style={{ ['--cor' as string]: cor }}>
          <b>Dia de descanso no plano.</b>
          <p>Se quiser treinar mesmo assim, os treinos estão aí embaixo. Só não faça o mesmo grupo de ontem.</p>
        </div>
      )}

      <div className="eyebrow" style={{ marginTop: 24, marginBottom: 4 }}>
        Escolha o treino
      </div>

      {LETRAS.map((t) => {
        const feito = feitosHoje.includes(t)
        const eSugerido = t === sugerido && !feito
        return (
          <button
            key={t}
            className={`treino-opcao${eSugerido ? ' sugerido' : ''}${feito ? ' feito' : ''}`}
            style={{ ['--cor' as string]: COR_TREINO[t] }}
            onClick={() => onIniciar(t)}
          >
            <span className="letra">{t}</span>
            <span className="txt">
              <span className="nome">{ROTULOS[t]}</span>
              <span className="meta">
                {totalSeries(t)} séries
                {eSugerido && ' · próximo da fila'}
                {feito && ' · feito hoje'}
              </span>
            </span>
            <span className="seta">›</span>
          </button>
        )
      })}
    </div>
  )
}
