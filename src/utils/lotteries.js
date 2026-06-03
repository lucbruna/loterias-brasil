import comb from './comb'

export const PROBS = {
  megasena: [
    { label: 'Sena (6)', chance: `1 em ${comb(60, 6).toLocaleString('pt-BR')}` },
    { label: 'Quina (5)', chance: `1 em ${Math.round(comb(60, 6) / (comb(6, 5) * comb(54, 1))).toLocaleString('pt-BR')}` },
    { label: 'Quadra (4)', chance: `1 em ${Math.round(comb(60, 6) / (comb(6, 4) * comb(54, 2))).toLocaleString('pt-BR')}` }
  ],
  lotofacil: [
    { label: '15 pontos', chance: `1 em ${comb(25, 15).toLocaleString('pt-BR')}` },
    { label: '14 pontos', chance: `1 em ${Math.round(comb(25, 15) / (comb(15, 14) * comb(10, 1))).toLocaleString('pt-BR')}` },
    { label: '13 pontos', chance: `1 em ${Math.round(comb(25, 15) / (comb(15, 13) * comb(10, 2))).toLocaleString('pt-BR')}` },
    { label: '12 pontos', chance: `1 em ${Math.round(comb(25, 15) / (comb(15, 12) * comb(10, 3))).toLocaleString('pt-BR')}` },
    { label: '11 pontos', chance: `1 em ${Math.round(comb(25, 15) / (comb(15, 11) * comb(10, 4))).toLocaleString('pt-BR')}` }
  ],
  lotomania: [
    { label: '20 pontos', chance: `1 em ${comb(100, 20).toExponential(4).replace('+', '')}` },
    { label: '19 pontos', chance: `1 em ${Math.round(comb(100, 20) / (comb(20, 19) * comb(80, 1))).toExponential(3).replace('+', '')}` },
    { label: '18 pontos', chance: `1 em ${Math.round(comb(100, 20) / (comb(20, 18) * comb(80, 2))).toExponential(2).replace('+', '')}` },
    { label: '17 pontos', chance: `1 em ${Math.round(comb(100, 20) / (comb(20, 17) * comb(80, 3))).toExponential(1).replace('+', '')}` },
    { label: '16 pontos', chance: `1 em ${Math.round(comb(100, 20) / (comb(20, 16) * comb(80, 4))).toExponential(0)}` },
    { label: '15 pontos', chance: `1 em ${Math.round(comb(100, 20) / (comb(20, 15) * comb(80, 5))).toExponential(0)}` },
    { label: '0 pontos', chance: `1 em ${Math.round(comb(100, 20) / comb(80, 20)).toExponential(0)}` }
  ]
}

export const LOTTERIES = {
  megasena: { id: 'megasena', name: 'Mega-Sena', abbr: 'MEGA-SENA', apiName: 'megasena', maxNum: 60, picks: 6, color: '#00d468', darkBg: '#001a0e', glow: '0,212,104', border: 'rgba(0,212,104,0.35)', ball: 'linear-gradient(145deg,#00d468 0%,#005c2e 100%)', ballBorder: '#00ff88', icon: '\uD83C\uDFB1' },
  lotofacil: { id: 'lotofacil', name: 'Lotofácil', abbr: 'LOTOFÁCIL', apiName: 'lotofacil', maxNum: 25, picks: 15, color: '#d966ff', darkBg: '#1a0020', glow: '217,102,255', border: 'rgba(217,102,255,0.35)', ball: 'linear-gradient(145deg,#d966ff 0%,#5c0080 100%)', ballBorder: '#ee88ff', icon: '\uD83D\uDC9C' },
  lotomania: { id: 'lotomania', name: 'Lotomania', abbr: 'LOTOMANIA', apiName: 'lotomania', maxNum: 100, picks: 20, color: '#ff9500', darkBg: '#1a0d00', glow: '255,149,0', border: 'rgba(255,149,0,0.35)', ball: 'linear-gradient(145deg,#ff9500 0%,#7a3c00 100%)', ballBorder: '#ffbb44', icon: '\uD83D\uDFE0' }
}

export const CAIXA_PROXY = '/api/caixa'

export const LOTTERY_IDS = Object.keys(LOTTERIES)
