export function calcGaps(fd, maxNum) {
  const { freq = {}, totalContests = 0, lastAppearance = {}, lastContest = 0 } = fd || {}
  const gaps = {}
  for (let i = 1; i <= maxNum; i++) {
    const oc = freq[i] || 0
    if (lastAppearance[i] && lastContest > 0) {
      gaps[i] = lastContest - lastAppearance[i]
    } else {
      gaps[i] = oc > 0 ? Math.round(totalContests / oc) : totalContests + 10
    }
  }
  return gaps
}

export function computeStats(fd, maxNum) {
  const {
    freq = {},
    totalContests = 0,
    lastAppearance = {},
    lastContest = 0,
    recencyWeightedFreq = null,
    sumStats = null,
    repeticoes = null
  } = fd || {}

  const entries = Object.entries(freq)
    .map(([n, c]) => [parseInt(n), c])
    .filter(([n]) => n >= 1 && n <= maxNum)
  entries.sort((a, b) => b[1] - a[1])

  const allN = Array.from({ length: maxNum }, (_, i) => i + 1)
  const zeroNums = allN.filter(n => !freq[n]).map(n => [n, 0])
  const media = totalContests > 0 ? totalContests / maxNum : 1

  const quentes = entries.slice(0, Math.min(10, entries.length)).map(x => x[0])
  const coldSet = new Set([...entries.slice(-Math.min(8, entries.length)), ...zeroNums].map(x => x[0]))
  const frios = [...coldSet].slice(0, 10)

  const gaps = calcGaps(fd, maxNum)
  const atrasados = Object.entries(gaps)
    .filter(([n]) => freq[n] && freq[n] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(x => parseInt(x[0]))
  if (atrasados.length < 5) {
    const missing = allN.filter(n => !atrasados.includes(n) && !freq[n]).slice(0, 5 - atrasados.length)
    atrasados.push(...missing)
  }

  const pares = allN.filter(n => n % 2 === 0).reduce((s, n) => s + (freq[n] || 0), 0)
  const impares = allN.filter(n => n % 2 !== 0).reduce((s, n) => s + (freq[n] || 0), 0)
  const tot = pares + impares

  const variancia = allN.reduce((s, n) => s + (((freq[n] || 0) - media) ** 2), 0) / maxNum
  const desvPad = Math.sqrt(variancia)

  let quiQuadrado = 0
  for (const n of allN) {
    const obs = freq[n] || 0
    if (media > 0) quiQuadrado += ((obs - media) ** 2) / media
  }

  const lim = Math.ceil(maxNum / 4)
  const quartil = [0, 0, 0, 0]
  for (let q = 0; q < 4; q++) {
    for (let n = q * lim + 1; n <= Math.min((q + 1) * lim, maxNum); n++) {
      quartil[q] += freq[n] || 0
    }
  }

  const lastDigits = {}
  for (let d = 0; d <= 9; d++) lastDigits[d] = 0
  for (const [n, c] of entries) {
    const dig = n % 10
    lastDigits[dig] = (lastDigits[dig] || 0) + c
  }

  const faixas10 = {}
  for (const [n, c] of entries) {
    const f = Math.floor((n - 1) / 10) * 10
    faixas10[f] = (faixas10[f] || 0) + c
  }

  return {
    quentes, frios, atrasados,
    gaps,
    paridade: tot
      ? { pares: ((pares / tot) * 100).toFixed(1) + '%', impares: ((impares / tot) * 100).toFixed(1) + '%' }
      : { pares: '—', impares: '—' },
    totalConcursos: totalContests, freq, media,
    desvPad: desvPad.toFixed(2),
    quiQuadrado: quiQuadrado.toFixed(2),
    cv: (media > 0 ? (desvPad / media) * 100 : 0).toFixed(1) + '%',
    quartil: quartil.map(v => v.toFixed(0)),
    lastDigits,
    faixas10,
    recencyWeightedFreq,
    sumStats,
    repeticoes,
    lastAppearance,
    lastContest
  }
}
