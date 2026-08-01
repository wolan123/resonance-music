const ITUNES_SEARCH = 'https://itunes.apple.com/search'
const ITUNES_TOP = 'https://itunes.apple.com/rss/topsongs/limit=30/json'

function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i += 1) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  }
  return h
}

const ART_PALETTE = [
  ['#8a4f36', '#d06d47'],
  ['#4f5d3a', '#788c5d'],
  ['#3f5568', '#6a9bcc'],
  ['#5d4a66', '#9b7bb5'],
  ['#6b5b3a', '#b89a58'],
  ['#3a5f56', '#5d9b8c'],
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
    `<text x="50%" y="54%" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.42)}" font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="middle">${letter}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function itunesToTrack(item) {
  const art = (item.artworkUrl100 || '').replace('100x100bb', '300x300bb')
  return {
    id: `it-${item.trackId}`,
    provider: 'itunes',
    title: item.trackName || '未知曲目',
    artist: item.artistName || '未知歌手',
    album: item.collectionName || '',
    artwork: art || fallbackArtwork(item.artistName || item.trackName),
    preview: item.previewUrl,
    durationMs: item.trackTimeMillis || 0,
    genre: item.primaryGenreName || '',
  }
}

function rssEntryToTrack(entry) {
  const id = entry?.id?.attributes?.['im:id'] || hashString(entry?.['im:name']?.label || '')
  const images = entry?.['im:image'] || []
  const art = (images[images.length - 1]?.label || '').replace('170x170bb', '300x300bb')
  const preview = (entry?.link || []).find((l) => l?.attributes?.rel === 'enclosure')?.attributes?.href
  const title = entry?.['im:name']?.label
  const artist = entry?.['im:artist']?.label
  return {
    id: `rss-${id}`,
    provider: 'itunes',
    title: title || '未知曲目',
    artist: artist || '未知歌手',
    album: entry?.['im:collection']?.label || '',
    artwork: art || fallbackArtwork(artist || title),
    preview,
    durationMs: 0,
    genre: entry?.category?.attributes?.label || '',
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

export async function fetchTrending() {
  try {
    const json = await fetchJson(ITUNES_TOP)
    const tracks = dedupe((json.feed?.entry || []).map(rssEntryToTrack).filter((t) => t.preview))
    if (tracks.length) return tracks
  } catch {
    /* fall through */
  }

  // Fallback: curated searches across genres, run in parallel
  const curated = ['周杰伦', 'Taylor Swift', 'Ed Sheeran', 'jazz', 'electronic', 'classical']
  const settled = await Promise.allSettled(
    curated.map(async (q) => {
      const url = new URL(ITUNES_SEARCH)
      url.searchParams.set('term', q)
      url.searchParams.set('media', 'music')
      url.searchParams.set('entity', 'song')
      url.searchParams.set('limit', '8')
      const json = await fetchJson(url)
      return (json.results || []).map(itunesToTrack)
    }),
  )
  const tracks = dedupe(
    settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : [])).filter((t) => t.preview),
  ).slice(0, 30)
  if (!tracks.length) throw new Error('暂时无法获取推荐歌曲，请稍后重试')
  return tracks
}
