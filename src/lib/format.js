export function formatMs(ms) {
  const total = Math.round((ms || 0) / 1000)
  if (total <= 0) return '--:--'
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatSeconds(sec) {
  const total = Math.max(0, Math.round(sec || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
