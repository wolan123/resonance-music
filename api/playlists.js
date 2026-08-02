import { randomUUID } from 'node:crypto'
import {
  cleanString,
  getSessionUser,
  readAllPlaylists,
  readAllSongs,
  writePlaylistFile,
} from './lib.js'

function publicPlaylist(pl) {
  return {
    id: pl.id,
    name: pl.name,
    description: pl.description,
    creatorId: pl.creatorId,
    creatorName: pl.creatorName,
    trackIds: pl.trackIds,
    playCount: pl.playCount || 0,
    createdAt: pl.createdAt,
    updatedAt: pl.updatedAt,
  }
}

export default async function handler(req, res) {
  const method = req.method || 'GET'
  try {
    if (method === 'GET') {
      const playlists = await readAllPlaylists()
      return res.status(200).json({ playlists: playlists.map(publicPlaylist) })
    }

    if (method === 'DELETE') {
      const user = await getSessionUser(req)
      if (!user) return res.status(401).json({ error: '请先登录' })
      const body = req.body || {}
      const id = cleanString(body.id, 100)
      const playlists = await readAllPlaylists()
      const target = playlists.find((p) => p.id === id)
      if (!target) return res.status(404).json({ error: '歌单不存在' })
      if (target.creatorId !== user.id) return res.status(403).json({ error: '只能删除自己创建的歌单' })
      const { del } = await import('@vercel/blob')
      try {
        await del(`playlists/${id}.json`)
      } catch {
        /* ignore */
      }
      return res.status(200).json({ ok: true })
    }

    const body = req.body || {}
    const action = String(body.action || '')

    if (action === 'create') {
      const user = await getSessionUser(req)
      if (!user) return res.status(401).json({ error: '请先登录' })
      const name = cleanString(body.name, 40)
      if (!name) return res.status(400).json({ error: '请填写歌单名称' })
      const now = Date.now()
      const playlist = {
        id: randomUUID(),
        name,
        description: cleanString(body.description, 200),
        creatorId: user.id,
        creatorName: user.username,
        trackIds: [],
        playCount: 0,
        createdAt: now,
        updatedAt: now,
      }
      await writePlaylistFile(playlist)
      return res.status(200).json({ playlist: publicPlaylist(playlist) })
    }

    if (action === 'add' || action === 'remove') {
      const user = await getSessionUser(req)
      if (!user) return res.status(401).json({ error: '请先登录' })
      const id = cleanString(body.id, 100)
      const trackId = cleanString(body.trackId, 100)
      if (!id || !trackId) return res.status(400).json({ error: '参数不完整' })
      const playlists = await readAllPlaylists()
      const target = playlists.find((p) => p.id === id)
      if (!target) return res.status(404).json({ error: '歌单不存在' })
      if (target.creatorId !== user.id) return res.status(403).json({ error: '只能编辑自己创建的歌单' })

      if (action === 'add') {
        const songs = await readAllSongs()
        if (!songs.some((s) => s.id === trackId)) return res.status(400).json({ error: '歌曲不存在' })
        if (!target.trackIds.includes(trackId)) target.trackIds.push(trackId)
      } else {
        target.trackIds = target.trackIds.filter((t) => t !== trackId)
      }
      target.updatedAt = Date.now()
      await writePlaylistFile(target)
      return res.status(200).json({ playlist: publicPlaylist(target) })
    }

    return res.status(400).json({ error: '未知操作' })
  } catch (e) {
    return res.status(500).json({ error: e.message || '服务出错' })
  }
}
