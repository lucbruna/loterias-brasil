import { memo } from 'react'
import { AI_PROVIDERS } from '../utils/ai'

function ConfigModal({ show, onClose, provider, onProviderChange, apiKey, onKeyChange, onSave, color }) {
  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div
        className="card"
        style={{ padding: 26, maxWidth: 420, width: '90%', borderColor: `${color}40` }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: '3px',
          color, marginBottom: 16, textTransform: 'uppercase'
        }}>
          Configurar IA
        </div>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
          Escolha um provedor gratuito e cole sua chave. Sem chave, o app usa estatística embutida.
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {Object.entries(AI_PROVIDERS).map(([id, p]) => (
            <button
              key={id}
              onClick={() => { onProviderChange(id) }}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8,
                background: provider === id ? `${color}18` : 'rgba(255,255,255,.03)',
                border: `1px solid ${provider === id ? color : 'rgba(255,255,255,.07)'}`,
                color: provider === id ? color : '#666', fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: provider === id ? 700 : 500,
                cursor: 'pointer', transition: 'all .2s'
              }}
            >{p.name}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#555', marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
          Chave de API
        </div>
        <input
          value={apiKey}
          onChange={e => onKeyChange(e.target.value)}
          placeholder="Cole sua chave aqui..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,.05)', color: '#fff',
            border: `1px solid ${apiKey ? color : 'rgba(255,255,255,.1)'}`,
            outline: 'none', fontSize: 12, fontFamily: "'DM Sans', sans-serif"
          }}
        />
        <div style={{ marginTop: 6, fontSize: 10, color: '#555' }}>
          <a
            href={AI_PROVIDERS[provider]?.name === 'Google Gemini'
              ? 'https://aistudio.google.com/app/apikey'
              : 'https://dashscope.aliyun.com'}
            target="_blank" rel="noreferrer" style={{ color }}
          >
            Obter chave gratuita →
          </a>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            className="primaryBtn"
            onClick={onSave}
            style={{ flex: 1, padding: '10px 20px', borderRadius: 8, background: color, color: '#000', fontSize: 12 }}
          >
            Salvar
          </button>
          <button
            className="primaryBtn"
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 20px', borderRadius: 8,
              background: 'rgba(255,255,255,.05)', color: '#888', fontSize: 12
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ConfigModal)
