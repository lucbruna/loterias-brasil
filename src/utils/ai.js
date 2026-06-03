async function callGemini(msgs, key) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024, responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(15000)
    }
  )
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`) }
  const d = await res.json()
  return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callQwen(msgs, key) {
  const res = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: { messages: msgs.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) },
        parameters: { result_format: 'message', temperature: 0.7, max_tokens: 1024 }
      }),
      signal: AbortSignal.timeout(15000)
    }
  )
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`) }
  const d = await res.json()
  return d.output?.choices?.[0]?.message?.content || ''
}

export const AI_PROVIDERS = {
  gemini: { name: 'Google Gemini', call: callGemini },
  qwen: { name: 'Alibaba Qwen', call: callQwen }
}

export async function genWithAI(mem, st, L, active) {
  const p = mem.aiProvider
  const cfg = AI_PROVIDERS[p]
  if (!cfg) return null
  const key = p === 'gemini' ? mem.geminiKey : mem.qwenKey
  if (!key) return null

  const past = mem.suggestions.filter(s => s.lottery === active).slice(0, 5)
  const ctx = past.length
    ? `Evite repetir estes números já sugeridos: ${past.map(s => `[${s.numbers.join(',')}]`).join('; ')}.`
    : ''

  const quentesStr = st?.quentes?.join(',') || 'n/d'
  const friosStr = st?.frios?.join(',') || 'n/d'
  const atrasadosStr = st?.atrasados?.join(',') || 'n/d'
  const cvStr = st?.cv || 'n/d'
  const paridadeStr = st?.paridade ? `pares=${st.paridade.pares}, impares=${st.paridade.impares}` : 'n/d'
  const quartilStr = st?.quartil
    ? `Q1=${st.quartil[0]}, Q2=${st.quartil[1]}, Q3=${st.quartil[2]}, Q4=${st.quartil[3]}`
    : 'n/d'
  const totalCtx = st?.totalConcursos || 0

  const freqArr = st?.freq
    ? Object.entries(st.freq).map(([n, c]) => [parseInt(n), c]).sort((a, b) => b[1] - a[1]).slice(0, 10)
    : []
  const freqStr = freqArr.map(([n, c]) => `${n}(${c}x)`).join(', ')

  const prompt = `Você é especialista em análise estatística de loterias brasileiras. Use os dados reais abaixo para gerar palpites inteligentes.

${L.name} — ${totalCtx} concursos analisados:
- Quentes (top 10): ${quentesStr}
- Frios (bottom 10): ${friosStr}
- Atrasados (maior gap): ${atrasadosStr}
- Paridade: ${paridadeStr}
- Distribuição Quartis: ${quartilStr}
- Coeficiente de Variação: ${cvStr}
- Top frequências: ${freqStr}

${ctx}

Regras:
1. Gere ${L.picks} números ÚNICOS entre 1 e ${L.maxNum}, ordenados crescentemente
2. Equilibre entre números quentes (que mais saem) e atrasados (que estão devendo)
3. Evite padrões óbvios: sequências (12,13,14), múltiplos (10,20,30), ou todos pares/ímpares
4. Distribuição heterogênea: não concentre em uma única dezena
5. Prefira números com frequência moderada (nem os mais quentes nem os mais frios)

Responda APENAS JSON válido (sem markdown):
{"numeros":[${L.picks} inteiros],"estrategia":"3-5 palavras em português","analise":"breve análise em português","parImpar":"X pares, Y ímpares","dezenas":"distribuição","confianca":"Alta/Média/Baixa"}`

  try {
    const txt = await cfg.call([{ role: 'user', content: prompt }], key)
    const cleaned = txt.replace(/`json\s*|```/gi, '').trim()
    const match = cleaned.match(/\{[\s\S]*?(?=\}|$)/)
    const jsonStr = match ? match[0] + '}' : ''
    const parsed = JSON.parse(jsonStr)
    if (parsed?.numeros?.length === L.picks && parsed.numeros.every(n => Number.isInteger(n) && n >= 1 && n <= L.maxNum)) {
      return parsed
    }
  } catch (e) { console.error(`${p}:`, e.message) }
  return null
}
