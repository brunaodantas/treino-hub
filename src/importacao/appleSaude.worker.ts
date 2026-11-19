import { criarLeitorApple } from './appleSaude'
self.onmessage = async (evento: MessageEvent<File>) => {
  try {
    const leitor = criarLeitorApple()
    const stream = evento.data.stream().getReader()
    const decoder = new TextDecoder()
    let bytes = 0
    while (true) {
      const { done, value } = await stream.read()
      if (done) break
      leitor.escrever(decoder.decode(value, { stream: true }))
      bytes += value.byteLength
      self.postMessage({ progresso: Math.round(bytes / evento.data.size * 100) })
    }
    leitor.escrever(decoder.decode())
    self.postMessage({ resultado: leitor.concluir() })
  } catch (erro) {
    self.postMessage({ erro: erro instanceof Error ? erro.message : 'Falha ao ler XML.' })
  }
}
