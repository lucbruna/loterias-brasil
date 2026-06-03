import { CAIXA_PROXY } from './lotteries'
import { loadFreqCache, saveFreqCache } from './cache'

export async function fetchCaixa(path, signal) {
  const res = await fetch(`${CAIXA_PROXY}/${path}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const d = await res.json()
  if (!d || !d.listaDezenas) throw new Error('Resposta inválida')
  const numeros = d.listaDezenas.map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b)
  return {
    concurso: d.numero,
    data: d.dataApuracao || '—',
    numeros,
    acumulado: !!d.acumulado,
    premio: d.valorEstimadoProximoConcurso || d.valorAcumuladoProximoConcurso || 0,
    dataProximo: d.dataProximoConcurso || '—',
    anterior: d.numeroConcursoAnterior
  }
}

const BATCH_SIZE = 5
const MAX_ITERATIONS = 20
const CACHE_TTL = 3600000

export async function fetchHistoryStats(id, apiName, maxCtx = 50) {
  const cached = loadFreqCache(id)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached

  let total = 0
  const freq = {}
  const latest = await fetchCaixa(apiName, AbortSignal.timeout(5000))
  for (const n of latest.numeros) freq[n] = (freq[n] || 0) + 1
  total++

  let cur = latest.anterior
  let iterations = 0

  while (cur > 0 && total < maxCtx && iterations < MAX_ITERATIONS) {
    const batch = []
    for (let i = 0; i < BATCH_SIZE && cur - i > 0 && total + batch.length < maxCtx; i++) batch.push(cur - i)
    if (!batch.length) break
    const results = await Promise.allSettled(batch.map(n => fetchCaixa(`${apiName}/${n}`, AbortSignal.timeout(3000))))
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        for (const n of r.value.numeros) freq[n] = (freq[n] || 0) + 1
        total++
      }
    }
    cur -= BATCH_SIZE
    if (iterations < MAX_ITERATIONS - 1) await new Promise(r => setTimeout(r, 150))
    iterations++
  }

  const data = { freq, totalContests: total, lastContest: latest.concurso }
  saveFreqCache(id, data)
  return data
}
