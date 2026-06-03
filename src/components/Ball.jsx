import { memo } from 'react'

function Ball({ number, gradient, borderColor, size = 46, delay = 0, glowColor }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: gradient,
      border: `1.5px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Mono', monospace", fontWeight: 700,
      fontSize: size * 0.32, color: '#fff',
      boxShadow: glowColor
        ? `0 0 18px rgba(${glowColor},0.6),0 0 40px rgba(${glowColor},0.25),inset 0 1px 2px rgba(255,255,255,0.25)`
        : 'inset 0 1px 2px rgba(255,255,255,0.15),0 4px 12px rgba(0,0,0,0.5)',
      animation: `ballIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) ${delay}s both`,
      flexShrink: 0
    }}>
      {String(number).padStart(2, '0')}
    </div>
  )
}

export default memo(Ball)
