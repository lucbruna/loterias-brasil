export default function comb(n, k) {
  if (k > n) return 0
  if (k === 0 || k === n) return 1
  k = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i
  return r
}
