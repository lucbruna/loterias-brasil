import { memo, useState } from 'react'
import Ball from './Ball'
import Spinner from './Spinner'
import ProbCard from './ProbCard'

function SugHistory({ history, L, onRate }) {
  if (!history.length) return null
  return (
    <div className="card" style={{ padding: 14, marginBottom: 12, borderColor: `${L.color}20` }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 8.5,
        letterSpacing: '2px', color: '#888', textTransform: 'uppercase', marginBottom: 10
      }}>
        🧠 Memória
      </div>
      {history.slice(0, 5).map(s => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 7,
          background: 'rgba(255,255,255,.02)', marginBottom: 5, fontSize: 11
        }}>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
            {(s.numbers || []).map(n => (
              <span key={n} style={{
                width: 22, height: 22, borderRadius: '50%',
                background: L.ball, border: `1px solid ${L.ballBorder}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Space Mono', monospace", fontSize: 8,
                fontWeight: 700, color: '#fff'
              }}>
                {String(n).padStart(2, '0')}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {[1, 2, 3, 4, 5].map(st => (
              <button
                key={st}
                className={`rating-btn ${s.rating >= st ? 'on' : ''}`}
                onClick={() => onRate(s.id, st)}
                style={{ fontSize: 12 }}
              >★</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const SugHistoryMemo = memo(SugHistory)

function CurrentSug({ sug, L, copied, currentRating, onCopy, onRate, onGenerate, loading }) {
  if (!sug) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>🧠</div>
        <p style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>
          Gere uma sugestão baseada em dados reais
        </p>
        <button
          className="primaryBtn"
          onClick={onGenerate}
          disabled={loading}
          style={{
            padding: '10px 28px', borderRadius: 9,
            background: L.color, color: '#000', fontSize: 12
          }}
        >
          {loading ? '⟳ Gerando...' : '🎲 Gerar Sugestão'}
        </button>
      </div>
    )
  }

  const confColor = sug.confianca === 'Alta'
    ? L.color
    : sug.confianca === 'Média' ? '#ffd93d' : '#ff6b6b'

  return (
    <div className="card" style={{ padding: 22, marginBottom: 12, borderColor: L.border }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 6
      }}>
        <div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 8.5,
            letterSpacing: '2.5px', color: L.color, textTransform: 'uppercase'
          }}>
            ✨ Sugestão
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
            fontWeight: 600, color: '#fff', marginTop: 1
          }}>
            {sug.estrategia}
          </div>
        </div>
        <span style={{
          padding: '2px 10px', borderRadius: 20,
          background: `${confColor}18`, border: `1px solid ${confColor}40`,
          fontSize: 10, color: confColor, fontWeight: 700, letterSpacing: '0.5px'
        }}>
          {sug.confianca}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 18 }}>
        {(sug.numeros || []).map((n, i) => {
          const fd = sug.freqSug?.find(f => f.num === n)
          return (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Ball
                number={n} gradient={L.ball} borderColor={L.ballBorder}
                delay={i * 0.05} glowColor={L.glow} size={48}
              />
              {fd && (
                <span style={{ fontSize: 9, color: '#888', fontFamily: "'Space Mono', monospace" }}>
                  {fd.freq}x ({fd.pct})
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{
        padding: 14, background: `${L.color}06`,
        borderColor: `${L.color}20`, marginBottom: 14
      }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{sug.parImpar}</div>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{sug.dezenas}</div>
        {sug.scoreConfianca && (
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>
            Score: <span style={{ color: L.color, fontWeight: 700 }}>{sug.scoreConfianca}/10</span>
          </div>
        )}
        {sug.analise && (
          <div style={{ fontSize: 11, color: '#bbb', lineHeight: 1.5, marginTop: 3 }}>
            {sug.analise}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <button
          onClick={onCopy}
          style={{
            background: copied ? `${L.color}20` : 'none',
            border: `1px solid ${L.color}40`, borderRadius: 6,
            padding: '4px 14px', fontSize: 10, color: L.color,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .2s'
          }}
        >
          {copied ? '✓ Copiado!' : '📋 Copiar números'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map(st => (
          <button
            key={st}
            className={`rating-btn ${currentRating >= st ? 'on' : ''}`}
            onClick={() => onRate(sug.id, st)}
          >★</button>
        ))}
      </div>

      <button
        className="primaryBtn"
        onClick={onGenerate}
        disabled={loading}
        style={{
          width: '100%', padding: '12px', borderRadius: 10,
          background: `linear-gradient(135deg,${L.color} 0%,${L.color}cc 100%)`,
          color: '#000', fontSize: 12.5, letterSpacing: '0.3px'
        }}
      >
        {loading ? '⟳ Gerando...' : '🎲 Nova Sugestão'}
      </button>
    </div>
  )
}

const CurrentSugMemo = memo(CurrentSug)

function SugTab({
  prob, L, sugHistory, loading, sug, currentRating, copied,
  onGenerate, onCopy, onRate, aiConfigured, error
}) {
  return (
    <>
      <ProbCard data={prob} color={L.color} />
      <SugHistoryMemo history={sugHistory} L={L} onRate={onRate} />

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <Spinner color={L.color} />
          <p style={{ color: '#555', fontSize: 12, marginTop: 10 }}>Gerando sugestão...</p>
          {[160, 120, 140].map((w, i) => (
            <div key={i} className="shimmer-line" style={{ height: 11, width: w, margin: '7px auto 0' }} />
          ))}
        </div>
      ) : (
        <CurrentSugMemo
          sug={sug} L={L} copied={copied}
          currentRating={currentRating}
          onCopy={onCopy} onRate={onRate}
          onGenerate={onGenerate} loading={loading}
        />
      )}

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#ff6b6b10', border: '1px solid #ff6b6b30',
          color: '#ff6b6b', fontSize: 11, marginTop: 8
        }}>
          {error}
        </div>
      )}
    </>
  )
}

export default memo(SugTab)
