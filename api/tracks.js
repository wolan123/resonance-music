import { del } from '@vercel/blob'
import {
  cleanString,
  getSessionUser,
  readAllSongs,
  writeSongFile,
} from './lib.js'

export default async function handler(req, res) {
  const method = req.method || 'GET'
  try {
    if (method === 'GET') {
      const songs = await readAllSongs()
      return res.status(200).json({ songs })
    }

    if (method === 'POST') {
      const user = await getSessionUser(req)
      if (!user) return res.status(401).json({ error: '请先登录' })
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
        uploader: user.username,
        userId: user.id,
        uploadedAt: Date.now(),
      }
      await writeSongFile(song)
      return res.status(200).json({ song })
    }

    if (method === 'DELETE') {
      const user = await getSessionUser(req)
      if (!user) return res.status(401).json({ error: '请先登录' })
      const body = req.body || {}
      const id = cleanString(body.id, 100)
      if (!id) return res.status(400).json({ error: '缺少歌曲 ID' })
      const all = await readAllSongs()
      const target = all.find((s) => s.id === id)
      if (!target) return res.status(404).json({ error: '歌曲不存在' })
      const admins = String(process.env.ADMIN_USERNAMES || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      const isAdmin = admins.includes(String(user.username).toLowerCase())
      const canDelete = target.userId === user.id || (isAdmin && !target.userId)
      if (!canDelete) {
        return res.status(403).json({ error: '只能删除自己上传的歌曲' })
      }
      const urls = [target.audioUrl, target.artworkUrl].filter(Boolean)
      if (urls.length) {
        try {
          await del(urls)
        } catch {
          /* blob may already be gone */
        }
      }
      try {
        await del(`songs/${id}.json`)
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
