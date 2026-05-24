import { useState, useEffect, useCallback, useRef, Component } from 'react'

/* ===================================================================
   LOTERIAS BRASIL v2 — Análise Inteligente
   ───────────────────────────────────────────
   • Resultados oficiais via Caixa Econômica Federal (proxy Vite)
   • Estatísticas históricas com cache
   • Sugestões com IA (Gemini / Qwen) ou estatística embutida
   • Probabilidades matemáticas de cada loteria
   • Memória + avaliações (localStorage)
   =================================================================== */

/* -------------------------------------------------------------------
   ERROR BOUNDARY
   ------------------------------------------------------------------- */
class ErrorBoundary extends Component {
  state = { error: null, info: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); this.setState({ info }) }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#07090f', color: '#e0e0ec',
          fontFamily: "'DM Sans', sans-serif", display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 40
        }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#ff6b6b', fontSize: 18, marginBottom: 8 }}>Algo deu errado</h2>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16, fontFamily: "'Space Mono', monospace", wordBreak: 'break-all' }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </p>
            <button onClick={() => window.location.reload()}
              style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: '#ff6b6b', color: '#fff', fontSize: 13, cursor: 'pointer'
              }}>Recarregar</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* -------------------------------------------------------------------
   PROBABILIDADES
   ------------------------------------------------------------------- */
function comb(n, k) {
  if (k > n) return 0
  if (k === 0 || k === n) return 1
  k = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i
  return r
}

const PROBS = {
  megasena: [
    { label: 'Sena (6)', chance: `1 em ${comb(60,6).toLocaleString('pt-BR')}` },
    { label: 'Quina (5)', chance: `1 em ${Math.round(comb(60,6)/(comb(6,5)*comb(54,1))).toLocaleString('pt-BR')}` },
    { label: 'Quadra (4)', chance: `1 em ${Math.round(comb(60,6)/(comb(6,4)*comb(54,2))).toLocaleString('pt-BR')}` }
  ],
  lotofacil: [
    { label: '15 pontos', chance: `1 em ${comb(25,15).toLocaleString('pt-BR')}` },
    { label: '14 pontos', chance: `1 em ${Math.round(comb(25,15)/(comb(15,14)*comb(10,1))).toLocaleString('pt-BR')}` },
    { label: '13 pontos', chance: `1 em ${Math.round(comb(25,15)/(comb(15,13)*comb(10,2))).toLocaleString('pt-BR')}` },
    { label: '12 pontos', chance: `1 em ${Math.round(comb(25,15)/(comb(15,12)*comb(10,3))).toLocaleString('pt-BR')}` },
    { label: '11 pontos', chance: `1 em ${Math.round(comb(25,15)/(comb(15,11)*comb(10,4))).toLocaleString('pt-BR')}` }
  ],
  lotomania: [
    { label: '20 pontos', chance: `1 em ${comb(100,20).toExponential(4).replace('+','')}` },
    { label: '19 pontos', chance: `1 em ${Math.round(comb(100,20)/(comb(20,19)*comb(80,1))).toExponential(3).replace('+','')}` },
    { label: '18 pontos', chance: `1 em ${Math.round(comb(100,20)/(comb(20,18)*comb(80,2))).toExponential(2).replace('+','')}` },
    { label: '17 pontos', chance: `1 em ${Math.round(comb(100,20)/(comb(20,17)*comb(80,3))).toExponential(1).replace('+','')}` },
    { label: '16 pontos', chance: `1 em ${Math.round(comb(100,20)/(comb(20,16)*comb(80,4))).toExponential(0)}` },
    { label: '15 pontos', chance: `1 em ${Math.round(comb(100,20)/(comb(20,15)*comb(80,5))).toExponential(0)}` },
    { label: '0 pontos',  chance: `1 em ${Math.round(comb(100,20)/comb(80,20)).toExponential(0)}` }
  ]
}

/* -------------------------------------------------------------------
   LOTERIAS
   ------------------------------------------------------------------- */
const LOTTERIES = {
  megasena: { id:'megasena', name:'Mega-Sena', abbr:'MEGA-SENA', apiName:'megasena', maxNum:60, picks:6, color:'#00d468', darkBg:'#001a0e', glow:'0,212,104', border:'rgba(0,212,104,0.35)', ball:'linear-gradient(145deg,#00d468 0%,#005c2e 100%)', ballBorder:'#00ff88', icon:'🎱' },
  lotofacil: { id:'lotofacil', name:'Lotofácil', abbr:'LOTOFÁCIL', apiName:'lotofacil', maxNum:25, picks:15, color:'#d966ff', darkBg:'#1a0020', glow:'217,102,255', border:'rgba(217,102,255,0.35)', ball:'linear-gradient(145deg,#d966ff 0%,#5c0080 100%)', ballBorder:'#ee88ff', icon:'💜' },
  lotomania: { id:'lotomania', name:'Lotomania', abbr:'LOTOMANIA', apiName:'lotomania', maxNum:100, picks:20, color:'#ff9500', darkBg:'#1a0d00', glow:'255,149,0', border:'rgba(255,149,0,0.35)', ball:'linear-gradient(145deg,#ff9500 0%,#7a3c00 100%)', ballBorder:'#ffbb44', icon:'🟠' }
}

/* -------------------------------------------------------------------
   API CAIXA (proxy Vite)
   ------------------------------------------------------------------- */
const CAIXA = '/api/caixa'

