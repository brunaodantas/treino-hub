export type Aba = 'hoje' | 'corrida' | 'historico' | 'recuperacao' | 'ajustes'

const ICONES: Record<Aba, string> = {
  hoje: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z',
  corrida: 'M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2c-1.8 0-3.4-1-4.2-2.3l-1-1.6a2 2 0 0 0-1.7-1c-.3 0-.5 0-.8.1L6 8.3V13h2V9.6l1.8-.7z',
  historico: 'M13 3a9 9 0 0 0-9 9H1l3.9 3.9L9 12H6a7 7 0 1 1 2 4.9l-1.4 1.4A9 9 0 1 0 13 3zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8H12z',
  recuperacao: 'M12 21s-7.5-4.9-9.7-9.2C.7 8.5 2.7 5 6 5c2 0 3.5 1.1 4.4 2.7L12 10l1.6-2.3C14.5 6.1 16 5 18 5c3.3 0 5.3 3.5 3.7 6.8C19.5 16.1 12 21 12 21z',
  ajustes: 'M19.4 13a7.6 7.6 0 0 0 .1-1 7.6 7.6 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.7l-2-3.4a.5.5 0 0 0-.6-.2l-2.5 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.4l-.4 2.7a7.5 7.5 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.4a.5.5 0 0 0 .1.7L4.5 11a7.6 7.6 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.7l2 3.4c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .3.2.5.5.5h4c.2 0 .5-.2.5-.4l.4-2.7a7.5 7.5 0 0 0 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.4a.5.5 0 0 0-.1-.7L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
}

const NOMES: Record<Aba, string> = {
  hoje: 'Hoje',
  corrida: 'Corrida',
  historico: 'Histórico',
  recuperacao: 'Recuperação',
  ajustes: 'Ajustes',
}

export default function TabBar({ aba, onChange }: { aba: Aba; onChange: (a: Aba) => void }) {
  return (
    <nav className="tabbar">
      {(Object.keys(NOMES) as Aba[]).map((a) => (
        <button key={a} className={a === aba ? 'ativa' : ''} onClick={() => onChange(a)}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d={ICONES[a]} /></svg>
          {NOMES[a]}
        </button>
      ))}
    </nav>
  )
}
