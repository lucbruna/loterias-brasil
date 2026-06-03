import { memo } from 'react'
import Ball from './Ball'
import Spinner from './Spinner'
import ProbCard from './ProbCard'

function ResultTab({ loading, result, L, prob, onSync }) {
  if (loading) {
    return (
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <Spinner color={L.color} />
        <p style={{ color: '#555', fontSize: 12, marginTop: 10 }}>
          Buscando último sorteio da {L.name}...
        </p>
        {[120, 80, 100].map((w, i) => (
          <div key={i} className="shimmer-line" style={{ height: 11, width: w, margin: '7px auto 0' }} />
        ))}
      </div>
    )
  }

  if (!result) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>📭</div>
        <p style={{ color: '#666', fontSize: 12 }}>
          Nenhum resultado.{' '}
          <button onClick={onSync} style={{
            background: 'none', border: 'none', color: L.color,
            fontSize: 12, textDecoration: 'underline', cursor: 'pointer'
          }}>
            Tentar novamente
          </button>
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="card" style={{ padding: '20px 20px 24px', marginBottom: 12, borderColor: L.border }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 20, flexWrap: 'wrap', gap: 8
        }}>
          <div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 8.5,
              letterSpacing: '2.5px', color: L.color, textTransform: 'uppercase', marginBottom: 2
            }}>
              Concurso
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 36,
              fontWeight: 700, color: '#fff', lineHeight: 1
            }}>
              #{result.concurso}
            </div>
            <div style={{ color: '#555', fontSize: 11.5, marginTop: 2 }}>
              📅 {result.data}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button onClick={onSync} style={{
              background: `${L.color}10`, border: `1px solid ${L.color}30`,
              borderRadius: 5, padding: '2px 8px', fontSize: 9,
              color: L.color, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all .2s'
            }}>
              ⟳ Sincronizar
            </button>
            {result.acumulado && result.premio > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: `${L.color}15`, border: `1px solid ${L.color}35`,
                borderRadius: 6, padding: '3px 8px', marginBottom: 5
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: L.color, animation: 'pulse 1.5s infinite'
                }} />
                <span style={{
                  fontSize: 8.5, color: L.color, fontWeight: 700, letterSpacing: '1.5px'
                }}>
                  ACUMULADO
                </span>
              </div>
            )}
            {result.premio > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ color: '#555', fontSize: 9.5 }}>Prêmio estimado</div>
                <div style={{ color: '#ddd', fontSize: 13, fontWeight: 700 }}>
                  R$ {result.premio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
            {result.dataProximo !== '—' && (
              <div>
                <div style={{ color: '#555', fontSize: 9.5 }}>Próximo sorteio</div>
                <div style={{ color: '#ccc', fontSize: 12, fontWeight: 600 }}>
                  {result.dataProximo}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
          {result.numeros.map((n, i) => (
            <Ball key={n} number={n} gradient={L.ball} borderColor={L.ballBorder} delay={i * 0.06} glowColor={L.glow} size={46} />
          ))}
        </div>
      </div>
      <ProbCard data={prob} color={L.color} />
    </>
  )
}

export default memo(ResultTab)
