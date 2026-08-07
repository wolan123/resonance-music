const VOLUME_KEY = 'lumen.volume.v1'

export function loadVolume() {
  const v = parseFloat(localStorage.getItem(VOLUME_KEY) || '')
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8
}

export function saveVolume(v) {
  try {
    localStorage.setItem(VOLUME_KEY, String(v))
  } catch {
    /* storage unavailable */
  }
}
