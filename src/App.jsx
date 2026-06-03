import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import ConfigModal from './components/ConfigModal'
import ResultTab from './components/ResultTab'
import FreqTab from './components/FreqTab'
import SugTab from './components/SugTab'

import { LOTTERIES, PROBS, LOTTERY_IDS } from './utils/lotteries'
import { fetchCaixa, fetchHistoryStats } from './utils/api'
import { computeStats } from './utils/stats'
import { builtinSug } from './utils/suggestions'
import { genWithAI, AI_PROVIDERS } from './utils/ai'
import { loadMemory, saveMemory, loadTheme, saveTheme } from './utils/cache'
import './global.css'

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
  const loadingLotteries = useRef({})
  const timerRef = useRef(null)
  const countRef = useRef(null)
  const toastTimer = useRef(null)
  const abortRef = useRef(null)

  const L = LOTTERIES[active] || LOTTERIES.megasena
  const result = results[active]
  const st = stats[active]
  const sug = sugs[active]
  const prob = PROBS[active] || []
  const sugHistory = useMemo(
    () => memory.suggestions.filter(s => s.lottery === active),
    [memory.suggestions, active]
  )
  const aiConfigured = !!(memory.aiProvider && (memory.aiProvider === 'gemini' ? memory.geminiKey : memory.qwenKey))
  const sugId = sug?.id
  const currentRating = useMemo(
    () => memory.suggestions.find(s => s.id === sugId)?.rating || 0,
    [memory.suggestions, sugId]
  )

  const showToast = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  const fmt = useCallback((s) => {
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }, [])

  const fetchResults = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    setLoading(r => ({ ...r, r: true }))
    const out = {}
    await Promise.allSettled(LOTTERY_IDS.map(async (key) => {
      if (signal.aborted) return
      try { out[key] = await fetchCaixa(LOTTERIES[key].apiName, AbortSignal.timeout(5000)) }
      catch (e) { if (e.name !== 'AbortError') console.error(`${LOTTERIES[key].name}:`, e.message) }
    }))
    if (!signal.aborted && Object.keys(out).length > 0) { setResults(out); setLastUpd(new Date()) }
    if (!signal.aborted) { setLoading(r => ({ ...r, r: false })); setRefreshSec(1800) }
  }, [])

  const loadStats = useCallback(async (id) => {
    if (loadingLotteries.current[id]) return
    loadingLotteries.current[id] = true
    const l = LOTTERIES[id]
    setLoading(r => ({ ...r, f: true }))
    setFreqProg(0)
    try {
      const fd = await fetchHistoryStats(id, l.apiName, 200, (n) => setFreqProg(n))
      setFreqCache(c => ({ ...c, [id]: fd }))
      setStats(c => ({ ...c, [id]: computeStats(fd, l.maxNum) }))
      setFreqProg(fd.totalContests)
    } catch (e) { console.error(`Stats ${l.name}:`, e.message) }
    setLoading(r => ({ ...r, f: false }))
    loadingLotteries.current[id] = false
  }, [])

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
      const lastDraw = results[active]?.numeros || null
      let sugData = null
      if (mem.aiProvider && (mem.geminiKey || mem.qwenKey)) sugData = await genWithAI(mem, stLocal, L, active, lastDraw)
      if (!sugData) sugData = builtinSug(stLocal, L.maxNum, L.picks, lastDraw)
      const entry = {
        id: Date.now(), date: new Date().toISOString(), lottery: active,
        numbers: sugData.numeros, estrategia: sugData.estrategia,
        analise: sugData.analise, rating: null
      }
      mem.suggestions.unshift(entry)
      if (mem.suggestions.length > 50) mem.suggestions.length = 50
      saveMemory(mem)
      setMemory(mem)
      setSugs(p => ({ ...p, [active]: { ...sugData, id: entry.id } }))
    } catch (e) { setError(e.message || 'Erro') }
    setLoading(r => ({ ...r, s: false }))
  }, [active, L, stats, freqCache, results])

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const signal = ctrl.signal
    ;(async () => {
      setLoading(r => ({ ...r, r: true }))
      const out = {}
      await Promise.allSettled(LOTTERY_IDS.map(async (key) => {
        if (signal.aborted) return
        try { out[key] = await fetchCaixa(LOTTERIES[key].apiName, AbortSignal.timeout(5000)) }
        catch (e) { if (e.name !== 'AbortError') console.error(`${LOTTERIES[key].name}:`, e.message) }
      }))
      if (!signal.aborted && Object.keys(out).length > 0) { setResults(out); setLastUpd(new Date()) }
      if (!signal.aborted) setLoading(r => ({ ...r, r: false }))
    })()
    timerRef.current = setInterval(async () => {
      await fetchResults()
    }, 30 * 60 * 1000)
    countRef.current = setInterval(() => setRefreshSec(n => n > 0 ? n - 1 : 1800), 1000)
    return () => { ctrl.abort(); clearInterval(timerRef.current); clearInterval(countRef.current) }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (tab === 'frequencia' || tab === 'sugestao') {
      if (!freqCache[active] && !loadingLotteries.current[active]) loadStats(active)
      else if (freqCache[active] && !stats[active]) {
        setStats(c => ({ ...c, [active]: computeStats(freqCache[active], L.maxNum) }))
      }
    }
  }, [tab, active, loadStats, freqCache, stats, L.maxNum])

  const openCfg = useCallback(() => {
    setCfgProvider(memory.aiProvider || 'gemini')
    setCfgKey(memory.aiProvider === 'gemini' ? memory.geminiKey : memory.qwenKey || '')
    setShowCfg(true)
  }, [memory.aiProvider, memory.geminiKey, memory.qwenKey])

  const closeCfg = useCallback(() => setShowCfg(false), [])

  const saveCfg = useCallback(() => {
    const m = loadMemory()
    m.aiProvider = cfgProvider
    if (cfgProvider === 'gemini') m.geminiKey = cfgKey
    else if (cfgProvider === 'qwen') m.qwenKey = cfgKey
    saveMemory(m)
    setMemory(m)
    setShowCfg(false)
    showToast(cfgKey ? `${AI_PROVIDERS[cfgProvider].name} configurada!` : 'IA removida.')
  }, [cfgProvider, cfgKey, showToast])

  const rateSug = useCallback((id, stars) => {
    const m = loadMemory()
    const f = m.suggestions.find(s => s.id === id)
    if (f) { f.rating = stars; saveMemory(m); setMemory(m) }
    showToast(`${stars} ★`)
  }, [showToast])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(
      `🎱 ${L.name}\n${(sug?.numeros || []).join(' - ')}\n📊 ${sug?.estrategia || ''}`
    ).then(() => setCopied(true)).catch(() => {})
    setTimeout(() => setCopied(false), 2000)
  }, [L.name, sug?.numeros, sug?.estrategia])

  const toggleTheme = useCallback(() => {
    const t = theme === 'dark' ? 'light' : 'dark'
    setTheme(t)
    saveTheme(t)
  }, [theme])

  const syncResults = useCallback(() => {
    fetchResults()
    showToast('Sincronizando...')
  }, [fetchResults, showToast])

  const refreshStats = useCallback(() => {
    setFreqCache(c => { const n = { ...c }; delete n[active]; return n })
    setStats(c => { const n = { ...c }; delete n[active]; return n })
    loadStats(active)
  }, [active, loadStats])

  const handleSetActive = useCallback((id) => {
    setActive(id)
    setTab('resultado')
  }, [])

  return (
    <ErrorBoundary>
      <div data-theme={theme} style={{
        minHeight: '100vh', background: 'var(--bg,#07090f)',
        color: 'var(--fg,#e0e0ec)', fontFamily: "'DM Sans', sans-serif",
        position: 'relative', overflowX: 'hidden'
      }}>
        {toast && (
          <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            background: `${L.color}20`, border: `1px solid ${L.color}50`,
            borderRadius: 10, padding: '10px 22px', zIndex: 1000, fontSize: 12,
            color: '#fff', backdropFilter: 'blur(16px)',
            animation: 'slideDown .25s ease both', whiteSpace: 'nowrap'
          }}>
            {toast}
          </div>
        )}

        <ConfigModal
          show={showCfg}
          onClose={closeCfg}
          provider={cfgProvider}
          onProviderChange={setCfgProvider}
          apiKey={cfgKey}
          onKeyChange={setCfgKey}
          onSave={saveCfg}
          color={L.color}
        />

        <div style={{
          position: 'fixed', top: -300, right: -200, width: 700, height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle,rgba(${L.glow},.08) 0%,transparent 65%)`,
          pointerEvents: 'none', zIndex: 0, transition: 'all 1.2s ease'
        }} />
        <div style={{
          position: 'fixed', bottom: -200, left: -200, width: 500, height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle,rgba(${L.glow},.05) 0%,transparent 65%)`,
          pointerEvents: 'none', zIndex: 0, transition: 'all 1.2s ease'
        }} />
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)',
          backgroundSize: '48px 48px'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '26px 16px 40px' }}>
          <header style={{ textAlign: 'center', marginBottom: 30 }} className="fadeUp">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{ height: 1, width: 45, background: `linear-gradient(to right,transparent,${L.color})`, transition: 'all .8s' }} />
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 8.5,
                letterSpacing: '4px', color: L.color, textTransform: 'uppercase', transition: 'color .5s'
              }}>
                Análise Inteligente
              </span>
              <div style={{ height: 1, width: 45, background: `linear-gradient(to left,transparent,${L.color})`, transition: 'all .8s' }} />
            </div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px,5vw,46px)',
              fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1
            }}>
              Loterias <em style={{ fontStyle: 'italic', color: L.color, transition: 'color .5s' }}>Brasil</em>
            </h1>
            <p style={{ color: '#555', fontSize: 11.5, letterSpacing: '0.3px', marginTop: 5 }}>
              {loading.r
                ? <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', color: L.color }}>⟳ Buscando...</span>
                : lastUpd
                  ? <>Atualizado {lastUpd.toLocaleTimeString('pt-BR')} · próxima em <strong style={{ color: '#666' }}>{fmt(refreshSec)}</strong></>
                  : 'Inicializando...'
              }
            </p>
          </header>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
            <button onClick={toggleTheme} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7, fontSize: 10.5,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
              color: '#666', fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.3px', cursor: 'pointer', transition: 'all .2s'
            }}>
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>{theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
            <button onClick={openCfg} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, fontSize: 10.5,
              background: aiConfigured ? `${L.color}10` : 'rgba(255,255,255,.03)',
              border: `1px solid ${aiConfigured ? `${L.color}35` : 'rgba(255,255,255,.07)'}`,
              color: aiConfigured ? L.color : '#666',
              fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.3px',
              cursor: 'pointer', transition: 'all .2s'
            }}>
              <span>{aiConfigured ? '🤖' : '⚙️'}</span>
              {aiConfigured ? `${AI_PROVIDERS[memory.aiProvider]?.name || 'IA'} ativa` : 'Configurar IA'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {Object.values(LOTTERIES).map(l => (
              <button
                key={l.id}
                className="lotBtn"
                onClick={() => handleSetActive(l.id)}
                style={{
                  flex: '1 1 0', minWidth: 115, padding: '14px 10px', borderRadius: 13,
                  background: active === l.id
                    ? `radial-gradient(ellipse at top, ${l.darkBg} 0%, rgba(0,0,0,.6) 100%)`
                    : 'rgba(255,255,255,.025)',
                  border: `1.5px solid ${active === l.id ? l.color : 'rgba(255,255,255,.07)'}`,
                  boxShadow: active === l.id
                    ? `0 0 24px rgba(${l.glow},.18),0 4px 16px rgba(0,0,0,.4)`
                    : 'none',
                  textAlign: 'center', transition: 'all .35s ease'
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 2 }}>{l.icon}</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 8,
                  letterSpacing: '1.5px', color: active === l.id ? l.color : '#444',
                  fontWeight: 700, textTransform: 'uppercase'
                }}>
                  {l.abbr}
                </div>
                <div style={{ color: active === l.id ? '#ccc' : '#555', fontSize: 11, fontWeight: 600 }}>
                  {l.picks} números
                </div>
              </button>
            ))}
          </div>

          <div style={{
            display: 'flex', gap: 3, marginBottom: 16,
            background: 'rgba(255,255,255,.03)', borderRadius: 11, padding: 3,
            border: '1px solid rgba(255,255,255,.05)'
          }}>
            {[
              { id: 'resultado', label: 'Resultado', icon: '🎱' },
              { id: 'frequencia', label: 'Frequências', icon: '📊' },
              { id: 'sugestao', label: 'Sugestão + Prob.', icon: '🧠' }
            ].map(t => (
              <button
                key={t.id}
                className={`tabBtn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '8px 5px', borderRadius: 9,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: tab === t.id ? 700 : 500, fontSize: 11.5,
                  background: tab === t.id ? L.color : 'transparent',
                  color: tab === t.id ? '#fff' : '#555',
                  boxShadow: tab === t.id ? `0 2px 10px rgba(${L.glow},.3)` : 'none',
                  transition: 'all .25s ease', whiteSpace: 'nowrap'
                }}
              >
                <span style={{ marginRight: 3 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {tab === 'resultado' && (
            <ResultTab loading={loading.r} result={result} L={L} prob={prob} onSync={syncResults} />
          )}
          {tab === 'frequencia' && (
            <FreqTab loading={loading.f} st={st} L={L} onRefresh={refreshStats} />
          )}
          {tab === 'sugestao' && (
            <SugTab
              prob={prob} L={L} sugHistory={sugHistory}
              loading={loading.s} sug={sug} currentRating={currentRating}
              copied={copied} onGenerate={generateSug} onCopy={handleCopy}
              onRate={rateSug} aiConfigured={aiConfigured} error={error}
            />
          )}

          <footer style={{
            textAlign: 'center', marginTop: 36, paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,.04)', fontSize: 10.5, color: '#444'
          }}>
            Dados oficiais via <strong style={{ color: '#666' }}>Caixa Econômica Federal</strong>
            {' · '}{aiConfigured ? `IA: ${AI_PROVIDERS[memory.aiProvider]?.name}` : 'Estatística embutida'}
            <br />Mega-Sena: C(60,6) · Lotofácil: C(25,15) · Lotomania: C(100,20) · Quina: C(80,5) · Timemania: C(80,7)
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  )
}
