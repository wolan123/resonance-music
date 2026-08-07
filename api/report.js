import { getSessionUser, readUserData } from './lib.js'

function topN(map, n) {
  return Object.entries(map)
    .map(([name, value]) => ({ name, count: value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: '请先登录' })
  try {
    const history = (await readUserData(user.id, 'history', [])) || []
    const favorites = (await readUserData(user.id, 'favorites', [])) || []
    if (!history.length) {
      return res.json({ empty: true, user: { username: user.username }, favoriteCount: favorites.length })
    }

    let plays = 0
    let listenMs = 0
    const songCount = {}
    const artistCount = {}
    const platformCount = {}
    const hourCount = Array(24).fill(0)
    const dayCount = {}
    let first = history[0]
    let last = history[history.length - 1]
    const songMeta = {}

    for (const h of history) {
      plays += 1
      listenMs += Math.min(h.durationMs || 0, 5 * 60 * 1000)
      const key = `${h.platform || 'local'}:${h.platformId || h.id}`
      songCount[key] = (songCount[key] || 0) + 1
      if (!songMeta[key]) {
        songMeta[key] = {
          title: h.title || '未知曲目',
          artist: h.artist || '未知歌手',
          artwork: h.artwork || null,
          platform: h.platform || 'local',
        }
      }
      const artist = (h.artist || '未知歌手').split(' / ')[0].trim()
      artistCount[artist] = (artistCount[artist] || 0) + 1
      const pl = h.platform === 'netease' ? 'netease' : h.platform === 'qq' ? 'qq' : 'local'
      platformCount[pl] = (platformCount[pl] || 0) + 1
      const d = new Date(h.playedAt || Date.now())
      hourCount[d.getHours()] += 1
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dayCount[dayKey] = (dayCount[dayKey] || 0) + 1
    }

    const topSongs = Object.entries(songCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, count]) => ({ ...songMeta[k], count }))

    const topArtists = topN(artistCount, 10)
    const peakHour = hourCount.indexOf(Math.max(...hourCount))
    const days = Object.keys(dayCount).sort()
    const last7 = days.slice(-7).map((d) => ({ date: d, count: dayCount[d] }))

    const hour = peakHour
    const personality =
      hour >= 23 || hour < 5 ? '夜猫子' : hour < 9 ? '早起鸟' : hour < 13 ? '上午派' : hour < 18 ? '午后派' : '傍晚派'
    const ne = platformCount.netease || 0
    const qq = platformCount.qq || 0
    const local = platformCount.local || 0
    const platformName = ne >= qq && ne >= local ? '网易云' : qq >= local ? 'QQ 音乐' : '站内'

    return res.json({
      empty: false,
      user: { username: user.username },
      favoriteCount: favorites.length,
      totals: {
        plays,
        listenMinutes: Math.max(1, Math.round(listenMs / 60000)),
        uniqueSongs: Object.keys(songCount).length,
        uniqueArtists: Object.keys(artistCount).length,
      },
      platformCount,
      personality,
      platformName,
      peakHour,
      topSongs,
      topArtists,
      last7,
      first: first ? { title: first.title, artist: first.artist, date: first.playedAt } : null,
      last: last ? { title: last.title, artist: last.artist, date: last.playedAt } : null,
      activeDays: days.length,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message || '报告生成失败' })
  }
}
