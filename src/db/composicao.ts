import { db } from './schema'
import { validarMedicao, type MedicaoCorporal } from '../logic/composicao'

// Inclusão transacional, sem substituir medições já existentes nem outras tabelas.
export async function salvarMedicoes(medicoes: MedicaoCorporal[]): Promise<number> {
  medicoes.forEach(validarMedicao)
  return db.transaction('rw', db.composicao, async () => {
    let novas = 0
    for (const m of medicoes) {
      if (await db.composicao.get(m.id)) continue
      // A mesma medida em jejum pode voltar do OKOK via Apple Saúde.
      // Não misturar fontes nem completar campos por aproximação de horário.
      await db.composicao.add(m)
      novas++
    }
    return novas
  })
}
