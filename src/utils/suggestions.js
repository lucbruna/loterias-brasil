function weightedPick(disp, pesos, picks) {
  const sel = []
  const pool = [...disp]
  for (let s = 0; s < picks; s++) {
    const totalPeso = pool.reduce((sum, n) => sum + (pesos[n] || 0.01), 0)
    let alvo = Math.random() * totalPeso
    for (let i = 0; i < pool.length; i++) {
      alvo -= (pesos[pool[i]] || 0.01)
      if (alvo <= 0) { sel.push(pool[i]); pool.splice(i, 1); break }
    }
  }
  return sel.sort((a, b) => a - b)
}

function estrategiaFrequencia(stats, maxNum, picks) {
  const totalCtx = stats?.totalConcursos || 0
  const freq = stats?.freq || {}
  const { quentes = [], frios = [], atrasados = [] } = stats || {}
  const pesos = {}
  for (let i = 1; i <= maxNum; i++) {
    const ocorrencias = freq[i] || 0
    pesos[i] = totalCtx > 0 ? 1 + (ocorrencias / totalCtx) * 12 : 1
  }
  quentes.forEach((n, idx) => { pesos[n] = (pesos[n] || 1) + 3.0 - idx * 0.25 })
  atrasados.forEach(n => { pesos[n] = (pesos[n] || 1) + 2.5 })
  frios.forEach(n => { pesos[n] = (pesos[n] || 1) + 0.8 })
  for (let i = 1; i <= maxNum; i++) pesos[i] += Math.random() * 0.9

  return weightedPick(Array.from({ length: maxNum }, (_, i) => i + 1), pesos, picks)
}

function estrategiaGap(stats, maxNum, picks) {
  const freq = stats?.freq || {}
  const gaps = stats?.gaps || {}
  const pesos = {}
  for (let i = 1; i <= maxNum; i++) {
    const gap = gaps[i] || 50
    const oc = freq[i] || 0
    pesos[i] = (gap / 5) + (oc > 0 ? 0 : 5) + Math.random() * 1.5
  }
  return weightedPick(Array.from({ length: maxNum }, (_, i) => i + 1), pesos, picks)
}

function estrategiaRecente(stats, maxNum, picks) {
  const rwf = stats?.recencyWeightedFreq || stats?.freq || {}
  const totalCtx = stats?.totalConcursos || 0
  const pesos = {}
  for (let i = 1; i <= maxNum; i++) {
    const rw = rwf[i] || 0
    pesos[i] = totalCtx > 0 ? 1 + (rw / totalCtx) * 15 : 1
  }
  for (let i = 1; i <= maxNum; i++) pesos[i] += Math.random() * 0.7
  return weightedPick(Array.from({ length: maxNum }, (_, i) => i + 1), pesos, picks)
}

function estrategiaBalanceada(stats, maxNum, picks) {
  const freq = stats?.freq || {}
  const totalCtx = stats?.totalConcursos || 0
  const partes = Math.ceil(picks / 3)
  const terco = Math.floor(maxNum / 3)
  const sel = []
  const usado = new Set()

  for (let t = 0; t < 3; t++) {
    const ini = t * terco + 1
    const fim = t === 2 ? maxNum : (t + 1) * terco
    const cand = []
    for (let i = ini; i <= fim; i++) {
      const oc = freq[i] || 0
      const peso = totalCtx > 0 ? 1 + (oc / totalCtx) * 8 : 1
      cand.push({ n: i, p: peso + Math.random() * 0.5 })
    }
    cand.sort((a, b) => b.p - a.p)
    const qtd = t === 2 ? picks - sel.length : Math.min(partes, fim - ini + 1)
    for (let i = 0; i < qtd && sel.length < picks; i++) {
      if (!usado.has(cand[i].n)) {
        sel.push(cand[i].n)
        usado.add(cand[i].n)
      }
    }
  }

  if (sel.length < picks) {
    for (let i = 1; i <= maxNum && sel.length < picks; i++) {
      if (!usado.has(i)) { sel.push(i); usado.add(i) }
    }
  }
  return sel.sort((a, b) => a - b)
}

