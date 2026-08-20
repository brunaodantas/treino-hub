import { useState } from 'react'

interface Bloco {
  subtitulo: string
  itens: string[]
}

interface Protocolo {
  id: string
  titulo: string
  blocos: Bloco[]
}

const PROTOCOLOS: Protocolo[] = [
  {
    id: 'soluco-esofago',
    titulo: 'Soluço e irritação de esôfago',
    blocos: [
      {
        subtitulo: 'Como parar o soluço',
        itens: [
          'Prender a respiração por 20-30 segundos e depois soltar devagar',
          'Beber água morna lentamente enquanto prende a respiração',
          'Tomar um gole de água com os dedos tampando os ouvidos',
          'Respiração diafragmática: respirar profundo pelo nariz (4s), prender (4s), soltar pela boca (6s), repetir 5-10 ciclos',
          'Se persistir por mais de 15 minutos, tomar uma colher de mel puro',
          'Último recurso: pedir para alguém dar um susto (ativa o sistema nervoso simpático e interrompe o soluço)',
        ],
      },
      {
        subtitulo: 'Recuperação após a crise',
        itens: [
          'Repouso: após parar o soluço, descanse por 30-60 minutos sem atividade intensa',
          'Hidratação: beba água morna lentamente durante as próximas 2-4 horas (não fria, não gaseificada)',
          'Alimentação: coma alimentos macios e brandos nas próximas refeições (sopa, iogurte, banana, melancia)',
          'Evite chocolate, cafeína, álcool e alimentos ácidos por 24 horas',
          'Se a esôfago ainda dói: chá de camomila ou gengibre reduz a inflamação',
          'Monitore se o soluço volta: padrão recorrente indica necessidade de consultar médico',
        ],
      },
      {
        subtitulo: 'Como tomar remédios/suplementos com segurança',
        itens: [
          'Sempre com água morna em quantidade suficiente (150-200 ml mínimo)',
          'Nunca deitar logo após: espere pelo menos 15-20 minutos sentado ou em pé',
          'Se for pílula, coloque na língua e cubra com água, después engula de uma vez',
          'Medicações gástricas devem ser tomadas com o estômago vazio (30min antes das refeições) ou conforme orientação',
          'Se a pílula ficar presa, o contato prolongado com a mucosa do esôfago causa irritação e ardência',
        ],
      },
      {
        subtitulo: 'Proteger o esôfago durante crise',
        itens: [
          'Sáliva lubrifica: deglutir saliva a cada minuto durante o soluço reduz a irritação',
          'Evitar alimentos muito quentes, bebidas gaseificadas, álcool e cafeína durante a crise',
          'Se o soluço vier junto com refluxo, tomar uma colher de bicarbonato de sódio em água',
          'Não comer sólidos até a crise passar completamente',
          'Elevar a cabeça para dormir (ângulo de 30-45 graus) reduz o refluxo durante a noite',
        ],
      },
      {
        subtitulo: 'Ansiedade e gerenciamento de estresse',
        itens: [
          'A ansiedade piora o soluço: faça respiração diafragmática (4-4-6) como mencionado acima',
          'Reconheça que o soluço é benigno: a própria tensão de tentar parar perpetua o ciclo',
          'Se vier acompanhado de pavor ou pânico, o soluço algumas vezes cessa quando você aceita que ele está lá',
          'Meditação de 5 minutos (focar no ar entrando e saindo) acalma o sistema nervoso',
          'Evitar conversas sobre o soluço enquanto está acontecendo: o foco intenso o mantém ativo',
        ],
      },
      {
        subtitulo: 'Impacto no treino',
        itens: [
          'Treinar com soluço ativo aumenta o risco de irritação por causa do movimento diafragmático repetido',
          'Se começar soluço durante a sessão, faça 5 minutos de respiração diafragmática de descanso antes de continuar',
          'Não faça exercícios abdominais intensos (prancha, flexão dinamicamente) durante crise de soluço',
          'Depois que o soluço cessa, aguarde 10 minutos antes de retomar exercícios pesados para evitar recorrência',
          'Retorno após crise: no dia seguinte, prefira treinos leves (Z1 de corrida, alongamento). Volte ao normal em 2-3 dias',
        ],
      },
      {
        subtitulo: 'Quando procurar um médico',
        itens: [
          'Soluço persistente por mais de 48 horas',
          'Dor intensa no esôfago ou peito que não melhora com repouso',
          'Dificuldade para engolir alimentos sólidos (disfagia)',
          'Vômito com sangue ou acompanhado de soluço recorrente',
          'Incapacidade de dormir ou comer por causa do soluço crônico',
          'Perda de peso inexplicada associada a irritação no esôfago',
        ],
      },
    ],
  },
  {
    id: 'crise-ansiedade',
    titulo: 'Crise de ansiedade',
    blocos: [
      {
        subtitulo: 'Durante a crise (primeiros 5-10 minutos)',
        itens: [
          'Respiração 4-4-6: respire pelo nariz em 4 segundos, segure por 4, solte pela boca em 6 segundos. Repita 10 ciclos',
          'Reconheça o que está acontecendo: "Isto é ansiedade, é temporário, vai passar"',
          'Saia do local se possível: mude de ambiente, vá tomar ar, mude de posição',
          'Água: beba um copo de água devagar. O ato mecânico acalma',
          'Toque o solo: coloque as mãos na água fria ou toque algo com textura diferente',
          'Não lute contra: aceite o desconforto. Tentar suprimir piora. Apenas observe',
        ],
      },
      {
        subtitulo: 'Técnica de grounding (se sentir desconectado/dissociado)',
        itens: [
          'Método 5-4-3-2-1: identifique 5 coisas que vê, 4 que toca, 3 que ouve, 2 que sente cheiro, 1 que sente gosto',
          'Pressão firme: aperte fortemente um objeto, um cojim, ou a própria mão por 20-30 segundos',
          'Caminhada: ande devagar, preste atenção em cada passo, sinta os pés tocando o solo',
          'Gelo: se disponível, segure um cubo de gelo na mão. O frio cortante prende a atenção no presente',
          'Sons: ouça música instrumental (não lírica), podcast, ou sons ambientes (chuva, floresta)',
        ],
      },
      {
        subtitulo: 'Recuperação após a crise (horas seguintes)',
        itens: [
          'Repouso: descanse em um local calmo por 30-60 minutos. Sem telefone, sem estímulos',
          'Alimento leve: coma algo com carboidrato (pão, banana, maçã). Açúcar simples ajuda o sistema nervoso',
          'Movimento: caminhe lentamente ou estique-se. Ficar parado perpetua a sensação de aprisionamento',
          'Água: mantenha-se hidratado. A desidratação amplifica ansiedade',
          'Rotina: volte a atividades normais (trabalho, tarefas) gradualmente. A inatividade piora o pensamento ruminante',
        ],
      },
      {
        subtitulo: 'Redução de sintomas residuais',
        itens: [
          'Insônia pós-crise: se não conseguir dormir à noite, durma antes. Deite-se sem culpa',
          'Tremor/adrenalina: pode durar 30 minutos a 2 horas após a crise. Isto é normal, vai passar',
          'Medo de nova crise: comum após primeira vez. Faça atividades rotineiras para provar que está tudo certo',
          'Evite café, chá preto, açúcar em excesso nos 2-3 dias seguintes: estimulantes pioram',
          'Dormir cedo: recupere 1-2 horas de sono extra para restaurar o sistema nervoso',
        ],
      },
      {
        subtitulo: 'Impacto no treino',
        itens: [
          'Dia da crise: descanse totalmente. Sem musculação, sem corrida',
          'Dia seguinte: apenas treino leve (20 min Z1 de corrida, alongamento, yoga)',
          'Dia 3-4: retorne gradualmente. Comece com séries curtas, carga leve',
          'Evite treinar em jejum por 3-5 dias: queda de glicose amplia ansiedade',
          'Observe o padrão: se a crise veio após treino muito intenso, considere reduzir volume por uma semana',
        ],
      },
      {
        subtitulo: 'Prevenção (para não voltar a ter)',
        itens: [
          'Identifique o gatilho: cansaço acumulado, falta de sono, cafeína, situação estressante. Registre',
          'Sono: durma 7-8 horas regularmente. Sono ruim amplifica ansiedade em 3x',
          'Limite cafeína: máximo 1 xícara de café, nada após 14:00',
          'Exercício regular: treino consistente (3x/semana) reduz ansiedade crônica em 40%',
          'Contato social: conviver reduz isolamento que amplifica pensamento ansioso',
          'Se recorrente (mais de 2x/mês): procure psicólogo. Pode ser transtorno de ansiedade tratável',
        ],
      },
      {
        subtitulo: 'Quando procurar ajuda profissional',
        itens: [
          'Crises acontecem 2 ou mais vezes por mês',
          'Você começa a evitar lugares ou situações por medo de nova crise',
          'A crise não melhora em 1-2 horas mesmo aplicando as técnicas',
          'Pensamentos de morte ou vontade de se machucar durante a crise',
          'A ansiedade interfere no trabalho, treino ou relacionamentos',
          'Acompanhamento com psicólogo e/ou psiquiatra: nada de fraco nisso, é medicina',
        ],
      },
    ],
  },
]

