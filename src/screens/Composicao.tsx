import { useEffect, useRef, useState } from 'react'
import { db } from '../db/schema'
import { salvarMedicoes } from '../db/composicao'
import { CAMPOS, lerBackup, type CampoCorporal, type MedicaoCorporal } from '../logic/composicao'
import { GraficoLinha } from '../components/Grafico'

const campos = Object.keys(CAMPOS) as CampoCorporal[]
const formatar = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const diaHoje = () => new Date().toLocaleDateString('sv-SE')
const dataPt = (d: string) => d.split('-').reverse().join('/')
function detalhe(m: MedicaoCorporal) {
  return `${dataPt(m.data)}${m.horario ? ` às ${m.horario}` : ''} · ${m.origem} · ${m.contexto === 'jejum' ? 'em jejum' : m.contexto === 'outro' ? 'fora de jejum' : 'jejum não informado'}`
}
export default function Composicao({ onVoltar }: { onVoltar: () => void }) {
  const [medicoes, setMedicoes] = useState<MedicaoCorporal[]>([])
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [form, setForm] = useState(false)
  const [data, setData] = useState(diaHoje)
  const [horario, setHorario] = useState('')
  const [contexto, setContexto] = useState<MedicaoCorporal['contexto']>('nao-informado')
  const [origem, setOrigem] = useState('OKOK')
  const [valores, setValores] = useState<Partial<Record<CampoCorporal, string>>>({})
  const [campo, setCampo] = useState<CampoCorporal>('pesoKg')
  const [soJejum, setSoJejum] = useState(false)
  const [previa, setPrevia] = useState<MedicaoCorporal[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [ocupado, setOcupado] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [pagina, setPagina] = useState(0)
  const worker = useRef<Worker | null>(null)
  const carregar = () => db.composicao.orderBy('data').toArray().then(setMedicoes)
  useEffect(() => { carregar().catch(() => setErro('Não foi possível abrir as medições.')); return () => worker.current?.terminate() }, [])

  async function salvar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(''); setAviso(''); setOcupado(true)
    try {
      const preenchidos = Object.fromEntries(Object.entries(valores).filter(([, v]) => v?.trim()).map(([k, v]) => [k, Number(v!.replace(',', '.'))]))
      await salvarMedicoes([{ id: crypto.randomUUID(), data, ...(horario ? { horario } : {}), origem: origem.trim() || 'Manual', contexto, fonte: 'manual', valores: preenchidos }])
      await carregar(); setForm(false); setValores({}); setAviso('Medição salva neste dispositivo.')
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar.') }
    finally { setOcupado(false) }
  }
  function preparar(lista: MedicaoCorporal[], ignorados = 0) {
    const ids = new Set(medicoes.map(m => m.id))
    const unicas = [...new Map(lista.filter(m => m.data >= '2026-11-18').map(m => [m.id, m])).values()]
      .filter(m => !ids.has(m.id)).sort((a, b) => `${a.data}${a.horario ?? ''}`.localeCompare(`${b.data}${b.horario ?? ''}`))
    setPrevia(unicas); setSelecionados(new Set()); setPagina(0)
    setAviso(`${unicas.length} registros novos para conferir. ${ignorados + lista.filter(m => m.data < '2026-11-18').length} registros anteriores à linha de base ou inválidos ignorados. Selecione apenas as medições que deseja salvar.`)
    setOcupado(false)
  }
  async function abrir(arquivo?: File) {
    if (!arquivo) return
    setErro(''); setAviso(''); setPrevia([]); setOcupado(true); setProgresso(0)
    if (arquivo.name.toLowerCase().endsWith('.json')) {
      try { preparar(lerBackup(await arquivo.text())) }
      catch { setErro('Arquivo de composição inválido. Selecione um backup do Treino Hub.'); setOcupado(false) }
      return
    }
    if (!arquivo.name.toLowerCase().endsWith('.xml')) { setErro('Descompacte o ZIP no app Arquivos e selecione export.xml.'); setOcupado(false); return }
    worker.current?.terminate()
    const w = new Worker(new URL('../importacao/appleSaude.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = e => {
      if (e.data.progresso !== undefined) setProgresso(e.data.progresso)
      if (e.data.resultado) { preparar(e.data.resultado.medicoes, e.data.resultado.ignorados); w.terminate() }
      if (e.data.erro) { setErro('Não foi possível ler o XML. Confira se a exportação está completa.'); setOcupado(false); w.terminate() }
    }
    w.onerror = () => { setErro('Não foi possível processar o arquivo neste navegador.'); setOcupado(false); w.terminate() }
    w.postMessage(arquivo)
  }
  async function importar() {
    setOcupado(true); setErro('')
    try {
      const n = await salvarMedicoes(previa.filter(m => selecionados.has(m.id)))
      await carregar(); setPrevia([]); setSelecionados(new Set()); setAviso(`${n} registros salvos neste dispositivo.`)
    } catch { setErro('Não foi possível salvar. As medições existentes foram preservadas.') }
    finally { setOcupado(false) }
  }
  function exportar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ formato: 'treino-hub-composicao-v1', medicoes }, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `composicao-${diaHoje()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const filtradas = medicoes.filter(m => !soJejum || m.contexto === 'jejum')
  const pontos = filtradas.filter(m => m.valores[campo] !== undefined).sort((a, b) => `${a.data}${a.horario ?? ''}`.localeCompare(`${b.data}${b.horario ?? ''}`))
  const ultimo = pontos.at(-1)
  return <div className="wrap screen composicao">
    <button className="btn-ghost" onClick={onVoltar}>‹ Voltar à evolução</button>
    <h1>Composição corporal</h1>
    <p className="comp-nota">Medições locais, sem envio de arquivos. Linha de base a partir de 18/11/2026. Compare medições feitas nas mesmas condições.</p>
    <p className="comp-nota">Músculo esquelético, massa muscular OKOK e massa magra Apple Saúde são medidas diferentes. O app não as converte nem substitui.</p>
    <button className="btn-main" onClick={() => setForm(!form)} disabled={ocupado}>{form ? 'Fechar cadastro' : 'Nova medição manual'}</button>
    {form && <form onSubmit={salvar} className="comp-form">
      <label>Data<input type="date" min="2026-11-18" max={diaHoje()} required value={data} onChange={e => setData(e.target.value)} /></label>
      <label>Horário, se conhecido<input type="time" value={horario} onChange={e => setHorario(e.target.value)} /></label>
      <label>Origem<input value={origem} maxLength={100} onChange={e => setOrigem(e.target.value)} /></label>
      <label>Condição<select aria-label="Condição" value={contexto} onChange={e => setContexto(e.target.value as typeof contexto)}><option value="nao-informado">Jejum não informado</option><option value="jejum">Em jejum</option><option value="outro">Fora de jejum</option></select></label>
      <p className="comp-nota">Preencha somente os valores medidos. Campos vazios ficam sem dado.</p>
      <div className="comp-campos">{campos.map(k => <label key={k}>{CAMPOS[k][0]} ({CAMPOS[k][1]})<input inputMode="decimal" value={valores[k] ?? ''} onChange={e => setValores({ ...valores, [k]: e.target.value })} /></label>)}</div>
      <button className="btn-main" type="submit" disabled={ocupado}>Salvar medição</button>
    </form>}
    <details className="comp-import"><summary>Importar Apple Saúde ou backup</summary>
      <p className="comp-nota">No iPhone: Saúde › sua foto › Exportar Todos os Dados de Saúde › Salvar em Arquivos. No app Arquivos, toque no ZIP para descompactar. Aqui, escolha export.xml dentro da pasta exportada.</p>
      <p className="comp-nota">Serão lidos apenas peso, IMC, gordura, massa magra, altura e cintura a partir de 18/11/2026. Nenhum treino é importado por este caminho. Confira origem, horário e valores na prévia. Jejum não é informado pelo Apple Saúde.</p>
      <label className="comp-arquivo">Selecionar XML ou backup JSON<input type="file" accept=".xml,.json" disabled={ocupado} onChange={e => { abrir(e.target.files?.[0]); e.target.value = '' }} /></label>
    </details>
    {ocupado && <p role="status">Processando{progresso ? `: ${progresso}%` : '…'}</p>}
    {aviso && <p className="comp-nota" role="status">{aviso}</p>}
    {erro && <p className="comp-erro" role="alert">{erro}</p>}
    {previa.length > 0 && <section className="comp-previa"><h2>Conferir importação</h2>
      <p className="comp-nota">{selecionados.size} de {previa.length} selecionados. Nada é salvo antes de confirmar.</p>
      <button className="btn-ghost" onClick={() => setSelecionados(new Set(previa.map(m => m.id)))}>Selecionar todos</button>
      <button className="btn-ghost" onClick={() => setSelecionados(new Set())}>Desmarcar todos</button>
      {previa.slice(pagina * 30, (pagina + 1) * 30).map(m => <label className="comp-registro" key={m.id}><input type="checkbox" checked={selecionados.has(m.id)} onChange={e => setSelecionados(atual => { const n = new Set(atual); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n })} /><span>{detalhe(m)}<br />{Object.entries(m.valores).map(([k, v]) => `${CAMPOS[k as CampoCorporal][0]}: ${formatar(v)} ${CAMPOS[k as CampoCorporal][1]}`).join(' · ')}</span></label>)}
      <div className="comp-paginacao"><button disabled={!pagina} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>{pagina + 1}/{Math.ceil(previa.length / 30)}</span><button disabled={(pagina + 1) * 30 >= previa.length} onClick={() => setPagina(pagina + 1)}>Próxima</button></div>
      <button className="btn-main" disabled={ocupado || !selecionados.size} onClick={importar}>Salvar {selecionados.size} registros selecionados</button>
      <button className="btn-ghost" disabled={ocupado} onClick={() => { setPrevia([]); setSelecionados(new Set()) }}>Cancelar importação</button>
    </section>}
    <section className="comp-grafico"><h2>Histórico e gráficos</h2>
      <label>Medida<select aria-label="Medida" value={campo} onChange={e => setCampo(e.target.value as CampoCorporal)}>{campos.map(k => <option key={k} value={k}>{CAMPOS[k][0]} ({CAMPOS[k][1]})</option>)}</select></label>
      <label className="comp-check"><input type="checkbox" checked={soJejum} onChange={e => setSoJejum(e.target.checked)} />Somente medições em jejum</label>
      {ultimo ? <><p className="comp-valor">{formatar(ultimo.valores[campo]!)} <small>{CAMPOS[campo][1]}</small></p><p className="comp-nota">{detalhe(ultimo)}</p>
        {pontos.length > 1 ? <><GraficoLinha series={[{ nome: CAMPOS[campo][0], cor: 'var(--c-run)', pontos: pontos.map(m => ({ x: m.data, y: m.valores[campo]! })) }]} conectar formato={formatar} /><p className="comp-nota">{dataPt(pontos[0].data)} a {dataPt(ultimo.data)} · {pontos.length} medições em ordem cronológica, com espaçamento uniforme.</p></> : <p className="comp-nota">A primeira medição está registrada. O gráfico aparecerá com a próxima medição desta medida.</p>}
      </> : <p className="comp-nota">Sem medição desta medida{soJejum ? ' em jejum' : ''}. Cadastre um valor ou importe um arquivo.</p>}
      <details><summary>Ver valores e fontes ({pontos.length})</summary>{[...pontos].reverse().map(m => <div className="comp-registro" key={m.id}><span>{detalhe(m)}<br />{formatar(m.valores[campo]!)} {CAMPOS[campo][1]}</span></div>)}</details>
    </section>
    <details><summary>Todas as medições ({medicoes.length})</summary>{[...medicoes].reverse().map(m => <div key={m.id} className="comp-registro"><span>{detalhe(m)}<br />{Object.entries(m.valores).map(([k, v]) => `${CAMPOS[k as CampoCorporal][0]}: ${formatar(v)} ${CAMPOS[k as CampoCorporal][1]}`).join(' · ')}</span></div>)}</details>
    <button className="btn-ghost" disabled={!medicoes.length} onClick={exportar}>Baixar backup das medições</button>
    <p className="comp-nota">Dados guardados apenas neste navegador. Use o backup para levar a outro dispositivo. Valores da bioimpedância são estimativas do aparelho.</p>
  </div>
}
