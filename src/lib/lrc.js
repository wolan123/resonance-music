const LINE_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g

export function parseLrc(text) {
  if (!text) return []
  const lines = []
  for (const raw of String(text).split(/\r?\n/)) {
    const matches = [...raw.matchAll(LINE_RE)]
    if (!matches.length) continue
    const content = raw.replace(LINE_RE, '').trim()
    for (const m of matches) {
      const min = Number(m[1])
      const sec = Number(m[2])
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) / 1000 : 0
      lines.push({ time: min * 60 + sec + frac, text: content })
    }
  }
  return lines.sort((a, b) => a.time - b.time)
}

export function activeLineIndex(lines, t) {
  let idx = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].time <= t) idx = i
    else break
  }
  return idx
}

export function hasTimestamps(text) {
  return parseLrc(text).length > 0
}
