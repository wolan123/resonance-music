import { parseBlob } from 'music-metadata'

function formatLrcTime(sec) {
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(2).padStart(5, '0')
  return `${m}:${s}`
}

function extractLyrics(lyr) {
  if (!lyr) return null
  if (typeof lyr === 'string') return lyr
  if (Array.isArray(lyr)) {
    return lyr.map((l) => (typeof l === 'string' ? l : l.text)).join('\n')
  }
  if (Array.isArray(lyr.sync) && lyr.sync.length) {
    return lyr.sync.map((l) => `[${formatLrcTime(l.time)}]${l.text}`).join('\n')
  }
  if (typeof lyr.unsynced === 'string' && lyr.unsynced.trim()) return lyr.unsynced
  return null
}

export async function parseAudioFile(file) {
  let common = {}
  let format = {}
  try {
    const meta = await parseBlob(file, { duration: true })
    common = meta.common || {}
    format = meta.format || {}
  } catch {
    /* metadata unreadable, fall back to filename */
  }

  const base = file.name.replace(/\.[^.]+$/, '')
  const title = common.title || base
  const artist = common.artist || common.albumartist || ''
  const album = common.album || ''
  const pic = Array.isArray(common.picture) ? common.picture[0] : common.picture
  let artworkBlob = null
  if (pic && pic.data) {
    try {
      artworkBlob = new Blob([pic.data], { type: pic.format || 'image/jpeg' })
    } catch {
      artworkBlob = null
    }
  }
  const durationSec = typeof format.duration === 'number' && format.duration > 0 ? format.duration : 0
  return {
    title,
    artist,
    album,
    artworkBlob,
    lrc: extractLyrics(common.lyrics),
    durationMs: Math.round(durationSec * 1000),
  }
}
