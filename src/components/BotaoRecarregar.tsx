import { useState } from 'react'

// Recarrega buscando versão nova do app. Existe porque PWA instalado serve o
// cache do Service Worker e não avisa que saiu versão nova.
// Só chamar reg.update() + reload não basta: o SW novo fica em "waiting" e o
// reload devolve a versão velha. É preciso mandar ele assumir (skipWaiting) e
// esperar a troca de controlador antes de recarregar.
export default function BotaoRecarregar() {
  const [girando, setGirando] = useState(false)

  async function recarregar() {
    setGirando(true)
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.()
      if (reg) {
        await reg.update()
        const novo = reg.waiting ?? reg.installing
        if (novo) {
          await new Promise<void>((resolve) => {
            const pronto = () => resolve()
            navigator.serviceWorker.addEventListener('controllerchange', pronto, { once: true })
            novo.postMessage({ type: 'SKIP_WAITING' })
            setTimeout(pronto, 3000) // não trava se o SW não responder
          })
        }
      }
      // limpa o cache do app; o SW reconstrói no próximo carregamento
      if ('caches' in window) {
        const nomes = await caches.keys()
        await Promise.all(nomes.map((n) => caches.delete(n)))
      }
    } catch { /* sem SW (aba comum): recarrega direto */ }
    location.reload()
  }

  return (
    <button
      className="btn-recarregar"
      onClick={recarregar}
      aria-label="Buscar atualização e recarregar"
      title="Recarregar"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className={girando ? 'girando' : ''}>
        <path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
      </svg>
    </button>
  )
}