function estrategiaParidade(stats, maxNum, picks) {
  const freq = stats?.freq || {}
  const totalCtx = stats?.totalConcursos || 0
  const alvoPares = Math.round(picks * 0.5)
  const alvoImpares = picks - alvoPares

  const pares = [], impares = []
  for (let i = 1; i <= maxNum; i++) {
    const peso = totalCtx > 0 ? 1 + ((freq[i] || 0) / totalCtx) * 10 + Math.random() * 0.6 : 1
    if (i % 2 === 0) pares.push({ n: i, p: peso })
    else impares.push({ n: i, p: peso })
  }
  pares.sort((a, b) => b.p - a.p)
  impares.sort((a, b) => b.p - a.p)

  const sel = []
  for (let i = 0; i < alvoPares && i < pares.length; i++) sel.push(pares[i].n)
  for (let i = 0; i < alvoImpares && i < impares.length; i++) sel.push(impares[i].n)

  if (sel.length < picks) {
    const rest = Array.from({ length: maxNum }, (_, i) => i + 1).filter(n => !sel.includes(n))
    for (const n of rest) { if (sel.length >= picks) break; sel.push(n) }
  }
  return sel.sort((a, b) => a - b)
}

function estrategiaSoma(stats, maxNum, picks) {
  const freq = stats?.freq || {}
  const totalCtx = stats?.totalConcursos || 0
  const sumStats = stats?.sumStats || {}
  const alvo = sumStats.avg || Math.round((1 + maxNum) / 2 * picks)
  const tolerancia = Math.round((sumStats.max - sumStats.min) * 0.25) || Math.round(maxNum * picks * 0.1)

  let melhor = null
  let melhorDist = Infinity

  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const pesos = {}
    for (let i = 1; i <= maxNum; i++) {
      const oc = freq[i] || 0
      pesos[i] = totalCtx > 0 ? 1 + (oc / totalCtx) * 8 + Math.random() * 1.0 : 1
    }
    const sel = weightedPick(Array.from({ length: maxNum }, (_, i) => i + 1), pesos, picks)
    const soma = sel.reduce((a, b) => a + b, 0)
    const dist = Math.abs(soma - alvo)
    if (dist <= tolerancia && dist < melhorDist) {
      melhorDist = dist
      melhor = sel
    }
    if (melhor && melhorDist === 0) break
  }

  return melhor || weightedPick(Array.from({ length: maxNum }, (_, i) => i + 1), Object.fromEntries(Array.from({ length: maxNum }, (_, i) => [i + 1, 1 + Math.random()])), picks)
}

function filtrarPadroes(selecionados, ranking, maxNum, picks) {
  let tentativas = 0
  let resultado = [...selecionados]

  while (tentativas < 10) {
    let modificado = false

    for (let i = 0; i <= resultado.length - 3; i++) {
      if (resultado[i + 2] - resultado[i] === 2) {
        const remover = resultado[i + 1]
        const subs = ranking.find(r => !resultado.includes(r.n) && Math.abs(r.n - remover) > 3)
        if (subs) {
          resultado = resultado.filter(n => n !== remover)
          resultado.push(subs.n)
          resultado.sort((a, b) => a - b)
          modificado = true
          break
        }
      }
    }
    if (modificado) { tentativas++; continue }

    const dezenaCount = {}
    for (const n of resultado) {
      const f = Math.floor((n - 1) / 10)
      dezenaCount[f] = (dezenaCount[f] || 0) + 1
    }
    for (const [f, c] of Object.entries(dezenaCount)) {
      if (c >= 4) {
        const alvo = resultado.find(n => Math.floor((n - 1) / 10) === parseInt(f))
        if (alvo) {
          const subs = ranking.find(r => !resultado.includes(r.n) && Math.floor((r.n - 1) / 10) !== parseInt(f))
          if (subs) {
            resultado = resultado.filter(n => n !== alvo)
            resultado.push(subs.n)
            resultado.sort((a, b) => a - b)
            modificado = true
            break
          }
        }
      }
    }
    if (modificado) { tentativas++; continue }

    break
  }

  return resultado
}

