import { memo } from 'react'

function Spinner({ color }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: `3px solid ${color}22`, borderTopColor: color,
      animation: 'spin 0.7s linear infinite', margin: '0 auto'
    }} />
  )
}

export default memo(Spinner)
