const ITUNES_SEARCH = 'https://itunes.apple.com/search'

function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i += 1) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  }
  return h
}

const ART_PALETTE = [
  ['#e5484d', '#ffc53d'],
  ['#f56f74', '#ffd977'],
  ['#b22e33', '#f5a623'],
  ['#ff9c9f', '#ffe9b8'],
  ['#8f2428', '#ffc53d'],
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
    `<text x="50%" y="54%" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.42)}" font-weight="700" fill="rgba(255,255,255,0.94)" text-anchor="middle" dominant-baseline="middle">${letter}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function artworkOf(track) {
  return track?.artworkUrl || track?.artwork || fallbackArtwork(track?.artist || track?.title || 'music')
}

function itunesToTrack(item) {
  const art = (item.artworkUrl100 || '').replace('100x100bb', '300x300bb')
  return {
    id: `it-${item.trackId}`,
    source: 'online',
    title: item.trackName || '未知曲目',
    artist: item.artistName || '未知歌手',
    album: item.collectionName || '',
    artwork: art || fallbackArtwork(item.artistName || item.trackName),
    preview: item.previewUrl,
    durationMs: item.trackTimeMillis || 0,
    genre: item.primaryGenreName || '',
  }
}

function dedupe(tracks) {
  const seen = new Set()
  return tracks.filter((t) => {
    const key = `${t.title}|${t.artist}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function searchTracks(query) {
  const term = query.trim()
  if (!term) throw new Error('请输入搜索关键词')

  async function itunesSearch(country) {
    const url = new URL(ITUNES_SEARCH)
    url.searchParams.set('term', term)
    url.searchParams.set('media', 'music')
    url.searchParams.set('entity', 'song')
    url.searchParams.set('limit', '30')
    if (country) url.searchParams.set('country', country)
    const json = await fetchJson(url)
    return dedupe((json.results || []).map(itunesToTrack).filter((t) => t.preview))
  }

  let lastError
  try {
    const tracks = await itunesSearch()
    if (tracks.length) return tracks
    const cnTracks = await itunesSearch('CN')
    if (cnTracks.length) return cnTracks
  } catch (e) {
    lastError = e
  }
  throw new Error(lastError ? '搜索服务暂时不可用，请稍后重试' : '没有找到相关音乐，换个关键词试试')
}
