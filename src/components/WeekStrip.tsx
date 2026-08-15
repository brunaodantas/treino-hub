import { DIAS_CURTOS, PLANO_SEMANA } from '../logic/programa'

// Faixa Dom→Sáb com o ritmo da semana e o dia atual marcado.
// Musculação é fila deslizante, então o ponto não indica letra:
// laranja = dia de musculação · ciano = corrida · musgo = descanso
export default function WeekStrip() {
  const hoje = new Date().getDay()
  return (
    <div className="week-strip">
      {[0, 1, 2, 3, 4, 5, 6].map((wd) => {
        const plano = PLANO_SEMANA[wd]
        const cor = plano.tipo === 'treino' ? 'var(--c-a)'
          : plano.tipo === 'corrida' ? 'var(--c-run)' : 'var(--c-rest)'
        return (
          <div
            key={wd}
            className={`week-day${wd === hoje ? ' hoje' : ''}`}
            style={{ ['--dia-cor' as string]: cor }}
          >
            {DIAS_CURTOS[wd]}
            <span className="dot" />
          </div>
        )
      })}
    </div>
  )
}
