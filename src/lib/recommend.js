import { cloudSearch } from './cloud'

const CACHE_KEY = 'lumen.recommend.v1'

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function daySeed(userId) {
  const d = new Date()
  const str = `${userId || 'guest'}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  let h = 5381
  for (let i = 0; i < str.length; i += 1) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  return h
}

function trackKey(s) {
  return `${s.platform || ''}-${s.platformId || s.id}`
}

function readCache(userId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    if (c.userId !== (userId || 'guest') || c.seed !== daySeed(userId)) return null
    return Array.isArray(c.songs) && c.songs.length ? c.songs : null
  } catch {
    return null
  }
}

function writeCache(userId, songs) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ userId: userId || 'guest', seed: daySeed(userId), songs }),
    )
  } catch {
    /* ignore */
  }
}

function weightedArtists(favorites, recent) {
  const m = new Map()
  const bump = (s, w) => {
    const a = String(s.artist || '').trim()
    if (!a || a === '未知歌手') return
    m.set(a, (m.get(a) || 0) + w)
  }
  for (const s of favorites || []) bump(s, 3)
  for (const s of recent || []) bump(s, 2)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([a]) => a)
}

// 汽水式"猜你喜欢"：每日按用户收藏/最近播放的歌手生成，混入全网热歌/新歌
// 未登录用户退化为热歌+新歌混排；同一天内结果固定，隔天自动更新
export async function buildRecommendations({ userId, favorites = [], recent = [], rankings = {} }) {
  const cached = readCache(userId)
  if (cached) return cached

  const hot = rankings.hot || []
  const fresh = rankings.fresh || []
  const siteHot = rankings.siteHot || []
  const recentKeys = new Set((recent || []).map(trackKey))

  const pool = []
  const seen = new Set()
  const push = (s) => {
    const k = trackKey(s)
    if (!s || seen.has(k)) return
    seen.add(k)
    pool.push(s)
  }

  const artists = weightedArtists(favorites, recent)
  for (let i = 0; i < Math.min(3, artists.length); i += 1) {
    try {
      const songs = await cloudSearch('netease', artists[i])
      for (const s of songs) push(s)
    } catch {
      /* skip artist */
    }
  }
  if (artists.length) {
    try {
      const songs = await cloudSearch('qq', artists[0])
      for (const s of songs) push(s)
    } catch {
      /* skip */
    }
  }
  for (const s of [...hot, ...fresh, ...siteHot]) push(s)

  const liked = []
  const heard = []
  const rest = []
  for (const s of pool) {
    const k = trackKey(s)
    if ((favorites || []).some((f) => trackKey(f) === k)) liked.push(s)
    else if (recentKeys.has(k)) heard.push(s)
    else rest.push(s)
  }

  const rnd = mulberry32(daySeed(userId))
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1))
      const tmp = arr[i]
      arr[i] = arr[j]
      arr[j] = tmp
    }
    return arr
  }

  const ordered = [...shuffle(liked), ...shuffle(rest), ...shuffle(heard)].slice(0, 30)
  if (ordered.length) writeCache(userId, ordered)
  return ordered
}
