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
const MAX_ITERATIONS = 100
const CACHE_TTL = 3600000

function computeRecencyWeight(index, total) {
  return 1 + ((total - index) / total) * 2
}

export async function fetchHistoryStats(id, apiName, maxCtx = 200) {
  const cached = loadFreqCache(id)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached

  let total = 0
  const freq = {}
  const lastAppearance = {}
  const sumAccum = { min: Infinity, max: 0, total: 0 }
  let recencyWeightedFreq = {}
  const allContestNumbers = []

  const latest = await fetchCaixa(apiName, AbortSignal.timeout(5000))
  for (const n of latest.numeros) {
    freq[n] = (freq[n] || 0) + 1
    lastAppearance[n] = latest.concurso
  }
  const sum = latest.numeros.reduce((a, b) => a + b, 0)
  sumAccum.min = Math.min(sumAccum.min, sum)
  sumAccum.max = Math.max(sumAccum.max, sum)
  sumAccum.total += sum
  allContestNumbers.push(latest.numeros)
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
        for (const n of r.value.numeros) {
          freq[n] = (freq[n] || 0) + 1
          if (!lastAppearance[n] || r.value.concurso > lastAppearance[n]) {
            lastAppearance[n] = r.value.concurso
          }
        }
        const s = r.value.numeros.reduce((a, b) => a + b, 0)
        sumAccum.min = Math.min(sumAccum.min, s)
        sumAccum.max = Math.max(sumAccum.max, s)
        sumAccum.total += s
        allContestNumbers.push(r.value.numeros)
        total++
      }
    }
    cur -= BATCH_SIZE
    if (iterations < MAX_ITERATIONS - 1) await new Promise(r => setTimeout(r, 100))
    iterations++
  }

  recencyWeightedFreq = {}
  for (let i = 0; i < allContestNumbers.length; i++) {
    const weight = computeRecencyWeight(i, allContestNumbers.length)
    for (const n of allContestNumbers[i]) {
      recencyWeightedFreq[n] = (recencyWeightedFreq[n] || 0) + weight
    }
  }

  const repeticoes = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (let i = 1; i < allContestNumbers.length; i++) {
    const ant = new Set(allContestNumbers[i - 1])
    const rep = allContestNumbers[i].filter(n => ant.has(n)).length
    repeticoes[rep] = (repeticoes[rep] || 0) + 1
  }

  const data = {
    freq,
    totalContests: total,
    lastContest: latest.concurso,
    lastAppearance,
    recencyWeightedFreq,
    sumStats: {
      min: sumAccum.min === Infinity ? 0 : sumAccum.min,
      max: sumAccum.max,
      avg: total > 0 ? Math.round(sumAccum.total / total) : 0
    },
    repeticoes
  }
  saveFreqCache(id, data)
  return data
}
