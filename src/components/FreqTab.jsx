import { memo } from 'react'
import Spinner from './Spinner'

function FreqBar({ num, freq, maxVal, color, gradient }) {
  const pct = maxVal > 0 ? (freq / maxVal) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <span style={{
        width: 22, fontSize: 10, fontFamily: "'Space Mono', monospace",
        color: '#ccc', fontWeight: 700, textAlign: 'right'
      }}>
        {String(num).padStart(2, '0')}
      </span>
      <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 6,
          background: gradient, transition: 'width .6s ease'
        }} />
      </div>
      <span style={{
        fontSize: 9, color: '#888', fontFamily: "'Space Mono', monospace",
        minWidth: 50, textAlign: 'right'
      }}>
        {freq}x
      </span>
    </div>
  )
}

const MemoFreqBar = memo(FreqBar)

function FreqTab({ loading, st, L, onRefresh }) {
  if (loading && !st) {
    return (
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <Spinner color={L.color} />
        <p style={{ color: '#555', fontSize: 12, marginTop: 10 }}>
          Buscando histórico da {L.name}...
        </p>
        {[140, 90, 120].map((w, i) => (
          <div key={i} className="shimmer-line" style={{ height: 11, width: w, margin: '7px auto 0' }} />
        ))}
      </div>
    )
  }

  if (!st) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>📊</div>
        <p style={{ color: '#666', fontSize: 12 }}>Iniciando...</p>
      </div>
    )
  }

  const maxQ = st.quentes.length
    ? Math.max(...st.quentes.map(n => (st.freq && st.freq[n]) || 1), 1)
    : 1
  const maxF = st.frios.length
    ? Math.max(...st.frios.map(n => (st.freq && st.freq[n]) || 1), 1)
    : 1

  return (
    <>
      <div className="card" style={{ padding: 20, marginBottom: 12, borderColor: `${L.color}30` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 9,
            letterSpacing: '2.5px', color: L.color, textTransform: 'uppercase'
          }}>
            📊 Panorama
          </div>
          <button onClick={onRefresh} style={{
            background: `${L.color}10`, border: `1px solid ${L.color}30`,
            borderRadius: 5, padding: '2px 8px', fontSize: 9,
            color: L.color, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", transition: 'all .2s'
          }}>
            ⟳ Atualizar
          </button>
        </div>
        {[
          ['Concursos', st.totalConcursos?.toLocaleString('pt-BR') || '—', L.color],
          ['Pares', st.paridade?.pares || '—', L.color],
          ['Ímpares', st.paridade?.impares || '—', L.color],
          ['Coef. Variação', st.cv || '—', '#ccc'],
          ['Qui-quadrado (χ²)', st.quiQuadrado || '—', '#ccc'],
        ].map(([label, value, valColor]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)'
          }}>
            <span style={{ color: '#777', fontSize: 12 }}>{label}</span>
            <span style={{
              color: valColor, fontSize: 12, fontWeight: 600,
              fontFamily: "'Space Mono', monospace"
            }}>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
          <span style={{ color: '#777', fontSize: 12 }}>Distribuição Quartis</span>
          <span style={{ color: '#ccc', fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
            {st.quartil
              ? `Q1:${st.quartil[0]} Q2:${st.quartil[1]} Q3:${st.quartil[2]} Q4:${st.quartil[3]}`
              : '—'}
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12, borderColor: `${L.color}25` }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 8.5, letterSpacing: '2px',
          color: '#ff6b6b', textTransform: 'uppercase', marginBottom: 8
        }}>
          🔥 Quentes (mais frequentes)
        </div>
        {st.quentes.length
          ? st.quentes.map(n => {
            const f = (st.freq && st.freq[n]) || 0
            return (
              <MemoFreqBar
                key={n} num={n} freq={f} maxVal={maxQ}
                gradient="linear-gradient(90deg,#ff6b6b,#ff4444)"
              />
            )
          })
          : <span style={{ color: '#555', fontSize: 11 }}>Sem dados</span>}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12, borderColor: `${L.color}25` }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 8.5, letterSpacing: '2px',
          color: '#5f9eff', textTransform: 'uppercase', marginBottom: 8
        }}>
          🧊 Frios (menos frequentes)
        </div>
        {st.frios.length
          ? st.frios.map(n => {
            const f = (st.freq && st.freq[n]) || 0
            return (
              <MemoFreqBar
                key={n} num={n} freq={f} maxVal={maxF}
                gradient="linear-gradient(90deg,#5f9eff,#3a7bd5)"
              />
            )
          })
          : <span style={{ color: '#555', fontSize: 11 }}>Sem dados</span>}
      </div>

      <div className="card" style={{ padding: 16, borderColor: `${L.color}25` }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 8.5, letterSpacing: '2px',
          color: '#ffd93d', textTransform: 'uppercase', marginBottom: 8
        }}>
          ⏳ Atrasados (mais tempo sem sair)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {st.atrasados.length
            ? st.atrasados.map(n => (
              <span key={n} style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(145deg,#ffd93d 0%,#8b7a1a 100%)',
                border: '1px solid #ffee88', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Space Mono', monospace", fontSize: 10,
                fontWeight: 700, color: '#000'
              }}>
                {String(n).padStart(2, '0')}
              </span>
            ))
            : <span style={{ color: '#555', fontSize: 11 }}>—</span>}
        </div>
      </div>
    </>
  )
}

export default memo(FreqTab)
