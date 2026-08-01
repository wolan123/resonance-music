const FAVORITES_KEY = 'lumen.favorites.v3'
const VOLUME_KEY = 'lumen.volume.v1'

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveFavorites(list) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
}

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
