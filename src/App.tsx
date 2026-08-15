import { useEffect, useState } from 'react'
import TabBar, { type Aba } from './components/TabBar'
import Hoje from './screens/Hoje'
import Sessao from './screens/Sessao'
import Corrida from './screens/Corrida'
import Historico from './screens/Historico'
import Recuperacao from './screens/Recuperacao'
import Ajustes from './screens/Ajustes'
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
      {aba === 'ajustes' && <Ajustes />}
      <TabBar aba={aba} onChange={setAba} />
    </>
  )
}
