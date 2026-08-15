import { useEffect, useState } from 'react'
import { planoDoDia, proximaLetra, ROTULOS, totalSeries, DIAS_LONGOS, type LetraTreino } from '../logic/programa'
import { corDoPlano, COR_TREINO } from '../logic/cores'
import WeekStrip from '../components/WeekStrip'
import { db } from '../db/schema'

const TITULO_TIPO: Record<string, (t: LetraTreino | null) => string> = {
  treino: (t) => `TREINO ${t}`,
  corrida: () => 'CORRIDA',
  descanso: () => 'DESCANSO',
}

export default function Hoje({ onIniciar }: { onIniciar: (t: LetraTreino) => void }) {
  const agora = new Date()
  const planoBase = planoDoDia(agora)
  const [feitoHoje, setFeitoHoje] = useState<string | null>(null)
  const [proximo, setProximo] = useState<LetraTreino>('A')

  useEffect(() => {
    const inicio = new Date(agora); inicio.setHours(0, 0, 0, 0)
    db.sessoes
      .where('iniciadaEm').above(inicio.toISOString())
      .and((s) => s.finalizadaEm !== null)
      .first()
      .then((s) => setFeitoHoje(s ? s.treino : null))
    // fila deslizante: o treino de hoje é o posterior ao último concluído
    // COM letra identificada (sessões importadas sem letra não movem a fila)
    db.sessoes
      .orderBy('iniciadaEm').reverse()
      .filter((s) => s.finalizadaEm !== null && s.treino !== null)
      .first()
      .then((s) => setProximo(proximaLetra((s?.treino as LetraTreino) ?? null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // dia de musculação usa a fila, não a letra fixa do calendário;
  // se já treinou hoje, o hero mostra o que foi feito
  const plano = planoBase.tipo === 'treino'
    ? { ...planoBase, treino: (feitoHoje as LetraTreino) ?? proximo, eventual: false }
    : planoBase
  const cor = corDoPlano(plano)

  const dataFmt = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

  return (
    <div className="wrap screen" style={{ ['--cor' as string]: cor }}>
      <div>
        <div className="eyebrow">{DIAS_LONGOS[agora.getDay()]} · {dataFmt}</div>
        <h1 className="hero-dia" style={{ marginTop: 8 }}>
          <span className="apagado">HOJE</span>
          <span className="tipo" style={{ color: cor }}>{TITULO_TIPO[plano.tipo](plano.treino)}</span>
        </h1>
        <div className="hero-sub">
          {plano.tipo === 'treino' && plano.treino && ROTULOS[plano.treino].toUpperCase()}
          {plano.tipo === 'corrida' && plano.corrida && `${plano.corrida.tipo} · ${plano.corrida.duracao}`.toUpperCase()}
          {plano.tipo === 'descanso' && 'RECUPERAR. COMER. DORMIR.'}
        </div>
      </div>

      <WeekStrip />

      {plano.tipo === 'treino' && plano.treino && (
        <>
          {feitoHoje === plano.treino ? (
            <div className="card card-hint" style={{ ['--cor' as string]: cor }}>
              <b>Treino {plano.treino} concluído hoje.</b>
              <p>Registro salvo no histórico. Agora é comer e dormir.</p>
            </div>
          ) : (
            <button className="btn-main" onClick={() => onIniciar(plano.treino!)}>
              Iniciar Treino {plano.treino} · {totalSeries(plano.treino)} séries
            </button>
          )}
          {plano.corrida && (
            <div className="card card-hint" style={{ ['--cor' as string]: 'var(--c-run)' }}>
              <b>Corrida do dia: {plano.corrida.tipo} · {plano.corrida.duracao}</b>
              <p>{plano.corrida.descricao}</p>
            </div>
          )}
          {plano.eventual && (
            <div className="card card-hint" style={{ ['--cor' as string]: 'var(--c-rest)' }}>
              <b>4º dia da semana.</b>
              <p>A meta real é 3 musculações por semana. Se as 3 fixas saíram, este é ganho. Se o corpo pedir descanso, descanse sem culpa.</p>
            </div>
          )}
        </>
      )}

      {plano.tipo === 'corrida' && plano.corrida && (
        <div className="card card-hint" style={{ ['--cor' as string]: cor }}>
          <b>{plano.corrida.tipo} · {plano.corrida.duracao}</b>
          <p>{plano.corrida.descricao}</p>
          <p style={{ marginTop: 8 }}>Equipamento: palmilha plana de gel PU. Registre pelo relógio, o app importa do Strava.</p>
        </div>
      )}

      {plano.tipo === 'descanso' && (
        <>
          <div className="card card-hint" style={{ ['--cor' as string]: cor }}>
            <b>Dormir é treino.</b>
            <p>7 a 9 horas é quando o corpo constrói músculo de verdade. Descanso programado, não dia perdido.</p>
          </div>
          <div className="card card-hint" style={{ ['--cor' as string]: cor }}>
            <b>Proteína continua valendo.</b>
            <p>O músculo se repara o dia inteiro, inclusive hoje. Não derrube a ingestão porque não treinou.</p>
          </div>
        </>
      )}

      {plano.tipo !== 'treino' && (
        <OutroTreino onIniciar={onIniciar} />
      )}
    </div>
  )
}

// Dia sem musculação programada: permite puxar qualquer treino do ciclo.
// Sugestão, não obrigação (regra do app antigo: nada de travar por dia).
function OutroTreino({ onIniciar }: { onIniciar: (t: LetraTreino) => void }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button className="btn-ghost" onClick={() => setAberto(!aberto)}>
        Treinar mesmo assim
      </button>
      {aberto && (['A', 'B', 'C', 'D'] as LetraTreino[]).map((t) => (
        <button
          key={t}
          className="btn-ghost"
          style={{ color: COR_TREINO[t], borderColor: COR_TREINO[t] }}
          onClick={() => onIniciar(t)}
        >
          Treino {t} · {ROTULOS[t]}
        </button>
      ))}
    </>
  )
}
