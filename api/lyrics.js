import { cleanString, readSongFile, writeSongFile } from './lib.js'

async function searchOne(track, artist) {
  const url = new URL('https://lrclib.net/api/search')
  url.searchParams.set('track_name', track)
  if (artist) url.searchParams.set('artist_name', artist)
  url.searchParams.set('limit', '8')
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) return null
  const list = await res.json()
  if (!Array.isArray(list) || !list.length) return null
  const item = list.find((x) => x.syncedLyrics) || list.find((x) => x.plainLyrics) || null
  if (!item) return null
  return {
    lrc: item.syncedLyrics || item.plainLyrics,
    source: `${item.artistName} - ${item.trackName}`,
  }
}

async function searchLyrics(title, artist) {
  const cleanArtist = artist && artist !== '未知歌手' ? artist : ''
  const candidates = [{ track: title, artist: cleanArtist }]
  if (String(title).includes(' - ')) {
    const parts = title.split(' - ')
    const track = parts.slice(1).join(' - ')
    candidates.push({ track, artist: parts[0] })
    candidates.push({ track, artist: '' })
  }
  for (const c of candidates) {
    const found = await searchOne(c.track, c.artist)
    if (found) return found
  }
  return null
}

export default async function handler(req, res) {
  const body = req.body || {}
  const id = cleanString(body.id, 100)
  if (!id) return res.status(400).json({ error: '缺少歌曲 ID' })

  try {
    const song = await readSongFile(`songs/${id}.json`)
    if (!song) return res.status(404).json({ error: '歌曲不存在' })
    if (song.lrc) return res.status(200).json({ lrc: song.lrc, matched: true, cached: true })

    const found = await searchLyrics(song.title, song.artist)
    if (!found) return res.status(200).json({ lrc: null, matched: false })

    song.lrc = found.lrc
    await writeSongFile(song)
    return res.status(200).json({ lrc: found.lrc, matched: true, source: found.source })
  } catch (e) {
    return res.status(500).json({ error: e.message || '歌词服务暂时不可用' })
  }
}
