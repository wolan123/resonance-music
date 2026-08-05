import Netease from 'NeteaseCloudMusicApi'
import { readPlainJson, writePlainJson } from './lib.js'

export const config = { maxDuration: 60 }

const REAL_IP = '116.25.146.177'
const CACHE_TTL = 30 * 60 * 1000
const RANK_CACHE = 'cloud/rankings.json'
const STATS_FILE = 'cloud/cloudstats.json'

const NET_TOP = {
  hot: 3778678, // 云音乐热歌榜
  new: 3779629, // 云音乐新歌榜
}

const QQ_TOP = {
  hot: 4,
  new: 26,
}

function neteaseTrack(track, chart) {
  const id = track?.id
  if (!id) return null
  const picUrl = track?.al?.picUrl || ''
  return {
    id: `cloud-netease-${id}`,
    source: 'cloud',
    platform: 'netease',
    platformId: String(id),
    title: track.name || track.mainTitle || '未知曲目',
    artist: (track.ar || []).map((a) => a.name).filter(Boolean).join(' / ') || '未知歌手',
    album: track.al?.name || '',
    artwork: picUrl ? picUrl.replace(/^http:/, 'https:') : null,
    durationMs: track.dt || 0,
    chart,
  }
}

function qqTrack(track, chart) {
  const mid = track?.mid
  if (!mid) return null
  return {
    id: `cloud-qq-${mid}`,
    source: 'cloud',
    platform: 'qq',
    platformId: String(mid),
    title: track.name || track.title || '未知曲目',
    artist: (track.singer || []).map((s) => s.name).filter(Boolean).join(' / ') || '未知歌手',
    album: track.album?.name || '',
    artwork: track.album?.mid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${track.album.mid}.jpg`
      : null,
    durationMs: (Number(track.interval) || 0) * 1000,
    chart,
  }
}

async function fetchNeteaseChart(topid, chart) {
  try {
    const r = await Netease.top_list({ id: topid, realIP: REAL_IP })
    return (r.body?.playlist?.tracks || [])
      .map((t) => neteaseTrack(t, chart))
      .filter(Boolean)
      .slice(0, 30)
  } catch {
    return []
  }
}

async function fetchQQChart(topid, chart) {
  try {
    const data = JSON.stringify({
      comm: { g_tk: 5381, uin: 956581739, format: 'json', ct: 23, cv: 0 },
      topList: {
        module: 'musicToplist.ToplistInfoServer',
        method: 'GetDetail',
        param: { topid, offset: 0, num: 30, period: '' },
      },
    })
    const r = await fetch(`https://u.y.qq.com/cgi-bin/musicu.fcg?_=${Date.now()}&data=${encodeURIComponent(data)}`, {
      headers: { Referer: 'https://y.qq.com/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36' },
      signal: AbortSignal.timeout(15000),
    })
    const j = await r.json()
    return (j?.topList?.data?.songInfoList || [])
      .map((t) => qqTrack(t, chart))
      .filter(Boolean)
      .slice(0, 30)
  } catch {
    return []
  }
}

async function fetchSiteHot() {
  try {
    const stats = (await readPlainJson(STATS_FILE, {})) || {}
    return Object.values(stats)
      .filter((s) => s && s.platform && s.title)
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 30)
      .map((s) => ({
        id: s.id || `cloud-${s.platform}-${s.platformId}`,
        source: 'cloud',
        platform: s.platform,
        platformId: String(s.platformId || ''),
        title: s.title,
        artist: s.artist || '未知歌手',
        album: s.album || '',
        artwork: s.artwork || null,
        durationMs: s.durationMs || 0,
        plays: s.plays || 0,
        chart: 'site',
      }))
  } catch {
    return []
  }
}

async function buildRankings() {
  const [neteaseHot, neteaseNew, qqHot, qqNew, siteHot] = await Promise.all([
    fetchNeteaseChart(NET_TOP.hot, 'netease-hot'),
    fetchNeteaseChart(NET_TOP.new, 'netease-new'),
    fetchQQChart(QQ_TOP.hot, 'qq-hot'),
    fetchQQChart(QQ_TOP.new, 'qq-new'),
    fetchSiteHot(),
  ])
  return {
    hot: [...neteaseHot, ...qqHot],
    fresh: [...neteaseNew, ...qqNew],
    siteHot,
  }
}

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  try {
    const cached = await readPlainJson(RANK_CACHE, null)
    const siteHot = await fetchSiteHot()
    if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return res.status(200).json({ hot: cached.hot || [], fresh: cached.fresh || [], siteHot })
    }
    const rankings = await buildRankings()
    const hot = rankings.hot
    const fresh = rankings.fresh
    await writePlainJson(RANK_CACHE, { hot, fresh, fetchedAt: Date.now() }).catch(() => {})
    return res.status(200).json({ hot, fresh, siteHot })
  } catch (e) {
    return res.status(500).json({ error: e.message || '榜单服务暂时不可用' })
  }
}
