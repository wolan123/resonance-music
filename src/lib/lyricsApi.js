const SEARCH_URL = 'https://lrclib.net/api/search'

export async function fetchLyrics(track) {
  const url = new URL(SEARCH_URL)
  url.searchParams.set('track_name', track.title || '')
  if (track.artist) url.searchParams.set('artist_name', track.artist)
  url.searchParams.set('limit', '8')
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error('歌词服务暂时不可用')
  const list = await res.json()
  if (!Array.isArray(list) || !list.length) return null
  const item = list.find((x) => x.syncedLyrics) || list.find((x) => x.plainLyrics) || null
  if (!item) return null
  return {
    synced: item.syncedLyrics || null,
    plain: item.plainLyrics || null,
    source: `${item.artistName} - ${item.trackName}`,
  }
}
