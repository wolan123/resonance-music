function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i += 1) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  }
  return h
}

const ART_PALETTE = [
  ['#4c1d95', '#06b6d4'],
  ['#7c3aed', '#f472b6'],
  ['#1e40af', '#22d3ee'],
  ['#831843', '#8b5cf6'],
  ['#0e7490', '#a78bfa'],
]

export function fallbackArtwork(seed = 'music', size = 300) {
  const [from, to] = ART_PALETTE[hashString(seed) % ART_PALETTE.length]
  const letter = ((seed || '♪').trim()[0] || '♪').toUpperCase()
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="${size}" height="${size}" fill="url(#g)"/>` +
    `<text x="50%" y="54%" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.42)}" font-weight="700" fill="rgba(255,255,255,0.9)" text-anchor="middle" dominant-baseline="middle">${letter}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function artworkOf(track) {
  return track?.artworkUrl || track?.artwork || fallbackArtwork(track?.artist || track?.title || 'music')
}

export async function fetchSongs() {
  const res = await fetch('/api/tracks', { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error('歌曲列表加载失败')
  const data = await res.json()
  return Array.isArray(data.songs) ? data.songs : []
}

export async function registerSong(payload) {
  const res = await fetch('/api/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '歌曲登记失败')
  return data.song
}

export async function deleteSong(id) {
  const res = await fetch('/api/tracks', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '删除失败')
  return true
}

async function authRequest(action, payload = {}) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '操作失败')
  return data
}

export const registerUser = (username, password) => authRequest('register', { username, password })
export const loginUser = (username, password) => authRequest('login', { username, password })
export const logoutUser = () => authRequest('logout')
export const fetchMe = () => authRequest('me')

export async function autoMatchLyrics(id) {
  const res = await fetch('/api/lyrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '歌词匹配失败')
  return data
}

export async function fetchPlaylists() {
  const res = await fetch('/api/playlists', { signal: AbortSignal.timeout(15000) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '歌单加载失败')
  return Array.isArray(data.playlists) ? data.playlists : []
}

async function playlistRequest(action, payload = {}) {
  const res = await fetch('/api/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '操作失败')
  return data.playlist || data
}

export const createPlaylist = (name, description) => playlistRequest('create', { name, description })
export const addToPlaylist = (id, trackId) => playlistRequest('add', { id, trackId })
export const removeFromPlaylist = (id, trackId) => playlistRequest('remove', { id, trackId })

export async function deletePlaylist(id) {
  const res = await fetch('/api/playlists', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '删除失败')
  return true
}

export async function reportPlay(id) {
  const res = await fetch('/api/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) return
  const data = await res.json().catch(() => ({}))
  return data.playCount
}
