import { useEffect, useMemo, useRef, useState } from 'react'
import { EXERCICIOS, ROTULOS, repsNum, type LetraTreino } from '../logic/programa'
import { COR_TREINO } from '../logic/cores'
import { db } from '../db/schema'

interface Props {
  letra: LetraTreino
  sessaoId: number
  onFim: () => void
}

// beep curto via Web Audio ao zerar o descanso
function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(); osc.stop(ctx.currentTime + 0.5)
  } catch { /* sem áudio, sem drama */ }
}

function fmt(seg: number): string {
  const m = Math.floor(seg / 60), s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Sessao({ letra, sessaoId, onFim }: Props) {
  const exercicios = EXERCICIOS[letra]
  const cor = COR_TREINO[letra]
  const totalSets = exercicios.reduce((s, e) => s + e.series, 0)

  // séries feitas: chave "exercicio|ordem"
  const [feitas, setFeitas] = useState<Set<string>>(new Set())
  const [pesos, setPesos] = useState<Record<string, number>>({})
  const [iniciadaEm, setIniciadaEm] = useState<string>(new Date().toISOString())
  const [agora, setAgora] = useState(Date.now())

  // descanso: timestamp-alvo (sobrevive a rerender; segundos restantes derivados)
  const [restAlvo, setRestAlvo] = useState<number | null>(null)
  const restDur = useRef(60)
  const beepou = useRef(false)

  // restaura sessão (crash recovery) + pesos personalizados
  useEffect(() => {
    db.sessoes.get(sessaoId).then((s) => { if (s) setIniciadaEm(s.iniciadaEm) })
    db.series.where('sessaoId').equals(sessaoId).toArray().then((rows) => {
      setFeitas(new Set(rows.map((r) => `${r.exercicio}|${r.ordem}`)))
    })
    db.pesos.toArray().then((rows) => {
      const p: Record<string, number> = {}
      rows.forEach((r) => { p[r.exercicio] = r.pesoKg })
      setPesos(p)
    })
  }, [sessaoId])

  // relógio global + countdown
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // wake lock: tela ligada durante a sessão, best-effort
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const pegar = () => navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    pegar()
    const rearm = () => { if (document.visibilityState === 'visible') pegar() }
    document.addEventListener('visibilitychange', rearm)
    return () => {
      document.removeEventListener('visibilitychange', rearm)
      lock?.release().catch(() => {})
    }
  }, [])

  const restRestante = restAlvo ? Math.max(0, Math.ceil((restAlvo - agora) / 1000)) : null
  useEffect(() => {
    if (restRestante === 0 && !beepou.current) { beepou.current = true; beep() }
    if (restRestante !== null && restRestante > 0) beepou.current = false
  }, [restRestante])

  const pesoDe = (nome: string, padrao: number) => pesos[nome] ?? padrao

  async function toggleSerie(exNome: string, ordem: number, descanso: number, pesoPadrao: number, reps: string) {
    const chave = `${exNome}|${ordem}`
    const novo = new Set(feitas)
    if (novo.has(chave)) {
      novo.delete(chave)
      await db.series.where({ sessaoId, exercicio: exNome }).and((r) => r.ordem === ordem).delete()
      setRestAlvo(null)
    } else {
      novo.add(chave)
      await db.series.add({
        sessaoId, exercicio: exNome, ordem,
        pesoKg: pesoDe(exNome, pesoPadrao), reps,
        feitaEm: new Date().toISOString(),
      })
      restDur.current = descanso
      setRestAlvo(Date.now() + descanso * 1000)
    }
    setFeitas(novo)
  }

  async function mudarPeso(exNome: string, v: number) {
    setPesos((p) => ({ ...p, [exNome]: v }))
    await db.pesos.put({ exercicio: exNome, pesoKg: v, atualizadoEm: new Date().toISOString() })
  }

  async function finalizar() {
    const rows = await db.series.where('sessaoId').equals(sessaoId).toArray()
    const volume = rows.reduce((s, r) => s + r.pesoKg * repsNum(r.reps), 0)
    await db.sessoes.update(sessaoId, {
      finalizadaEm: new Date().toISOString(),
      volumeKg: Math.round(volume),
      seriesFeitas: rows.length,
      seriesTotal: totalSets,
    })
    await db.config.delete('sessao_ativa')
    // fila para o Strava (envio implementado na fase 2)
    await db.syncQueue.add({
      tipo: 'strava_sessao',
      payload: JSON.stringify({ sessaoId, treino: letra }),
      criadoEm: new Date().toISOString(),
      tentativas: 0,
      ultimoErro: null,
    })
    onFim()
  }

  async function cancelar() {
    if (!confirm('Descartar a sessão? As séries marcadas serão apagadas.')) return
    await db.series.where('sessaoId').equals(sessaoId).delete()
    await db.sessoes.delete(sessaoId)
    await db.config.delete('sessao_ativa')
    onFim()
  }

  const decorrido = Math.max(0, Math.floor((agora - new Date(iniciadaEm).getTime()) / 1000))
  const feitasTotal = feitas.size
  const tudoFeito = feitasTotal >= totalSets

  const estilo = useMemo(() => ({ ['--cor' as string]: cor }), [cor])

  return (
    <div style={estilo}>
      <header className="sessao-head">
        <div>
          <div className="titulo">Treino {letra}</div>
          <div className="sets-progress"><b>{feitasTotal}</b> / {totalSets} séries</div>
        </div>
        <div className="cron">{fmt(decorrido)}</div>
      </header>

      <div className="wrap" style={{ paddingBottom: restAlvo ? 120 : 24 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>{ROTULOS[letra]}</div>

        {exercicios.map((e) => {
          const feitasEx = Array.from({ length: e.series }, (_, i) => feitas.has(`${e.nome}|${i + 1}`))
          const completo = feitasEx.every(Boolean)
          const peso = pesoDe(e.nome, e.pesoAtual)
          return (
            <div key={e.nome} className={`ex-card${completo ? ' completo' : ''}`}>
              <div className="ex-nome">{e.nome}</div>
              <div className="ex-meta">
                {e.series}×{e.reps} · descanso {e.descanso}s
                {e.pesoProg > 0 && <> · próx. alvo <span className="alvo">{e.pesoProg} kg</span></>}
              </div>
              <div className="ex-series">
                {feitasEx.map((feita, i) => (
                  <button
                    key={i}
                    className={`serie-circle${feita ? ' feita' : ''}`}
                    onClick={() => toggleSerie(e.nome, i + 1, e.descanso, e.pesoAtual, e.reps)}
                  >
                    {i + 1}
                  </button>
                ))}
                {e.pesoAtual > 0 && (
                  <input
                    className="peso-edit"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={peso}
                    onChange={(ev) => mudarPeso(e.nome, parseFloat(ev.target.value) || 0)}
                    aria-label={`Carga de ${e.nome} em kg`}
                  />
                )}
              </div>
            </div>
          )
        })}

        <button className="btn-main" onClick={finalizar}>
          {tudoFeito ? 'Finalizar treino' : `Finalizar com ${feitasTotal}/${totalSets}`}
        </button>
        <button className="btn-ghost" onClick={cancelar}>Descartar sessão</button>
      </div>

      {restAlvo !== null && restRestante !== null && restRestante > 0 && (
        <div className="rest-bar">
          <div>
            <div className="tempo">{fmt(restRestante)}</div>
            <div className="rotulo">Descanso</div>
          </div>
          <div className="ajuste">
            <button onClick={() => setRestAlvo((a) => (a ? a - 15000 : a))}>−15s</button>
            <button onClick={() => setRestAlvo((a) => (a ? a + 15000 : a))}>+15s</button>
            <button onClick={() => setRestAlvo(null)}>Pular</button>
          </div>
        </div>
      )}
    </div>
  )
}
