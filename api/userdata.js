import { cleanString, getSessionUser, readUserData, writeUserData } from './lib.js'

function cleanList(list, max = 200) {
  return Array.isArray(list)
    ? list
        .filter((t) => t && t.id)
        .slice(0, max)
        .map((t) => ({
          id: String(t.id).slice(0, 100),
          source: t.source || '',
          platform: t.platform || '',
          platformId: String(t.platformId || ''),
          title: cleanString(t.title, 120),
          artist: cleanString(t.artist, 80),
          album: cleanString(t.album, 120),
          artworkUrl: cleanString(t.artworkUrl, 1000),
          artwork: cleanString(t.artwork, 1000),
          durationMs: Number(t.durationMs) || 0,
          addedAt: Number(t.addedAt) || Date.now(),
        }))
    : []
}

export default async function handler(req, res) {
  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: '请先登录' })
  const body = req.body || {}
  const action = String(body.action || '')
  try {
    if (action === 'get') {
      const [favorites, recent] = await Promise.all([
        readUserData(user.id, 'favorites', []),
        readUserData(user.id, 'recent', []),
      ])
      return res.json({ favorites: Array.isArray(favorites) ? favorites : [], recent: Array.isArray(recent) ? recent : [] })
    }

    if (action === 'setFavorites') {
      await writeUserData(user.id, 'favorites', cleanList(body.favorites))
      return res.json({ ok: true })
    }

    if (action === 'setRecent') {
      await writeUserData(user.id, 'recent', cleanList(body.recent, 100))
      return res.json({ ok: true })
    }

    return res.status(400).json({ error: '未知操作' })
  } catch (e) {
    return res.status(500).json({ error: e.message || '服务出错' })
  }
}
