const STORAGE = {
  netease: 'lumen.cloud.netease.v1',
  qq: 'lumen.cloud.qq.v1',
}

export function isCloudTrack(track) {
  return !!track && (track.source === 'cloud' || !!track.platform)
}

export function loadCloudCookie(platform) {
  try {
    return localStorage.getItem(STORAGE[platform]) || ''
  } catch {
    return ''
  }
}

export function saveCloudCookie(platform, cookie) {
  try {
    localStorage.setItem(STORAGE[platform], cookie || '')
  } catch {
    /* ignore */
  }
}

export function clearCloudCookie(platform) {
  saveCloudCookie(platform, '')
}

// QQ 音乐式音质档位（网易云曲目生效）
export const QUALITY_LEVELS = [
  { key: 'standard', label: '标准' },
  { key: 'higher', label: '高品' },
  { key: 'exhigh', label: '超品' },
  { key: 'lossless', label: '无损' },
]

export async function cloudRequest(platform, action, payload = {}) {
  const res = await fetch(`/api/cloud-${platform}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, cookie: loadCloudCookie(platform), ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '云音乐接口出错')
  return data
}

export async function cloudSearch(platform, keywords) {
  const data = await cloudRequest(platform, 'search', { keywords })
  return data.songs || []
}

export async function resolveCloudTrack(track, level) {
  const data = await cloudRequest(track.platform, 'url', {
    id: track.platformId,
    level: level || 'exhigh',
  })
  if (!data.url) throw new Error('无法获取播放地址')
  return data.url
}

export async function cloudLyrics(track) {
  const data = await cloudRequest(track.platform, 'lyric', { id: track.platformId })
  return data.lrc || ''
}