export default function Protocolos() {
  const [busca, setBusca] = useState('')
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  const protocolosFiltrados = PROTOCOLOS.filter((p) => {
    const termo = busca.toLowerCase()
    const temTitulo = p.titulo.toLowerCase().includes(termo)
    const temConteudo = p.blocos.some(
      (b) =>
        b.subtitulo.toLowerCase().includes(termo) ||
        b.itens.some((i) => i.toLowerCase().includes(termo)),
    )
    return temTitulo || temConteudo
  })

  const toggleAbrir = (id: string) => {
    const novo = new Set(abertos)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setAbertos(novo)
  }

  return (
    <div className="wrap screen">
      <div>
        <div className="eyebrow">Protocolos</div>
        <h1 className="hero-dia" style={{ marginTop: 8, fontSize: 'clamp(2.2rem, 11vw, 3.2rem)' }}>
          <span className="tipo">SAÚDE</span>
        </h1>
      </div>

      <input
        type="text"
        placeholder="Buscar protocolo…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{
          width: '100%',
          marginTop: 16,
          padding: '11px 14px',
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r1)',
          color: 'var(--text)',
          fontSize: '0.9rem',
        }}
      />

      {protocolosFiltrados.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          {protocolosFiltrados.map((protocolo) => {
            const aberto = abertos.has(protocolo.id)
            return (
              <div
                key={protocolo.id}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r2)',
                  marginTop: 12,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => toggleAbrir(protocolo.id)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', flex: 1 }}>
                    {protocolo.titulo}
                  </span>
                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: '1.2rem',
                      lineHeight: 1,
                      transition: 'transform 0.2s ease',
                      transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </span>
                </button>

                {aberto && (
                  <div
                    style={{
                      padding: '0 16px 16px 16px',
                      borderTop: '1px solid var(--line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    {protocolo.blocos.map((bloco, idx) => (
                      <div key={idx}>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--text)',
                            marginBottom: 8,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {bloco.subtitulo}
                        </div>
                        <ul
                          style={{
                            listStyle: 'none',
                            fontSize: '0.85rem',
                            lineHeight: 1.6,
                            color: 'var(--muted)',
                            paddingLeft: 12,
                          }}
                        >
                          {bloco.itens.map((item, itemIdx) => (
                            <li key={itemIdx} style={{ marginBottom: 8, position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 0 }}>•</span>
                              <span style={{ display: 'block', paddingLeft: 12 }}>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : busca ? (
        <div className="vazio">Nenhum protocolo encontrado com "{busca}".</div>
      ) : (
        <div className="vazio">Nenhum protocolo cadastrado ainda.</div>
      )}
    </div>
  )
}
