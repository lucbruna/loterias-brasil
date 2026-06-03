const CACHE_PREFIX = '@loteria-brasil/freq-'
const MEM_KEY = '@loteria-brasil/memory'
const THEME_KEY = '@loteria-brasil/theme'

export function loadFreqCache(id) {
  try {
    const r = localStorage.getItem(CACHE_PREFIX + id)
    if (r) return JSON.parse(r)
  } catch {}
  return null
}

export function saveFreqCache(id, d) {
  try {
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ ...d, cachedAt: Date.now() }))
  } catch {}
}

export function loadMemory() {
  try {
    const r = localStorage.getItem(MEM_KEY)
    if (r) {
      const p = JSON.parse(r)
      if (p?.suggestions?.length) p.suggestions = p.suggestions.filter(s => s && Array.isArray(s.numbers))
      const envGem = import.meta.env?.VITE_GEMINI_API_KEY
      const envQwen = import.meta.env?.VITE_QWEN_API_KEY
      if (!p.geminiKey && envGem) p.geminiKey = envGem
      if (!p.qwenKey && envQwen) p.qwenKey = envQwen
      if (!p.aiProvider && (p.geminiKey || p.qwenKey)) p.aiProvider = p.geminiKey ? 'gemini' : 'qwen'
      return p
    }
  } catch {}
  const envGem = import.meta.env?.VITE_GEMINI_API_KEY || ''
  const envQwen = import.meta.env?.VITE_QWEN_API_KEY || ''
  const prov = envGem ? 'gemini' : envQwen ? 'qwen' : ''
  return { suggestions: [], geminiKey: envGem, qwenKey: envQwen, aiProvider: prov }
}

export function saveMemory(m) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(m)) } catch {}
}

export function loadTheme() {
  try {
    const r = localStorage.getItem(THEME_KEY)
    if (r === 'light' || r === 'dark') return r
  } catch {}
  return 'dark'
}

export function saveTheme(t) {
  try { localStorage.setItem(THEME_KEY, t) } catch {}
}
