import type { DiaSaude } from '../db/schema'

type Resultado = { valor: number; sono: number; fc: number; sonoBase: number; fcBase: number; amostrasSono: number; amostrasFc: number } | null
const limitar = (n: number) => Math.min(100, Math.max(0, n))
const mediana = (numeros: number[]) => {
  const ordenados = [...numeros].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2
}
const validoSono = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 2 && n <= 14
// O projeto descarta FCR menor que 65 por ser erro de sincronização conhecido.
const validoFc = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 65 && n <= 140
function diaLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Indicador exploratório, não validado. Usa apenas dados do dia atual e a
// mediana dos 14 dias anteriores; nunca preenche uma métrica com dia antigo.
export function indiceRecuperacao(dias: DiaSaude[], agora: Date): Resultado {
  const hoje = diaLocal(agora)
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  inicio.setDate(inicio.getDate() - 14)
  const base = dias.filter(d => d.data >= diaLocal(inicio) && d.data < hoje)
  const atual = dias.find(d => d.data === hoje)
  if (!atual || !validoSono(atual.sonoHoras) || !validoFc(atual.fcRepouso)) return null
  const sonos = base.map(d => d.sonoHoras).filter(validoSono)
  const frequencias = base.map(d => d.fcRepouso).filter(validoFc)
  if (sonos.length < 7 || frequencias.length < 7) return null
  const sonoBase = mediana(sonos), fcBase = mediana(frequencias)
  // Escala relativa arbitrária: uma noite habitual e FC habitual equivalem a 70.
  // A média dos dois componentes não deve ser interpretada como % de recuperação real.
  const componenteSono = limitar(70 + (atual.sonoHoras - sonoBase) * 15)
  const componenteFc = limitar(70 + (fcBase - atual.fcRepouso) * 5)
  return { valor: Math.round((componenteSono + componenteFc) / 2), sono: atual.sonoHoras,
    fc: atual.fcRepouso, sonoBase, fcBase, amostrasSono: sonos.length, amostrasFc: frequencias.length }
}
