import { DIAS_CURTOS } from '../logic/programa'

// Dias da semana, sem indicação de atividade planejada.
export default function WeekStrip() {
  const hoje = new Date().getDay()
  return (
    <div className="week-strip">
      {[0, 1, 2, 3, 4, 5, 6].map((wd) => {
        return (
          <div
            key={wd}
            className={`week-day${wd === hoje ? ' hoje' : ''}`}
          >
            {DIAS_CURTOS[wd]}
          </div>
        )
      })}
    </div>
  )
}
