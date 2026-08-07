import {
  cleanString,
  getSessionUser,
  readPlainJson,
  readSongFile,
  writePlainJson,
  writeSongFile,
  readUserData,
  writeUserData,
} from './lib.js'

const STATS_FILE = 'cloud/cloudstats.json'

export default async function handler(req, res) {
  const body = req.body || {}
  const id = cleanString(body.id, 100)
  if (!id) return res.status(400).json({ error: '缺少歌曲 ID' })
  try {
    const user = await getSessionUser(req)
    const cloud = body.cloud
    if (cloud && (cloud.platform === 'netease' || cloud.platform === 'qq') && cloud.platformId) {
      const stats = (await readPlainJson(STATS_FILE, {})) || {}
      const key = `${cloud.platform}:${String(cloud.platformId)}`
      const cur = stats[key] || {}
      const next = {
        id,
        platform: cloud.platform,
        platformId: String(cloud.platformId),
        title: cleanString(cloud.title, 120) || cur.title || '未知曲目',
        artist: cleanString(cloud.artist, 80) || cur.artist || '未知歌手',
        album: cleanString(cloud.album, 120) || cur.album || '',
        artwork: cleanString(cloud.artwork, 1000) || cur.artwork || null,
        durationMs: Number(cloud.durationMs) || cur.durationMs || 0,
        plays: (cur.plays || 0) + 1,
        firstPlayedAt: cur.firstPlayedAt || Date.now(),
        updatedAt: Date.now(),
      }
      stats[key] = next
      const keys = Object.keys(stats)
      if (keys.length > 300) {
        const stale = keys
          .map((k) => ({ k, t: stats[k].updatedAt || 0 }))
          .sort((a, b) => a.t - b.t)
          .slice(0, keys.length - 300)
        for (const { k } of stale) delete stats[k]
      }
      await writePlainJson(STATS_FILE, stats)
      if (user) await appendHistory(user.id, cloud, id)
      return res.status(200).json({ ok: true, playCount: next.plays })
    }

    const song = await readSongFile(`songs/${id}.json`)
    if (!song) return res.status(404).json({ error: '歌曲不存在' })
    song.playCount = (song.playCount || 0) + 1
    await writeSongFile(song)
    if (user) {
      await appendHistory(user.id, {
        platform: '',
        platformId: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        artwork: song.artworkUrl || null,
        durationMs: song.durationMs || 0,
      }, song.id)
    }
    return res.status(200).json({ ok: true, playCount: song.playCount })
  } catch (e) {
    return res.status(500).json({ error: e.message || '服务出错' })
  }
}

async function appendHistory(userId, track, id) {
  try {
    const history = (await readUserData(userId, 'history', [])) || []
    const entry = {
      id: String(id).slice(0, 100),
      platform: track.platform || '',
      platformId: String(track.platformId || ''),
      title: cleanString(track.title, 120),
      artist: cleanString(track.artist, 80),
      album: cleanString(track.album, 120) || '',
      artwork: cleanString(track.artwork, 1000) || null,
      durationMs: Number(track.durationMs) || 0,
      playedAt: Date.now(),
    }
    history.push(entry)
    const trimmed = history.length > 2000 ? history.slice(history.length - 2000) : history
    await writeUserData(userId, 'history', trimmed)
  } catch {
    /* history is best-effort */
  }
}
