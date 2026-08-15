// Ajustes não entra na barra: é raro e vira ícone no topo, junto do recarregar.
// Seis abas em 375 px não cabem sem cortar o rótulo.
export type Aba = 'hoje' | 'corrida' | 'historico' | 'recuperacao' | 'evolucao' | 'ajustes'
type AbaBarra = Exclude<Aba, 'ajustes'>

const ICONES: Record<AbaBarra, string> = {
  hoje: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z',
  corrida: 'M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2c-1.8 0-3.4-1-4.2-2.3l-1-1.6a2 2 0 0 0-1.7-1c-.3 0-.5 0-.8.1L6 8.3V13h2V9.6l1.8-.7z',
  historico: 'M13 3a9 9 0 0 0-9 9H1l3.9 3.9L9 12H6a7 7 0 1 1 2 4.9l-1.4 1.4A9 9 0 1 0 13 3zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8H12z',
  recuperacao: 'M12 21s-7.5-4.9-9.7-9.2C.7 8.5 2.7 5 6 5c2 0 3.5 1.1 4.4 2.7L12 10l1.6-2.3C14.5 6.1 16 5 18 5c3.3 0 5.3 3.5 3.7 6.8C19.5 16.1 12 21 12 21z',
  evolucao: 'M3.5 18.5l6-6 4 4L22 7l-1.4-1.4-7.1 8.1-4-4L2 17l1.5 1.5z',
}

const NOMES: Record<AbaBarra, string> = {
  hoje: 'Hoje',
  corrida: 'Corrida',
  historico: 'Histórico',
  recuperacao: 'Recuperação',
  evolucao: 'Evolução',
}

export default function TabBar({ aba, onChange }: { aba: Aba; onChange: (a: Aba) => void }) {
  return (
    <nav className="tabbar">
      {(Object.keys(NOMES) as AbaBarra[]).map((a) => (
        <button key={a} className={a === aba ? 'ativa' : ''} onClick={() => onChange(a)}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d={ICONES[a]} /></svg>
          {NOMES[a]}
        </button>
      ))}
    </nav>
  )
}