export function builtinSug(stats, maxNum, picks) {
  const totalCtx = stats?.totalConcursos || 0
  const freq = stats?.freq || {}
  const sumStats = stats?.sumStats || {}

  const s1 = estrategiaFrequencia(stats, maxNum, picks)
  const s2 = estrategiaGap(stats, maxNum, picks)
  const s3 = estrategiaRecente(stats, maxNum, picks)
  const s4 = estrategiaBalanceada(stats, maxNum, picks)
  const s5 = estrategiaParidade(stats, maxNum, picks)
  const s6 = estrategiaSoma(stats, maxNum, picks)

  const votos = {}
  const todasEstrategias = [s1, s2, s3, s4, s5, s6]
  const pesosEstrategia = [3.0, 2.5, 3.0, 2.0, 2.5, 2.5]
  for (let e = 0; e < todasEstrategias.length; e++) {
    for (const n of todasEstrategias[e]) {
      votos[n] = (votos[n] || 0) + pesosEstrategia[e]
    }
  }

  for (let i = 1; i <= maxNum; i++) {
    votos[i] = (votos[i] || 0) + Math.random() * 0.3
  }

  const ranking = Object.entries(votos)
    .map(([n, v]) => ({ n: parseInt(n), v }))
    .sort((a, b) => b.v - a.v)

  let selecionados = ranking.slice(0, picks).map(x => x.n).sort((a, b) => a - b)
  selecionados = filtrarPadroes(selecionados, ranking, maxNum, picks)

  const pares = selecionados.filter(n => n % 2 === 0).length
  const impares = picks - pares

  const faixas = {}
  for (const n of selecionados) {
    const f = Math.floor((n - 1) / 10) * 10
    faixas[f] = (faixas[f] || 0) + 1
  }
  const dezenasStr = Object.entries(faixas)
    .sort((a, b) => a[0] - b[0])
    .map(([f, c]) => `${+f + 1}-${Math.min(+f + 9, maxNum)} (${c})`)
    .join(', ')

  const freqSug = selecionados.map(n => {
    const ocorr = freq[n] || 0
    const pct = totalCtx > 0 ? ((ocorr / totalCtx) * 100).toFixed(1) + '%' : '—'
    return { num: n, freq: ocorr, pct }
  })

  const melhorEstrategia = (() => {
    const scores = [
      ['Frequência Ponderada', s1.filter(n => selecionados.includes(n)).length],
      ['Gap Analysis', s2.filter(n => selecionados.includes(n)).length],
      ['Recência Ponderada', s3.filter(n => selecionados.includes(n)).length],
      ['Distribuição Balanceada', s4.filter(n => selecionados.includes(n)).length],
      ['Paridade Inteligente', s5.filter(n => selecionados.includes(n)).length],
      ['Soma Alvo', s6.filter(n => selecionados.includes(n)).length]
    ]
    scores.sort((a, b) => b[1] - a[1])
    return scores[0][1] > 0 ? scores[0][0] : 'Ensemble Total'
  })()

  const scoreConfianca = (() => {
    if (totalCtx === 0) return 0
    let score = 0
    score += Math.min(totalCtx / 100, 1) * 3
    const concordancias = [s1, s2, s3, s4, s5, s6].map(s =>
      selecionados.filter(n => s.includes(n)).length / picks
    )
    const concMedia = concordancias.reduce((a, b) => a + b, 0) / concordancias.length
    score += concMedia * 3
    const cv = parseFloat(stats?.cv || 100)
    score += Math.max(0, 1 - cv / 100) * 2
    const zeros = selecionados.filter(n => !freq[n]).length
    score += Math.max(0, 1 - zeros / picks) * 2
    return Math.min(score, 10)
  })()

  const confianca = scoreConfianca >= 7 ? 'Alta' : scoreConfianca >= 4 ? 'Média' : 'Baixa'

  const estrategia = totalCtx > 0
    ? `Ensemble: ${melhorEstrategia}`
    : 'Distribuição Aleatória'

  const analise = `Análise ensemble de ${totalCtx > 0 ? `${totalCtx} concursos` : 'distribuição'}. ` +
    `${pares} pares, ${impares} ímpares. ` +
    `Dezenas: ${dezenasStr}. ` +
    `Estratégia dominante: ${melhorEstrategia}. ` +
    `Score: ${scoreConfianca.toFixed(1)}/10.`

  return {
    numeros: selecionados,
    freqSug,
    estrategia,
    analise,
    parImpar: `${pares} pares e ${impares} ímpares`,
    dezenas: dezenasStr,
    confianca,
    scoreConfianca: scoreConfianca.toFixed(1),
    estrategiasUsadas: todasEstrategias,
    votos: Object.fromEntries(ranking.slice(0, picks).map(({ n, v }) => [n, v.toFixed(1)]))
  }
}
