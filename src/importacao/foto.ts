import { createWorker } from 'tesseract.js'
import type { CampoCorporal } from '../logic/composicao'

export async function lerTextoFoto(arquivo: File): Promise<string> {
  const base = `${location.origin}${import.meta.env.BASE_URL}ocr`
  const worker = await createWorker('por', 1, { workerPath: `${base}/worker.min.js`, corePath: `${base}/tesseract-core-lstm.wasm.js`, langPath: base, cacheMethod: 'none' })
  try { return (await worker.recognize(arquivo)).data.text }
  finally { await worker.terminate() }
}

export function extrairFoto(texto: string): { data: string; horario: string; valores: Partial<Record<CampoCorporal, string>>; avisos: string[] } {
  const linhas = texto.split('\n').map(x => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  const d = texto.match(/\b(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/)
  const valores: Partial<Record<CampoCorporal, string>> = {}, avisos: string[] = []
  const numero = (linha: string) => linha.match(/(?:^|\s)(\d{1,5}(?:[.,]\d{1,2})?)(?=\s|$)/)?.[1]
  linhas.forEach((linha, i) => {
    const proxima = linhas[i + 1] ?? ''
    let chave: CampoCorporal | null = null
    if (/peso\s*\(k/.test(linha)) chave = 'pesoKg'
    else if (/\b(imc|mc)\b/.test(linha)) chave = 'imc'
    else if (/gordura\s*\(%/.test(linha)) chave = 'gorduraPct'
    else if (/peso\s*d[ao]\s*gordura/.test(linha)) chave = 'gorduraKg'
    else if (/percentual da massa muscular/.test(linha) && /esquelet/.test(proxima)) chave = 'musculoEsqueleticoPct'
    else if (/peso da massa muscular/.test(linha) && /esquelet/.test(proxima)) chave = 'musculoEsqueleticoKg'
    else if (/registro de massa/.test(linha) && /muscul/.test(proxima)) chave = 'massaMuscularPct'
    else if (/peso\s*d[ao]\s*massa muscular/.test(linha)) chave = 'massaMuscularKg'
    else if (/agua\s*\(%/.test(linha)) chave = 'aguaPct'
    else if (/pesod[ao]agua/.test(linha.replace(/\s/g,''))) chave = 'aguaKg'
    else if (/gordura visceral/.test(linha)) chave = 'gorduraVisceral'
    else if (/metabolismo/.test(linha)) chave = 'basalKcal'
    else if (/altura/.test(linha)) chave = 'alturaCm'
    if (!chave) return
    let v = numero(linha)
    if (!v) { avisos.push(`${chave}: valor não reconhecido`); return }
    if (chave.endsWith('Pct') && Number(v.replace(',', '.')) > 100 && /^\d{3}$/.test(v)) {
      v = String(Number(v) / 10); avisos.push(`${chave}: separador decimal estimado, confira`)
    }
    valores[chave] = v.replace('.', ',')
  })
  return { data: d ? `${d[3]}-${d[2]}-${d[1]}` : '', horario: d?.[4] ?? '', valores, avisos }
}
