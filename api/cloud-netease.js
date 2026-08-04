import Netease from 'NeteaseCloudMusicApi'

export const config = { maxDuration: 60 }

const REAL_IP = '116.25.146.177'

function clean(value, max) {
  return String(value || '').trim().slice(0, max)
}

export default async function handler(req, res) {
  const body = req.body || {}
  const action = String(body.action || '')
  const cookie = clean(body.cookie, 8000)
  try {
    if (action === 'qrKey') {
      const r = await Netease.login_qr_key({ realIP: REAL_IP })
      return res.json({ key: r.body?.data?.unikey || '' })
    }

    if (action === 'qrCreate') {
      const r = await Netease.login_qr_create({
        key: clean(body.key, 200),
        qrimg: 'true',
        realIP: REAL_IP,
      })
      return res.json({ qrurl: r.body?.data?.qrurl || '', qrimg: r.body?.data?.qrimg || '' })
    }

    if (action === 'qrCheck') {
      const r = await Netease.login_qr_check({
        key: clean(body.key, 200),
        realIP: REAL_IP,
      })
      return res.json({
        code: r.body?.code,
        message: r.body?.message || '',
        cookie: r.cookie || '',
      })
    }

    if (action === 'status') {
      const r = await Netease.login_status({ cookie, realIP: REAL_IP })
      const profile = r.body?.profile
      return res.json({
        user: profile
          ? { nickname: profile.nickname || '', avatarUrl: profile.avatarUrl || '' }
          : null,
      })
    }

    if (action === 'search') {
      const r = await Netease.search({
        keywords: clean(body.keywords, 100),
        limit: Math.min(40, Number(body.limit) || 30),
        type: 1,
        realIP: REAL_IP,
      })
      const songs = (r.body?.result?.songs || []).map((s) => ({
        id: `cloud-netease-${s.id}`,
        platform: 'netease',
        platformId: String(s.id),
        title: s.name || '未知曲目',
        artist: (s.artists || []).map((a) => a.name).filter(Boolean).join(' / ') || '未知歌手',
        album: s.album?.name || '',
        artwork: s.album?.picUrl
          ? s.album.picUrl.replace(/^http:/, 'https:')
          : s.album?.picId
            ? `https://p1.music.126.net/${s.album.picId}.jpg`
            : null,
        durationMs: s.duration || 0,
      }))
      return res.json({ songs })
    }

    if (action === 'url') {
      const r = await Netease.song_url_v1({
        id: clean(body.id, 100),
        level: clean(body.level, 20) || 'exhigh',
        cookie,
        realIP: REAL_IP,
      })
      const first = r.body?.data?.[0]
      if (!first || !first.url) {
        return res
          .status(403)
          .json({ error: '无法获取播放地址（可能需要登录或会员，或该曲暂无版权）', code: r.body?.code })
      }
      return res.json({
        url: first.url.replace(/^http:/, 'https:'),
        br: first.br,
        level: first.level,
      })
    }

    if (action === 'lyric') {
      const r = await Netease.lyric({ id: clean(body.id, 100), cookie, realIP: REAL_IP })
      return res.json({ lrc: r.body?.lrc?.lyric || '', tlyric: r.body?.tlyric?.lyric || '' })
    }

    return res.status(400).json({ error: '未知操作' })
  } catch (e) {
    return res.status(500).json({ error: e.message || '网易云接口出错' })
  }
}