async function fetchCaixa(path, signal) {
  const res = await fetch(`${CAIXA}/${path}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const d = await res.json()
  if (!d || !d.listaDezenas) throw new Error('Resposta inválida')
  const numeros = d.listaDezenas.map(n => parseInt(n,10)).filter(n => !isNaN(n)).sort((a,b)=>a-b)
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

/* -------------------------------------------------------------------
   CACHE (localStorage)
   ------------------------------------------------------------------- */
const CACHE_PREFIX = '@loteria-brasil/freq-'
const MEM_KEY = '@loteria-brasil/memory'

function loadFreqCache(id) {
  try { const r = localStorage.getItem(CACHE_PREFIX + id); if (r) return JSON.parse(r) } catch {}
  return null
}
function saveFreqCache(id, d) {
  try { localStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ ...d, cachedAt: Date.now() })) } catch {}
}

function loadMemory() {
  try {
    const r = localStorage.getItem(MEM_KEY)
    if (r) {
      const p = JSON.parse(r)
      if (p?.suggestions?.length) p.suggestions = p.suggestions.filter(s => s && Array.isArray(s.numbers))
      if (!p.geminiKey && import.meta.env?.VITE_GEMINI_API_KEY) p.geminiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!p.qwenKey && import.meta.env?.VITE_QWEN_API_KEY) p.qwenKey = import.meta.env.VITE_QWEN_API_KEY
      if (!p.aiProvider && (p.geminiKey || p.qwenKey)) p.aiProvider = p.geminiKey ? 'gemini' : 'qwen'
      return p
    }
  } catch {}
  const envGem = import.meta.env?.VITE_GEMINI_API_KEY || ''
  const envQwen = import.meta.env?.VITE_QWEN_API_KEY || ''
  const prov = envGem ? 'gemini' : envQwen ? 'qwen' : ''
  return { suggestions: [], geminiKey: envGem, qwenKey: envQwen, aiProvider: prov }
}
function saveMemory(m) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(m)) } catch {}
}
const THEME_KEY = '@loteria-brasil/theme'
function loadTheme() {
  try { const r = localStorage.getItem(THEME_KEY); if (r === 'light' || r === 'dark') return r } catch {}
  return 'dark'
}
function saveTheme(t) {
  try { localStorage.setItem(THEME_KEY, t) } catch {}
}

/* -------------------------------------------------------------------
   HISTÓRICO (lotes paralelos)
   ------------------------------------------------------------------- */
async function fetchHistoryStats(id, apiName, maxCtx = 50) {
  const cached = loadFreqCache(id)
  if (cached && Date.now() - cached.cachedAt < 3600000) return cached

  let total = 0
  const freq = {}
  const latest = await fetchCaixa(apiName, AbortSignal.timeout(10000))
  for (const n of latest.numeros) freq[n] = (freq[n] || 0) + 1
  total++

  let cur = latest.anterior
  while (cur > 0 && total < maxCtx) {
    const batch = []
    for (let i = 0; i < 5 && cur - i > 0 && total + batch.length < maxCtx; i++) batch.push(cur - i)
    if (!batch.length) break
    const results = await Promise.allSettled(batch.map(n => fetchCaixa(`${apiName}/${n}`, AbortSignal.timeout(6000))))
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        for (const n of r.value.numeros) freq[n] = (freq[n] || 0) + 1
        total++
      }
    }
    cur -= 5
    // delay entre lotes
    await new Promise(r => setTimeout(r, 150))
  }

  const data = { freq, totalContests: total, lastContest: latest.concurso }
  saveFreqCache(id, data)
  return data
}

/* -------------------------------------------------------------------
   ESTATÍSTICA
   ------------------------------------------------------------------- */
function computeStats(fd, maxNum) {
  const { freq = {}, totalContests = 0 } = fd || {}
  const e = Object.entries(freq).map(([n, c]) => [parseInt(n), c]).filter(([n]) => n >= 1 && n <= maxNum)
  e.sort((a, b) => b[1] - a[1])
  const allN = Array.from({ length: maxNum }, (_, i) => i + 1)
  const zero = allN.filter(n => !freq[n]).map(n => [n, 0])

  const quentes = e.slice(0, Math.min(10, e.length)).map(x => x[0])
  const frios = [...new Set([...e.slice(-Math.min(8, e.length)), ...zero].map(x => x[0]))].slice(0, 10)
  const minC = e.length ? e[e.length - 1][1] : 0
  const atrasados = allN.filter(n => (freq[n] || 0) <= minC + 1).slice(0, 5)

  const pares = allN.filter(n => n % 2 === 0).reduce((s, n) => s + (freq[n] || 0), 0)
  const impares = allN.filter(n => n % 2 !== 0).reduce((s, n) => s + (freq[n] || 0), 0)
  const tot = pares + impares

  return { quentes, frios, atrasados, paridade: tot ? { pares: ((pares/tot)*100).toFixed(1)+'%', impares: ((impares/tot)*100).toFixed(1)+'%' } : { pares: '—', impares: '—' }, totalConcursos: totalContests, freq }
}

/* -------------------------------------------------------------------
   SUGESTÃO EMBUTIDA — Análise Probabilística Ponderada
   Cada chamada gera números DIFERENTES usando pesos reais dos
   últimos concursos + jitter aleatório.
   ------------------------------------------------------------------- */
function builtinSug(stats, maxNum, picks) {
  const totalCtx = stats?.totalConcursos || 0
  const freq = stats?.freq || {}
  const { quentes = [], frios = [], atrasados = [] } = stats || {}

  // Mapa de pesos para cada número (1 a maxNum)
  const pesos = {}
  for (let i = 1; i <= maxNum; i++) {
    // Peso base: frequência real do número (quantas vezes saiu)
    const ocorrencias = freq[i] || 0
    pesos[i] = totalCtx > 0 ? 1 + (ocorrencias / totalCtx) * 10 : 1
  }

  // Bônus para números quentes (mais frequentes)
  quentes.forEach((n, idx) => {
    pesos[n] = (pesos[n] || 1) + 2.5 - idx * 0.2
  })

  // Bônus para números atrasados (devem sair em breve)
  atrasados.forEach(n => {
    pesos[n] = (pesos[n] || 1) + 2.0
  })

  // Pequeno bônus para números frios (podem estar "devendo")
  frios.forEach(n => {
    pesos[n] = (pesos[n] || 1) + 0.6
  })

  // Jitter aleatório — GARANTE que cada sugestão seja ÚNICA
  for (let i = 1; i <= maxNum; i++) {
    pesos[i] += Math.random() * 0.9
  }

  // Seleção ponderada SEM reposição (roleta viciada)
  const selecionados = []
  const disponiveis = Array.from({ length: maxNum }, (_, i) => i + 1)

  for (let s = 0; s < picks; s++) {
    const totalPeso = disponiveis.reduce((sum, n) => sum + (pesos[n] || 0.01), 0)
    let alvo = Math.random() * totalPeso
    for (let i = 0; i < disponiveis.length; i++) {
      alvo -= (pesos[disponiveis[i]] || 0.01)
      if (alvo <= 0) {
        selecionados.push(disponiveis[i])
        disponiveis.splice(i, 1)
        break
      }
    }
  }

  selecionados.sort((a, b) => a - b)

  // Estatísticas da sugestão
  const pares = selecionados.filter(n => n % 2 === 0).length
  const impares = picks - pares

  const faixas = {}
  for (const n of selecionados) {
    const f = Math.floor((n - 1) / 10) * 10
    faixas[f] = (faixas[f] || 0) + 1
  }
  const dezenasStr = Object.entries(faixas)
    .sort((a, b) => a[0] - b[0])
    .map(([f, c]) => `${+f+1}-${Math.min(+f+9, maxNum)} (${c})`)
    .join(', ')

  // Frequência individual de cada número sugerido
  const freqSug = selecionados.map(n => {
    const ocorr = freq[n] || 0
    const pct = totalCtx > 0 ? ((ocorr / totalCtx) * 100).toFixed(1) + '%' : '—'
    return { num: n, freq: ocorr, pct }
  })

  const estrategia = totalCtx > 0
    ? 'Análise Probabilística Ponderada'
    : 'Distribuição Aleatória'

  const analise = `Baseado em ${totalCtx > 0 ? `${totalCtx} concursos reais` : 'distribuição aleatória'}. ` +
    `${pares} pares e ${impares} ímpares. ` +
    `Dezenas: ${dezenasStr}. ` +
    `Números com maior peso: ${selecionados.slice(0, 3).map(n => `${n} (${freqSug.find(f => f.num === n)?.pct || '—'})`).join(', ')}.`

  return {
    numeros: selecionados,
    freqSug,
    estrategia,
    analise,
    parImpar: `${pares} pares e ${impares} ímpares`,
    dezenas: dezenasStr,
    confianca: totalCtx > 20 ? 'Alta' : totalCtx > 0 ? 'Média' : 'Baixa'
  }
}

/* -------------------------------------------------------------------
   IA EXTERNA
   ------------------------------------------------------------------- */
async function callGemini(msgs, key) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { temperature:0.7, maxOutputTokens:1024, responseMimeType:'application/json' } }),
      signal: AbortSignal.timeout(15000) })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`) }
  const d = await res.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callQwen(msgs, key) {
  const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
      body: JSON.stringify({ model:'qwen-turbo', input:{ messages: msgs.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) }, parameters:{ result_format:'message', temperature:0.7, max_tokens:1024 } }),
      signal: AbortSignal.timeout(15000) })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`) }
  const d = await res.json(); return d.output?.choices?.[0]?.message?.content || ''
}

const AI_PROVIDERS = { gemini: { name:'Google Gemini', call:callGemini }, qwen: { name:'Alibaba Qwen', call:callQwen } }

async function genWithAI(mem, st, L, active) {
  const p = mem.aiProvider; const cfg = AI_PROVIDERS[p]; if (!cfg) return null
  const key = p === 'gemini' ? mem.geminiKey : mem.qwenKey; if (!key) return null
  const past = mem.suggestions.filter(s => s.lottery === active).slice(0, 5)
  const ctx = past.length ? `Sugestões anteriores: ${past.map(s => `[${s.numbers.join(',')}]`).join('; ')}. NÃO repita.` : ''
  const prompt = `Você é especialista em loterias brasileiras. Dados da ${L.name}: quentes=${st?.quentes?.join(',')||'n/d'}, frios=${st?.frios?.join(',')||'n/d'}, atrasados=${st?.atrasados?.join(',')||'n/d'}. ${ctx} Gere ${L.picks} números (1-${L.maxNum}) equilibrando quentes/frios/atrasados, sem padrões óbvios. Responda APENAS JSON: {"numeros":[${L.picks} inteiros únicos crescentes],"estrategia":"3-5 palavras","analise":"2-3 frases em português","parImpar":"X pares e Y ímpares","dezenas":"distribuição","confianca":"Alta/Média/Baixa"}`
  try {
    const txt = await cfg.call([{ role:'user', content: prompt }], key)
    const match = txt.replace(/`json\s*|```/gi,'').trim().match(/\{[\s\S]*?\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    if (parsed?.numeros?.length === L.picks && parsed.numeros.every(n => n >= 1 && n <= L.maxNum)) return parsed
  } catch (e) { console.error(`${p}:`, e.message) }
  return null
}

/* ===================================================================
   COMPONENTES
   =================================================================== */
function Ball({ number, gradient, borderColor, size = 46, delay = 0, glowColor }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: gradient,
      border: `1.5px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Mono', monospace", fontWeight: 700,
      fontSize: size * 0.32, color: '#fff',
      boxShadow: glowColor ? `0 0 18px rgba(${glowColor},0.6),0 0 40px rgba(${glowColor},0.25),inset 0 1px 2px rgba(255,255,255,0.25)` : 'inset 0 1px 2px rgba(255,255,255,0.15),0 4px 12px rgba(0,0,0,0.5)',
      animation: `ballIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) ${delay}s both`,
      flexShrink: 0
    }}>
      {String(number).padStart(2, '0')}
    </div>
  )
}

