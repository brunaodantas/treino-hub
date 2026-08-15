import { useEffect, useState } from 'react'
import TabBar, { type Aba } from './components/TabBar'
import Hoje from './screens/Hoje'
import Sessao from './screens/Sessao'
import Corrida from './screens/Corrida'
import Historico from './screens/Historico'
import Recuperacao from './screens/Recuperacao'
import Ajustes from './screens/Ajustes'
import Evolucao from './screens/Evolucao'
import BotaoRecarregar from './components/BotaoRecarregar'
import { db } from './db/schema'
import { importarSeed } from './db/importar'
import { tratarCallbackStrava } from './sync/strava'
import { totalSeries, type LetraTreino } from './logic/programa'

interface SessaoAtiva { letra: LetraTreino; id: number }

export default function App() {
  const [aba, setAba] = useState<Aba>('hoje')
  const [sessao, setSessao] = useState<SessaoAtiva | null>(null)
  const [pronto, setPronto] = useState(false)

  // boot: histórico antigo (uma vez), retorno do OAuth do Strava e
  // crash recovery (se havia sessão aberta, volta direto pra ela)
  useEffect(() => {
    (async () => {
      await importarSeed()
      try {
        if (await tratarCallbackStrava()) setAba('ajustes')
      } catch { /* código inválido/expirado: usuário reconecta em Ajustes */ }
      const c = await db.config.get('sessao_ativa')
      if (c) {
        const { letra, id } = JSON.parse(c.valor) as SessaoAtiva
        const s = await db.sessoes.get(id)
        if (s && s.finalizadaEm === null) setSessao({ letra, id })
        else await db.config.delete('sessao_ativa')
      }
      setPronto(true)
    })()
  }, [])

  async function iniciar(letra: LetraTreino) {
    const id = await db.sessoes.add({
      treino: letra,
      iniciadaEm: new Date().toISOString(),
      finalizadaEm: null,
      volumeKg: 0,
      seriesFeitas: 0,
      seriesTotal: totalSeries(letra),
    })
    await db.config.put({ chave: 'sessao_ativa', valor: JSON.stringify({ letra, id }) })
    setSessao({ letra, id })
  }

  if (!pronto) return null

  if (sessao) {
    return <Sessao letra={sessao.letra} sessaoId={sessao.id} onFim={() => setSessao(null)} />
  }

  return (
    <>
      {aba === 'hoje' && <Hoje onIniciar={iniciar} />}
      {aba === 'corrida' && <Corrida />}
      {aba === 'historico' && <Historico />}
      {aba === 'recuperacao' && <Recuperacao />}
      {aba === 'evolucao' && <Evolucao />}
      {aba === 'ajustes' && <Ajustes />}
      <div className="acoes-topo">
        <button
          className={`btn-topo${aba === 'ajustes' ? ' ativo' : ''}`}
          onClick={() => setAba(aba === 'ajustes' ? 'hoje' : 'ajustes')}
          aria-label="Ajustes"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.4 13a7.6 7.6 0 0 0 .1-1 7.6 7.6 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.7l-2-3.4a.5.5 0 0 0-.6-.2l-2.5 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.4l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.4a.5.5 0 0 0 .1.7L4.5 11a7.6 7.6 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.7l2 3.4c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .3.2.5.5.5h4c.2 0 .5-.2.5-.4l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.4a.5.5 0 0 0-.1-.7L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
          </svg>
        </button>
        <BotaoRecarregar />
      </div>
      <TabBar aba={aba} onChange={setAba} />
    </>
  )
}
