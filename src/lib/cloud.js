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

export async function resolveCloudTrack(track) {
  const data = await cloudRequest(track.platform, 'url', { id: track.platformId })
  if (!data.url) throw new Error('无法获取播放地址')
  return data.url
}

export async function cloudLyrics(track) {
  const data = await cloudRequest(track.platform, 'lyric', { id: track.platformId })
  return data.lrc || ''
}
