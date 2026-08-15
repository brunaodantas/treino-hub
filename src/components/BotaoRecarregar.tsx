import { useState } from 'react'

// Recarrega a tela buscando versão nova do app. Fica em todas as abas porque
// PWA instalado guarda a versão antiga em cache e não avisa que atualizou.
export default function BotaoRecarregar() {
  const [girando, setGirando] = useState(false)

  async function recarregar() {
    setGirando(true)
    try {
      // pede ao Service Worker a versão nova antes de recarregar; sem isso o
      // reload devolve o mesmo cache e parece que o botão não fez nada
      const regs = await navigator.serviceWorker?.getRegistrations?.() ?? []
      await Promise.all(regs.map((r) => r.update()))
    } catch { /* sem SW (aba comum): recarrega direto */ }
    location.reload()
  }

  return (
    <button
      className="btn-recarregar"
      onClick={recarregar}
      aria-label="Recarregar"
      title="Recarregar"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className={girando ? 'girando' : ''}>
        <path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
      </svg>
    </button>
  )
}
