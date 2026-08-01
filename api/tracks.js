import { del, get, list, put } from '@vercel/blob'

const LEGACY_INDEX = 'songs/index.json'

function cleanString(value, max) {
  return String(value || '').trim().slice(0, max)
}

async function readSongFile(pathname) {
  try {
    const result = await get(pathname, { access: 'public', useCache: false })
    if (!result || result.statusCode !== 200 || !result.stream) return null
    const text = await new Response(result.stream).text()
    const data = JSON.parse(text)
    return data && typeof data === 'object' && data.id ? data : null
  } catch {
    return null
  }
}

async function readLegacyIndex() {
  try {
    const result = await get(LEGACY_INDEX, { access: 'public', useCache: false })
    if (!result || result.statusCode !== 200 || !result.stream) return []
    const text = await new Response(result.stream).text()
    const data = JSON.parse(text)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function readAllSongs() {
  const { blobs } = await list({ prefix: 'songs/' })
  const files = blobs
    .filter((b) => b.pathname.startsWith('songs/') && b.pathname.endsWith('.json') && b.pathname !== LEGACY_INDEX)
    .map((b) => b.pathname)
  const [current, legacy] = await Promise.all([
    Promise.all(files.map(readSongFile)),
    readLegacyIndex(),
  ])
  const merged = [...current, ...legacy].filter(Boolean)
  const seen = new Set()
  const unique = merged.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
  return unique.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0))
}

export default async function handler(req, res) {
  const method = req.method || 'GET'
  try {
    if (method === 'GET') {
      const songs = await readAllSongs()
      return res.status(200).json({ songs })
    }

    if (method === 'POST') {
      const body = req.body || {}
      const title = cleanString(body.title, 120)
      const audioUrl = cleanString(body.audioUrl, 1000)
      if (!title || !audioUrl) {
        return res.status(400).json({ error: '缺少歌曲标题或音频地址' })
      }
      const id = crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const song = {
        id,
        title,
        artist: cleanString(body.artist, 80) || '未知歌手',
        album: cleanString(body.album, 120),
        durationMs: Math.max(0, Number(body.durationMs) || 0),
        audioUrl,
        artworkUrl: cleanString(body.artworkUrl, 1000) || null,
        lrc: typeof body.lrc === 'string' && body.lrc.trim() ? body.lrc.slice(0, 30000) : null,
        uploader: cleanString(body.uploader, 40) || '匿名听众',
        uploadedAt: Date.now(),
      }
      await put(`songs/${id}.json`, JSON.stringify(song), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      })
      return res.status(200).json({ song })
    }

    if (method === 'DELETE') {
      const body = req.body || {}
      const id = cleanString(body.id, 100)
      if (!id) return res.status(400).json({ error: '缺少歌曲 ID' })
      const all = await readAllSongs()
      const target = all.find((s) => s.id === id)
      if (!target) return res.status(404).json({ error: '歌曲不存在' })
      const urls = [target.audioUrl, target.artworkUrl].filter(Boolean)
      const paths = [`songs/${id}.json`]
      if (urls.length) {
        try {
          await del(urls)
        } catch {
          /* blob may already be gone */
        }
      }
      try {
        await del(paths)
      } catch {
        /* ignore */
      }
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (e) {
    return res.status(500).json({ error: e.message || '服务出错' })
  }
}
