// Gráficos em SVG puro: sem biblioteca, sem rede, sem peso no bundle.
// Coordenadas em viewBox 0..100 x 0..100, escaladas por CSS.

export interface Ponto { x: string; y: number | null }

const VB = { w: 100, h: 100 }

function escala(valores: number[], forcarZero: boolean) {
  const validos = valores.filter((v) => Number.isFinite(v))
  if (!validos.length) return { min: 0, max: 1 }
  let min = Math.min(...validos), max = Math.max(...validos)
  if (forcarZero) min = Math.min(0, min)
  if (min === max) { min -= 1; max += 1 }
  const folga = (max - min) * 0.12
  return { min: min - folga, max: max + folga }
}

interface LinhaProps {
  series: Array<{ nome: string; cor: string; pontos: Ponto[] }>
  altura?: number
  zeroRef?: boolean // traça a linha do zero (útil para TSB)
  // liga os pontos por cima dos dias sem medição. Certo para peso (muda devagar
  // e é medido de vez em quando); errado para métricas diárias, onde o buraco
  // é informação.
  conectar?: boolean
  formato?: (v: number) => string
}

export function GraficoLinha({ series, altura = 130, zeroRef, conectar, formato }: LinhaProps) {
  const todos = series.flatMap((s) => s.pontos.map((p) => p.y).filter((v): v is number => v !== null))
  if (!todos.length) return <div className="grafico-vazio">sem dados</div>
  const { min, max } = escala(todos, false)
  const n = Math.max(...series.map((s) => s.pontos.length))
  const px = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * VB.w)
  const py = (v: number) => VB.h - ((v - min) / (max - min)) * VB.h
  const fmt = formato ?? ((v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }))

  return (
    <div className="grafico">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="none" style={{ height: altura }}>
        {zeroRef && min < 0 && max > 0 && (
          <line x1="0" y1={py(0)} x2={VB.w} y2={py(0)} className="g-zero" vectorEffect="non-scaling-stroke" />
        )}
        {series.map((s) => {
          const validos = s.pontos
            .map((p, i) => ({ i, y: p.y }))
            .filter((p): p is { i: number; y: number } => p.y !== null)

          if (conectar) {
            const d = validos.map((p, k) => `${k ? 'L' : 'M'}${px(p.i).toFixed(2)},${py(p.y).toFixed(2)}`).join(' ')
            return (
              <g key={s.nome}>
                <path d={d} fill="none" stroke={s.cor} strokeWidth="2"
                  vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                {validos.length <= 60 && validos.map((p) => (
                  <circle key={p.i} cx={px(p.i)} cy={py(p.y)} r="1.2" fill={s.cor}
                    vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            )
          }

          // sem conectar: quebra onde faltar dado, o buraco é informação
          const trechos: string[] = []
          let atual: string[] = []
          s.pontos.forEach((p, i) => {
            if (p.y === null) { if (atual.length > 1) trechos.push(atual.join(' ')); atual = []; return }
            atual.push(`${atual.length ? 'L' : 'M'}${px(i).toFixed(2)},${py(p.y).toFixed(2)}`)
          })
          if (atual.length > 1) trechos.push(atual.join(' '))
          return trechos.map((d, i) => (
            <path key={`${s.nome}-${i}`} d={d} fill="none" stroke={s.cor}
              strokeWidth="2" vectorEffect="non-scaling-stroke"
              strokeLinecap="round" strokeLinejoin="round" />
          ))
        })}
      </svg>
      <div className="g-eixo">
        <span>{fmt(max)}</span>
        <span>{fmt(min)}</span>
      </div>
    </div>
  )
}

interface BarrasProps {
  pontos: Ponto[]
  cor: string
  meta?: number // linha tracejada de referência (ex.: 3 treinos/semana)
  altura?: number
  formato?: (v: number) => string
}

export function GraficoBarras({ pontos, cor, meta, altura = 130, formato }: BarrasProps) {
  const vals = pontos.map((p) => p.y ?? 0)
  if (!vals.length) return <div className="grafico-vazio">sem dados</div>
  const { max } = escala([...vals, meta ?? 0], true)
  const py = (v: number) => VB.h - (v / max) * VB.h
  const larg = VB.w / pontos.length
  const fmt = formato ?? ((v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }))

  return (
    <div className="grafico">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="none" style={{ height: altura }}>
        {pontos.map((p, i) => {
          const v = p.y ?? 0
          const y = py(v)
          return (
            <rect key={i}
              x={i * larg + larg * 0.18} y={y}
              width={larg * 0.64} height={Math.max(0, VB.h - y)}
              fill={cor} opacity={i === pontos.length - 1 ? 1 : 0.65} rx="0.6" />
          )
        })}
        {meta !== undefined && (
          <line x1="0" y1={py(meta)} x2={VB.w} y2={py(meta)}
            className="g-meta" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="g-eixo">
        <span>{fmt(max)}</span>
        <span>0</span>
      </div>
    </div>
  )
}

export function Legenda({ itens }: { itens: Array<{ nome: string; cor: string }> }) {
  return (
    <div className="g-legenda">
      {itens.map((i) => (
        <span key={i.nome}><i style={{ background: i.cor }} />{i.nome}</span>
      ))}
    </div>
  )
}
