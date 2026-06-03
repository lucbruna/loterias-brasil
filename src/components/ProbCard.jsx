import { memo } from 'react'

function ProbCard({ data, color }) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 14, borderColor: `${color}30` }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: '2.5px',
        color, marginBottom: 14, textTransform: 'uppercase'
      }}>
        Probabilidades Matemáticas
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 8 }}>
        {(data || []).map((p, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            background: `${color}08`, border: `1px solid ${color}20`
          }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>{p.label}</div>
            <div style={{
              fontSize: 12, color: '#fff', fontWeight: 700,
              fontFamily: "'Space Mono', monospace"
            }}>{p.chance}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(ProbCard)