function Spinner({ color }) {
  return <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${color}22`, borderTopColor:color, animation:'spin 0.7s linear infinite', margin:'0 auto' }} />
}

function ProbCard({ data, color }) {
  return (
    <div className="card" style={{ padding:20, marginBottom:14, borderColor:`${color}30` }}>
      <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9.5, letterSpacing:'2.5px', color, marginBottom:14, textTransform:'uppercase' }}>Probabilidades Matemáticas</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))', gap:8 }}>
        {(data || []).map((p, i) => (
          <div key={i} style={{ padding:'10px 12px', borderRadius:10, background:`${color}08`, border:`1px solid ${color}20` }}>
            <div style={{ fontSize:10, color:'#888', marginBottom:3 }}>{p.label}</div>
            <div style={{ fontSize:12, color:'#fff', fontWeight:700, fontFamily:"'Space Mono', monospace" }}>{p.chance}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===================================================================
   APP
   =================================================================== */
export default function App() {
  const [active, setActive] = useState('megasena')
  const [tab, setTab] = useState('resultado')
  const [results, setResults] = useState({})
  const [freqCache, setFreqCache] = useState({})
  const [stats, setStats] = useState({})
  const [sugs, setSugs] = useState({})
  const [loading, setLoading] = useState({ r: false, f: false, s: false })
  const [error, setError] = useState(null)
  const [lastUpd, setLastUpd] = useState(null)
  const [refreshSec, setRefreshSec] = useState(1800)
  const [memory, setMemory] = useState(loadMemory)
  const [showCfg, setShowCfg] = useState(false)
  const [cfgProvider, setCfgProvider] = useState(memory.aiProvider || 'gemini')
  const [cfgKey, setCfgKey] = useState('')
  const [toast, setToast] = useState(null)
  const [freqProg, setFreqProg] = useState(0)
  const [theme, setTheme] = useState(loadTheme)
  const [copied, setCopied] = useState(false)
  const statsLoadingRef = useRef(false)
  const timerRef = useRef(null)
  const countRef = useRef(null)

  const L = LOTTERIES[active] || LOTTERIES.megasena
  const result = results[active]
  const st = stats[active]
  const sug = sugs[active]
  const prob = PROBS[active] || []
  const sugHistory = memory.suggestions.filter(s => s.lottery === active)
  const aiConfigured = !!(memory.aiProvider && (memory.aiProvider === 'gemini' ? memory.geminiKey : memory.qwenKey))

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  /* ---- Buscar resultados ---- */
  const fetchResults = useCallback(async () => {
    setLoading(r => ({ ...r, r: true }))
    const out = {}
    for (const [key, l] of Object.entries(LOTTERIES)) {
      try { out[key] = await fetchCaixa(l.apiName, AbortSignal.timeout(10000)) }
      catch (e) { console.error(`${l.name}:`, e.message) }
    }
    if (Object.keys(out).length > 0) { setResults(out); setLastUpd(new Date()) }
    setLoading(r => ({ ...r, r: false }))
    setRefreshSec(1800)
  }, [])

  /* ---- Carregar estatísticas ---- */
  const loadStats = useCallback(async (id) => {
    if (statsLoadingRef.current) return
    statsLoadingRef.current = true
    const l = LOTTERIES[id]
    setLoading(r => ({ ...r, f: true }))
    setFreqProg(0)
    try {
      const fd = await fetchHistoryStats(id, l.apiName, 50)
      setFreqCache(c => ({ ...c, [id]: fd }))
      setStats(c => ({ ...c, [id]: computeStats(fd, l.maxNum) }))
      setFreqProg(fd.totalContests)
    } catch (e) { console.error(`Stats ${l.name}:`, e.message) }
    setLoading(r => ({ ...r, f: false }))
    statsLoadingRef.current = false
  }, [])

  /* ---- Gerar sugestão ---- */
  const generateSug = useCallback(async () => {
    setLoading(r => ({ ...r, s: true }))
    setError(null)
    try {
      const mem = loadMemory()
      let stLocal = stats[active]
      if (!stLocal && freqCache[active]) {
        stLocal = computeStats(freqCache[active], L.maxNum)
        setStats(c => ({ ...c, [active]: stLocal }))
      }
      if (!stLocal) stLocal = { quentes: [], frios: [], atrasados: [], paridade: {}, totalConcursos: 0 }
      let sugData = null
      if (mem.aiProvider && (mem.geminiKey || mem.qwenKey)) sugData = await genWithAI(mem, stLocal, L, active)
      if (!sugData) sugData = builtinSug(stLocal, L.maxNum, L.picks)
      const entry = { id: Date.now(), date: new Date().toISOString(), lottery: active, numbers: sugData.numeros, estrategia: sugData.estrategia, analise: sugData.analise, rating: null }
      mem.suggestions.unshift(entry)
      if (mem.suggestions.length > 50) mem.suggestions.length = 50
      saveMemory(mem)
      setMemory(mem)
      setSugs(p => ({ ...p, [active]: { ...sugData, id: entry.id } }))
    } catch (e) { setError(e.message || 'Erro') }
    setLoading(r => ({ ...r, s: false }))
  }, [active, L, stats, freqCache])

  /* ---- Efeitos ---- */
  useEffect(() => {
    fetchResults()
    timerRef.current = setInterval(fetchResults, 30 * 60 * 1000)
    countRef.current = setInterval(() => setRefreshSec(n => n > 0 ? n - 1 : 1800), 1000)
    return () => { clearInterval(timerRef.current); clearInterval(countRef.current) }
  }, [fetchResults])

  useEffect(() => {
    if (tab === 'frequencia' || tab === 'sugestao') {
      if (!freqCache[active] && !statsLoadingRef.current) loadStats(active)
      else if (freqCache[active] && !stats[active]) {
        setStats(c => ({ ...c, [active]: computeStats(freqCache[active], L.maxNum) }))
      }
    }
  }, [tab, active]) // eslint-disable-line

  /* ---- Helpers UI ---- */
  const fmt = (s) => { const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}` }

  const openCfg = () => { setCfgProvider(memory.aiProvider || 'gemini'); setCfgKey(memory.aiProvider === 'gemini' ? memory.geminiKey : memory.qwenKey || ''); setShowCfg(true) }
  const saveCfg = () => {
    const m = loadMemory(); m.aiProvider = cfgProvider
    if (cfgProvider === 'gemini') m.geminiKey = cfgKey; else if (cfgProvider === 'qwen') m.qwenKey = cfgKey
    saveMemory(m); setMemory(m); setShowCfg(false); showToast(cfgKey ? `${AI_PROVIDERS[cfgProvider].name} configurada!` : 'IA removida.')
  }
  const rateSug = (id, stars) => {
    const m = loadMemory(); const f = m.suggestions.find(s => s.id === id)
    if (f) { f.rating = stars; saveMemory(m); setMemory(m) }
    showToast(`${stars} ★`)
  }

  const sugId = sug?.id
  const currentRating = memory.suggestions.find(s => s.id === sugId)?.rating || 0

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <ErrorBoundary>
    <div data-theme={theme} style={{ minHeight:'100vh', background:'var(--bg,#07090f)', color:'var(--fg,#e0e0ec)', fontFamily:"'DM Sans', sans-serif", position:'relative', overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#07090f;--fg:#e0e0ec;--card:rgba(255,255,255,.03);--cardBorder:rgba(255,255,255,.07);--textDim:#555;--textMuted:#777;--textBright:#fff}
        [data-theme=light]{--bg:#f5f0eb;--fg:#1a1a2e;--card:rgba(0,0,0,.03);--cardBorder:rgba(0,0,0,.08);--textDim:#888;--textMuted:#999;--textBright:#000}
        body{background:var(--bg,#07090f);color:var(--fg,#e0e0ec)}
        @keyframes ballIn{from{opacity:0;transform:translateY(-14px) scale(0.6)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes floatIn{from{opacity:0;transform:scale(0.96) translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:none}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .fadeUp{animation:fadeUp .4s ease both}
        .floatIn{animation:floatIn .3s ease both}
        .lotBtn{transition:all .25s ease;cursor:pointer;border:none}
        .lotBtn:hover{transform:translateY(-3px)}
        .tabBtn{transition:all .2s ease;cursor:pointer;border:none}
        .tabBtn:hover:not(.active){opacity:.75}
        .primaryBtn{cursor:pointer;transition:all .2s ease;border:none;font-family:'DM Sans',sans-serif;font-weight:700;letter-spacing:.3px}
        .primaryBtn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1)}
        .primaryBtn:active:not(:disabled){transform:none}
        .primaryBtn:disabled{opacity:.5;cursor:not-allowed}
        .card{background:rgba(255,255,255,.03);border-radius:16px;border:1px solid rgba(255,255,255,.07);backdrop-filter:blur(12px)}
        .shimmer-line{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:400px 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        .rating-btn{cursor:pointer;background:none;border:none;font-size:16px;transition:all .2s;filter:grayscale(1);opacity:.4;padding:2px}
        .rating-btn.on{filter:grayscale(0);opacity:1}
        .rating-btn:hover{transform:scale(1.3);opacity:.9}
      `}</style>

      {/* Toast */}
      {toast && <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:`${L.color}20`, border:`1px solid ${L.color}50`, borderRadius:10, padding:'10px 22px', zIndex:1000, fontSize:12, color:'#fff', backdropFilter:'blur(16px)', animation:'slideDown .25s ease both', whiteSpace:'nowrap' }}>{toast}</div>}

      {/* Modal Config */}
      {showCfg && (
        <div style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)' }} onClick={() => setShowCfg(false)}>
          <div className="card" style={{ padding:26, maxWidth:420, width:'90%', borderColor:`${L.color}40` }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9.5, letterSpacing:'3px', color:L.color, marginBottom:16, textTransform:'uppercase' }}>Configurar IA</div>
            <p style={{ fontSize:12, color:'#666', marginBottom:16, lineHeight:1.6 }}>Escolha um provedor gratuito e cole sua chave. Sem chave, o app usa estatística embutida.</p>
            <div style={{ display:'flex', gap:6, marginBottom:14 }}>
              {Object.entries(AI_PROVIDERS).map(([id, p]) => (
                <button key={id} onClick={() => { setCfgProvider(id); setCfgKey('') }}
                  style={{ flex:1, padding:'8px 10px', borderRadius:8, background: cfgProvider === id ? `${L.color}18` : 'rgba(255,255,255,.03)', border:`1px solid ${cfgProvider === id ? L.color : 'rgba(255,255,255,.07)'}`, color: cfgProvider === id ? L.color : '#666', fontSize:11, fontFamily:"'DM Sans', sans-serif", fontWeight: cfgProvider === id ? 700 : 500, cursor:'pointer', transition:'all .2s' }}>{p.name}</button>
              ))}
            </div>
            <div style={{ fontSize:10, color:'#555', marginBottom:8, fontFamily:"'Space Mono', monospace" }}>Chave de API</div>
            <input value={cfgKey} onChange={e => setCfgKey(e.target.value)} placeholder="Cole sua chave aqui..." style={{ width:'100%', padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,.05)', color:'#fff', border:`1px solid ${cfgKey ? L.color : 'rgba(255,255,255,.1)'}`, outline:'none', fontSize:12, fontFamily:"'DM Sans', sans-serif" }} />
            <div style={{ marginTop:6, fontSize:10, color:'#555' }}><a href={AI_PROVIDERS[cfgProvider]?.name === 'Google Gemini' ? 'https://aistudio.google.com/app/apikey' : 'https://dashscope.aliyun.com'} target="_blank" rel="noreferrer" style={{ color:L.color }}>Obter chave gratuita →</a></div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button className="primaryBtn" onClick={saveCfg} style={{ flex:1, padding:'10px 20px', borderRadius:8, background:L.color, color:'#000', fontSize:12 }}>Salvar</button>
              <button className="primaryBtn" onClick={() => setShowCfg(false)} style={{ flex:1, padding:'10px 20px', borderRadius:8, background:'rgba(255,255,255,.05)', color:'#888', fontSize:12 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* BG */}
      <div style={{ position:'fixed', top:-300, right:-200, width:700, height:700, borderRadius:'50%', background:`radial-gradient(circle,rgba(${L.glow},.08) 0%,transparent 65%)`, pointerEvents:'none', zIndex:0, transition:'all 1.2s ease' }} />
      <div style={{ position:'fixed', bottom:-200, left:-200, width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle,rgba(${L.glow},.05) 0%,transparent 65%)`, pointerEvents:'none', zIndex:0, transition:'all 1.2s ease' }} />
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize:'48px 48px' }} />

      <div style={{ position:'relative', zIndex:1, maxWidth:860, margin:'0 auto', padding:'26px 16px 40px' }}>
        {/* HEADER */}
        <header style={{ textAlign:'center', marginBottom:30 }} className="fadeUp">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:4 }}>
            <div style={{ height:1, width:45, background:`linear-gradient(to right,transparent,${L.color})`, transition:'all .8s' }} />
            <span style={{ fontFamily:"'Space Mono', monospace", fontSize:8.5, letterSpacing:'4px', color:L.color, textTransform:'uppercase', transition:'color .5s' }}>Análise Inteligente</span>
            <div style={{ height:1, width:45, background:`linear-gradient(to left,transparent,${L.color})`, transition:'all .8s' }} />
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'clamp(28px,5vw,46px)', fontWeight:700, color:'#fff', letterSpacing:'-0.5px', lineHeight:1 }}>Loterias <em style={{ fontStyle:'italic', color:L.color, transition:'color .5s' }}>Brasil</em></h1>
          <p style={{ color:'#555', fontSize:11.5, letterSpacing:'0.3px', marginTop:5 }}>
            {loading.r ? <span style={{ animation:'pulse 1.5s infinite', display:'inline-block', color:L.color }}>⟳ Buscando...</span>
            : lastUpd ? <>Atualizado {lastUpd.toLocaleTimeString('pt-BR')} · próxima em <strong style={{ color:'#666' }}>{fmt(refreshSec)}</strong></>
            : 'Inicializando...'}
          </p>
        </header>

        {/* Botões de ação */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginBottom:10 }}>
          <button onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); saveTheme(t) }}
            style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, fontSize:10.5, background:'rgba(255,255,255,.03)', border:`1px solid rgba(255,255,255,.07)`, color:'#666', fontFamily:"'DM Sans', sans-serif", letterSpacing:'0.3px', cursor:'pointer', transition:'all .2s' }}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>{theme === 'dark' ? 'Claro' : 'Escuro'}
          </button>
          <button onClick={openCfg} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, fontSize:10.5, background: aiConfigured ? `${L.color}10` : 'rgba(255,255,255,.03)', border:`1px solid ${aiConfigured ? `${L.color}35` : 'rgba(255,255,255,.07)'}`, color: aiConfigured ? L.color : '#666', fontFamily:"'DM Sans', sans-serif", letterSpacing:'0.3px', cursor:'pointer', transition:'all .2s' }}>
            <span>{aiConfigured ? '🤖' : '⚙️'}</span>{aiConfigured ? `${AI_PROVIDERS[memory.aiProvider]?.name || 'IA'} ativa` : 'Configurar IA'}
          </button>
        </div>

        {/* LOTTERY TABS */}
        <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
          {Object.values(LOTTERIES).map(l => (
            <button key={l.id} className="lotBtn" onClick={() => { setActive(l.id); setTab('resultado') }}
              style={{ flex:'1 1 0', minWidth:115, padding:'14px 10px', borderRadius:13, background: active === l.id ? `radial-gradient(ellipse at top, ${l.darkBg} 0%, rgba(0,0,0,.6) 100%)` : 'rgba(255,255,255,.025)', border:`1.5px solid ${active === l.id ? l.color : 'rgba(255,255,255,.07)'}`, boxShadow: active === l.id ? `0 0 24px rgba(${l.glow},.18),0 4px 16px rgba(0,0,0,.4)` : 'none', textAlign:'center', transition:'all .35s ease' }}>
              <div style={{ fontSize:18, marginBottom:2 }}>{l.icon}</div>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8, letterSpacing:'1.5px', color: active === l.id ? l.color : '#444', fontWeight:700, textTransform:'uppercase' }}>{l.abbr}</div>
              <div style={{ color: active === l.id ? '#ccc' : '#555', fontSize:11, fontWeight:600 }}>{l.picks} números</div>
            </button>
          ))}
        </div>

        {/* SUB TABS */}
        <div style={{ display:'flex', gap:3, marginBottom:16, background:'rgba(255,255,255,.03)', borderRadius:11, padding:3, border:'1px solid rgba(255,255,255,.05)' }}>
          {[
            { id:'resultado', label:'Resultado', icon:'🎱' },
            { id:'frequencia', label:'Frequências', icon:'📊' },
            { id:'sugestao', label:'Sugestão + Prob.', icon:'🧠' }
          ].map(t => (
            <button key={t.id} className={`tabBtn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:'8px 5px', borderRadius:9, fontFamily:"'DM Sans', sans-serif", fontWeight: tab === t.id ? 700 : 500, fontSize:11.5, background: tab === t.id ? L.color : 'transparent', color: tab === t.id ? '#fff' : '#555', boxShadow: tab === t.id ? `0 2px 10px rgba(${L.glow},.3)` : 'none', transition:'all .25s ease', whiteSpace:'nowrap' }}>
              <span style={{ marginRight:3 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            RESULTADO
            ============================================================ */}
        {tab === 'resultado' && <div className="floatIn">
          {loading.r ? <div className="card" style={{ padding:36, textAlign:'center' }}>
            <Spinner color={L.color} />
            <p style={{ color:'#555', fontSize:12, marginTop:10 }}>Buscando último sorteio da {L.name}...</p>
            {[120,80,100].map((w,i) => <div key={i} className="shimmer-line" style={{ height:11, width:w, margin:'7px auto 0' }} />)}
          </div> : result ? <>
            <div className="card" style={{ padding:'20px 20px 24px', marginBottom:12, borderColor:L.border }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8.5, letterSpacing:'2.5px', color:L.color, textTransform:'uppercase', marginBottom:2 }}>Concurso</div>
                  <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:36, fontWeight:700, color:'#fff', lineHeight:1 }}>#{result.concurso}</div>
                  <div style={{ color:'#555', fontSize:11.5, marginTop:2 }}>📅 {result.data}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <button onClick={() => { fetchResults(); showToast('Sincronizando...') }}
                    style={{ background:`${L.color}10`, border:`1px solid ${L.color}30`, borderRadius:5, padding:'2px 8px', fontSize:9, color:L.color, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", transition:'all .2s' }}>
                    ⟳ Sincronizar
                  </button>
                {result.acumulado && result.premio > 0 && <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${L.color}15`, border:`1px solid ${L.color}35`, borderRadius:6, padding:'3px 8px', marginBottom:5 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:L.color, animation:'pulse 1.5s infinite' }} />
                    <span style={{ fontSize:8.5, color:L.color, fontWeight:700, letterSpacing:'1.5px' }}>ACUMULADO</span>
                  </div>}
                  {result.premio > 0 && <div style={{ marginBottom:4 }}><div style={{ color:'#555', fontSize:9.5 }}>Prêmio estimado</div><div style={{ color:'#ddd', fontSize:13, fontWeight:700 }}>R$ {result.premio.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>}
                  {result.dataProximo !== '—' && <div><div style={{ color:'#555', fontSize:9.5 }}>Próximo sorteio</div><div style={{ color:'#ccc', fontSize:12, fontWeight:600 }}>{result.dataProximo}</div></div>}
                </div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center' }}>
                {result.numeros.map((n,i) => <Ball key={n} number={n} gradient={L.ball} borderColor={L.ballBorder} delay={i*0.06} glowColor={L.glow} size={46} />)}
              </div>
            </div>
            <ProbCard data={prob} color={L.color} />
          </> : <div className="card" style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:26, marginBottom:6 }}>📭</div>
            <p style={{ color:'#666', fontSize:12 }}>Nenhum resultado. <button onClick={fetchResults} style={{ background:'none', border:'none', color:L.color, fontSize:12, textDecoration:'underline', cursor:'pointer' }}>Tentar novamente</button></p>
          </div>}
        </div>}

        {/* ============================================================
            FREQUÊNCIAS
            ============================================================ */}
        {tab === 'frequencia' && <div className="floatIn">
          {loading.f && !st ? <div className="card" style={{ padding:36, textAlign:'center' }}>
            <Spinner color={L.color} />
            <p style={{ color:'#555', fontSize:12, marginTop:10 }}>Buscando histórico da {L.name}...</p>
            {freqProg > 0 && <><div style={{ width:'100%', maxWidth:200, height:4, borderRadius:2, background:'rgba(255,255,255,.06)', margin:'8px auto 4px', overflow:'hidden' }}><div style={{ width:`${Math.min((freqProg/50)*100,100)}%`, height:'100%', borderRadius:2, background:`linear-gradient(90deg,${L.color},${L.color}88)`, transition:'width .4s ease' }} /></div><p style={{ color:'#666', fontSize:10.5, marginTop:2 }}>{freqProg}/50 concursos</p></>}
            {[140,90,120].map((w,i) => <div key={i} className="shimmer-line" style={{ height:11, width:w, margin:'7px auto 0' }} />)}
          </div> : st ? <>
            <div className="card" style={{ padding:20, marginBottom:12, borderColor:`${L.color}30` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, letterSpacing:'2.5px', color:L.color, textTransform:'uppercase' }}>📊 Panorama</div>
                <button onClick={() => { setFreqCache(c=>{const n={...c};delete n[active];return n}); setStats(c=>{const n={...c};delete n[active];return n}); loadStats(active) }}
                  style={{ background:`${L.color}10`, border:`1px solid ${L.color}30`, borderRadius:5, padding:'2px 8px', fontSize:9, color:L.color, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", transition:'all .2s' }}>
                  ⟳ Atualizar
                </button>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}><span style={{ color:'#777', fontSize:12 }}>Concursos</span><span style={{ color:L.color, fontSize:12, fontWeight:600, fontFamily:"'Space Mono', monospace" }}>{st.totalConcursos?.toLocaleString('pt-BR') || '—'}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}><span style={{ color:'#777', fontSize:12 }}>Pares</span><span style={{ color:L.color, fontSize:12, fontWeight:600, fontFamily:"'Space Mono', monospace" }}>{st.paridade?.pares || '—'}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0' }}><span style={{ color:'#777', fontSize:12 }}>Ímpares</span><span style={{ color:L.color, fontSize:12, fontWeight:600, fontFamily:"'Space Mono', monospace" }}>{st.paridade?.impares || '—'}</span></div>
            </div>
            <div className="card" style={{ padding:16, marginBottom:12, borderColor:`${L.color}25` }}>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8.5, letterSpacing:'2px', color:'#ff6b6b', textTransform:'uppercase', marginBottom:8 }}>🔥 Quentes (mais frequentes)</div>
              {st.quentes.length ? (() => { const maxQ = Math.max(...st.quentes.map(n => (st.freq && st.freq[n]) || 1), 1); return st.quentes.map(n => { const f = (st.freq && st.freq[n]) || 0; const pct = st.totalConcursos > 0 ? ((f/st.totalConcursos)*100).toFixed(1) : 0; return <div key={n} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <span style={{ width:22, fontSize:10, fontFamily:"'Space Mono', monospace", color:'#ccc', fontWeight:700, textAlign:'right' }}>{String(n).padStart(2,'0')}</span>
                <div style={{ flex:1, height:12, borderRadius:6, background:'rgba(255,255,255,.05)', overflow:'hidden' }}>
                  <div style={{ width:`${(f/maxQ)*100}%`, height:'100%', borderRadius:6, background:'linear-gradient(90deg,#ff6b6b,#ff4444)', transition:'width .6s ease' }} />
                </div>
                <span style={{ fontSize:9, color:'#888', fontFamily:"'Space Mono', monospace", minWidth:50, textAlign:'right' }}>{f}x ({pct}%)</span>
              </div> }) })() : <span style={{ color:'#555', fontSize:11 }}>Sem dados</span>}
            </div>
            <div className="card" style={{ padding:16, marginBottom:12, borderColor:`${L.color}25` }}>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8.5, letterSpacing:'2px', color:'#5f9eff', textTransform:'uppercase', marginBottom:8 }}>🧊 Frios (menos frequentes)</div>
              {st.frios.length ? (() => { const maxF = Math.max(...st.frios.map(n => (st.freq && st.freq[n]) || 1), 1); return st.frios.map(n => { const f = (st.freq && st.freq[n]) || 0; const pct = st.totalConcursos > 0 ? ((f/st.totalConcursos)*100).toFixed(1) : 0; return <div key={n} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <span style={{ width:22, fontSize:10, fontFamily:"'Space Mono', monospace", color:'#ccc', fontWeight:700, textAlign:'right' }}>{String(n).padStart(2,'0')}</span>
                <div style={{ flex:1, height:12, borderRadius:6, background:'rgba(255,255,255,.05)', overflow:'hidden' }}>
                  <div style={{ width:`${(f/maxF)*100}%`, height:'100%', borderRadius:6, background:'linear-gradient(90deg,#5f9eff,#3a7bd5)', transition:'width .6s ease' }} />
                </div>
                <span style={{ fontSize:9, color:'#888', fontFamily:"'Space Mono', monospace", minWidth:50, textAlign:'right' }}>{f}x ({pct}%)</span>
              </div> }) })() : <span style={{ color:'#555', fontSize:11 }}>Sem dados</span>}
            </div>
            <div className="card" style={{ padding:16, borderColor:`${L.color}25` }}>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8.5, letterSpacing:'2px', color:'#ffd93d', textTransform:'uppercase', marginBottom:8 }}>⏳ Atrasados (mais tempo sem sair)</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {st.atrasados.map(n => <span key={n} style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(145deg,#ffd93d 0%,#8b7a1a 100%)', border:'1px solid #ffee88', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Mono', monospace", fontSize:10, fontWeight:700, color:'#000' }}>{String(n).padStart(2,'0')}</span>)}
                {!st.atrasados.length && <span style={{ color:'#555', fontSize:11 }}>—</span>}
              </div>
            </div>
          </> : <div className="card" style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:26, marginBottom:6 }}>📊</div>
            <p style={{ color:'#666', fontSize:12 }}>{freqProg > 0 ? `Carregando... (${freqProg})` : 'Iniciando...'}</p>
          </div>}
        </div>}

        {/* ============================================================
            SUGESTÃO + PROBABILIDADES
            ============================================================ */}
        {tab === 'sugestao' && <div className="floatIn">
          <ProbCard data={prob} color={L.color} />

          {sugHistory.length > 0 && <div className="card" style={{ padding:14, marginBottom:12, borderColor:`${L.color}20` }}>
            <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8.5, letterSpacing:'2px', color:'#888', textTransform:'uppercase', marginBottom:10 }}>🧠 Memória</div>
            {sugHistory.slice(0,5).map(s => <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:7, background:'rgba(255,255,255,.02)', marginBottom:5, fontSize:11 }}>
              <div style={{ display:'flex', gap:2, flexWrap:'wrap', flex:1 }}>
                {(s.numbers || []).map(n => <span key={n} style={{ width:22, height:22, borderRadius:'50%', background:L.ball, border:`1px solid ${L.ballBorder}`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Mono', monospace", fontSize:8, fontWeight:700, color:'#fff' }}>{String(n).padStart(2,'0')}</span>)}
              </div>
              <div style={{ display:'flex', gap:1 }}>{[1,2,3,4,5].map(st => <button key={st} className={`rating-btn ${s.rating >= st ? 'on' : ''}`} onClick={() => rateSug(s.id, st)} style={{ fontSize:12 }}>★</button>)}</div>
            </div>)}
          </div>}

          {loading.s ? <div className="card" style={{ padding:32, textAlign:'center' }}>
            <Spinner color={L.color} />
            <p style={{ color:'#555', fontSize:12, marginTop:10 }}>Gerando sugestão...</p>
            {[160,120,140].map((w,i) => <div key={i} className="shimmer-line" style={{ height:11, width:w, margin:'7px auto 0' }} />)}
          </div> : sug ? <div className="card" style={{ padding:22, marginBottom:12, borderColor:L.border }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:6 }}>
              <div>
                <div style={{ fontFamily:"'Space Mono', monospace", fontSize:8.5, letterSpacing:'2.5px', color:L.color, textTransform:'uppercase' }}>✨ Sugestão</div>
                <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:18, fontWeight:600, color:'#fff', marginTop:1 }}>{sug.estrategia}</div>
              </div>
              <span style={{ padding:'2px 10px', borderRadius:20, background:`${sug.confianca === 'Alta' ? L.color : sug.confianca === 'Média' ? '#ffd93d' : '#ff6b6b'}18`, border:`1px solid ${sug.confianca === 'Alta' ? L.color : sug.confianca === 'Média' ? '#ffd93d' : '#ff6b6b'}40`, fontSize:10, color: sug.confianca === 'Alta' ? L.color : sug.confianca === 'Média' ? '#ffd93d' : '#ff6b6b', fontWeight:700, letterSpacing:'0.5px' }}>{sug.confianca}</span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:18 }}>
              {(sug.numeros || []).map((n,i) => {
                const fd = sug.freqSug?.find(f => f.num === n)
                return <div key={n} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <Ball number={n} gradient={L.ball} borderColor={L.ballBorder} delay={i*0.05} glowColor={L.glow} size={48} />
                  {fd && <span style={{ fontSize:9, color:'#888', fontFamily:"'Space Mono', monospace" }}>{fd.freq}x ({fd.pct})</span>}
                </div>
              })}
            </div>
            <div className="card" style={{ padding:14, background:`${L.color}06`, borderColor:`${L.color}20`, marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#999', marginBottom:2 }}>{sug.parImpar}</div>
              <div style={{ fontSize:11, color:'#999', marginBottom:2 }}>{sug.dezenas}</div>
              {sug.analise && <div style={{ fontSize:11, color:'#bbb', lineHeight:1.5, marginTop:3 }}>{sug.analise}</div>}
            </div>
            {sug && <div style={{ textAlign:'center', marginBottom:10 }}>
              <button onClick={() => { navigator.clipboard.writeText(`🎱 ${L.name}\n${(sug.numeros||[]).join(' - ')}\n📊 ${sug.estrategia}`).then(() => setCopied(true)).catch(()=>{}); setTimeout(()=>setCopied(false),2000) }}
                style={{ background: copied ? `${L.color}20` : 'none', border:`1px solid ${L.color}40`, borderRadius:6, padding:'4px 14px', fontSize:10, color: copied ? L.color : L.color, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", transition:'all .2s' }}>
                {copied ? '✓ Copiado!' : '📋 Copiar números'}
              </button>
            </div>}
            <div style={{ display:'flex', gap:2, justifyContent:'center', marginBottom:12 }}>
              {[1,2,3,4,5].map(st => <button key={st} className={`rating-btn ${currentRating >= st ? 'on' : ''}`} onClick={() => rateSug(sug.id, st)}>★</button>)}
            </div>
            <button className="primaryBtn" onClick={generateSug} disabled={loading.s} style={{ width:'100%', padding:'12px', borderRadius:10, background:`linear-gradient(135deg,${L.color} 0%,${L.color}cc 100%)`, color:'#000', fontSize:12.5, letterSpacing:'0.3px' }}>
              {loading.s ? '⟳ Gerando...' : '🎲 Nova Sugestão'}
            </button>
          </div> : <div className="card" style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:26, marginBottom:6 }}>🧠</div>
            <p style={{ color:'#666', fontSize:12, marginBottom:12 }}>Gere uma sugestão baseada em dados reais{aiConfigured ? ' com IA ✨' : ' — estatística embutida'}</p>
            <button className="primaryBtn" onClick={generateSug} disabled={loading.s} style={{ padding:'10px 28px', borderRadius:9, background:L.color, color:'#000', fontSize:12 }}>
              {loading.s ? '⟳ Gerando...' : '🎲 Gerar Sugestão'}
            </button>
          </div>}

          {error && <div style={{ padding:'10px 14px', borderRadius:8, background:'#ff6b6b10', border:'1px solid #ff6b6b30', color:'#ff6b6b', fontSize:11, marginTop:8 }}>{error}</div>}
        </div>}

        {/* FOOTER */}
        <footer style={{ textAlign:'center', marginTop:36, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.04)', fontSize:10.5, color:'#444' }}>
          Dados oficiais via <strong style={{ color:'#666' }}>Caixa Econômica Federal</strong> · {aiConfigured ? `IA: ${AI_PROVIDERS[memory.aiProvider]?.name}` : 'Estatística embutida'}
          <br />Mega-Sena: C(60,6) · Lotofácil: C(25,15) · Lotomania: C(100,20)
        </footer>
      </div>
    </div>
    </ErrorBoundary>
  )
}
