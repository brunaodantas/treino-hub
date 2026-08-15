import { useEffect, useState } from 'react'
import {
  planoDoDia, nomeTreino, totalSeries, DIAS_LONGOS,
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

// "hoje", "ontem", "há 3 dias": referência de quando foi o último treino
function quando(iso: string): string {
  const d = new Date(iso); d.setHours(0, 0, 0, 0)
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((hoje.getTime() - d.getTime()) / 86400000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function Hoje({ onIniciar }: { onIniciar: (t: LetraTreino) => void }) {
  const agora = new Date()
  const plano = planoDoDia(agora)
  const cor = corDoPlano(plano)
  const [ultimo, setUltimo] = useState<{ letra: LetraTreino; quando: string } | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [minutos, setMinutos] = useState('30')
  const [aviso, setAviso] = useState('')

  // marca o ÚLTIMO treino feito, não o próximo: quem escolhe é o Bruno,
  // o app só lembra de onde ele parou
  const carregarUltimo = () =>
    db.sessoes
      .orderBy('iniciadaEm').reverse()
      .filter((s) => s.finalizadaEm !== null && s.treino !== null)
      .first()
      .then((s) => setUltimo(
        s ? { letra: s.treino as LetraTreino, quando: quando(s.iniciadaEm) } : null,
      ))

  useEffect(() => { carregarUltimo() }, [])

  // treino feito fora do app (esqueceu de abrir, ou treinou sem o celular):
  // grava direto como concluído, sem série a série
  async function registrar(letra: LetraTreino) {
    const min = Math.max(1, parseInt(minutos, 10) || 30)
    const fim = new Date()
    const inicio = new Date(fim.getTime() - min * 60000)
    const sessaoId = await db.sessoes.add({
      treino: letra,
      nome: nomeTreino(letra),
      iniciadaEm: inicio.toISOString(),
      finalizadaEm: fim.toISOString(),
      volumeKg: 0,
      seriesFeitas: 0,
      seriesTotal: totalSeries(letra),
      fonte: 'app',
      stravaId: null,
    })
    // registro rápido também sobe pro Strava como WeightTraining; sem isso o
    // treino ficava só no app e sumia do resumo semanal
    await db.syncQueue.add({
      tipo: 'strava_sessao',
      payload: JSON.stringify({ sessaoId, treino: letra }),
      criadoEm: new Date().toISOString(),
      tentativas: 0,
      ultimoErro: null,
    })
    setRegistrando(false)
    setAviso(`Treino ${letra} registrado: ${min} min. Envie ao Strava em Ajustes.`)
    await carregarUltimo()
    setTimeout(() => setAviso(''), 4000)
  }

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
        {registrando ? 'Qual treino você fez?' : 'Escolha o treino'}
      </div>

      {registrando && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Duração</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="peso-edit" style={{ width: 90 }}
              type="number" inputMode="numeric" min="1"
              value={minutos} onChange={(e) => setMinutos(e.target.value)}
              aria-label="Duração em minutos"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              minutos · toque no treino abaixo para registrar
            </span>
          </div>
        </div>
      )}

      {LETRAS.map((t) => {
        const eUltimo = ultimo?.letra === t
        return (
          <button
            key={t}
            className={`treino-opcao${eUltimo ? ' ultimo' : ''}`}
            style={{ ['--cor' as string]: COR_TREINO[t] }}
            onClick={() => (registrando ? registrar(t) : onIniciar(t))}
          >
            <span className="letra">{t}</span>
            <span className="txt">
              <span className="nome">{nomeTreino(t)}</span>
              <span className="meta">
                {totalSeries(t)} séries
                {eUltimo && ` · último treino, ${ultimo.quando}`}
              </span>
            </span>
            <span className="seta">{registrando ? '✓' : '›'}</span>
          </button>
        )
      })}

      <button className="btn-ghost" onClick={() => setRegistrando(!registrando)}>
        {registrando ? 'Cancelar' : 'Registrar treino já feito'}
      </button>
      {aviso && <p className="g-nota" style={{ textAlign: 'center' }}>{aviso}</p>}
    </div>
  )
}
