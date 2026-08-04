import Netease from 'NeteaseCloudMusicApi'
import {
  cleanString,
  getSessionUser,
  isAdminUser,
  readCloudCreds,
  writeCloudCreds,
} from './lib.js'

export const config = { maxDuration: 60 }

const REAL_IP = '116.25.146.177'

function clean(value, max) {
  return cleanString(value, max)
}

async function sharedCookie() {
  const creds = await readCloudCreds()
  return creds?.netease?.cookie || ''
}

async function adminGuard(req, res) {
  const user = await getSessionUser(req)
  if (!user) {
    res.status(401).json({ error: '请先登录' })
    return null
  }
  if (!isAdminUser(user)) {
    res.status(403).json({ error: '仅管理员可绑定共享会员' })
    return null
  }
  return user
}

export default async function handler(req, res) {
  const body = req.body || {}
  const action = String(body.action || '')
  const cookie = clean(body.cookie, 8000)
  try {
    if (action === 'adminStatus') {
      if (!(await adminGuard(req, res))) return
      const creds = await readCloudCreds()
      const info = creds?.netease
      return res.json({
        user: info ? { nickname: info.nickname || info.uin || '已绑定', uin: info.uin } : null,
      })
    }

    if (action === 'adminUnbind') {
      if (!(await adminGuard(req, res))) return
      const creds = (await readCloudCreds()) || {}
      delete creds.netease
      await writeCloudCreds(creds)
      return res.json({ ok: true })
    }

    if (action === 'adminQrCheck') {
      if (!(await adminGuard(req, res))) return
      const r = await Netease.login_qr_check({
        key: clean(body.key, 200),
        realIP: REAL_IP,
      })
      const code = r.body?.code
      if (code === 803 && r.cookie) {
        const profile = r.body?.data?.profile
        const creds = (await readCloudCreds()) || {}
        creds.netease = {
          cookie: r.cookie,
          uin: profile?.userId ? String(profile.userId) : '',
          nickname: profile?.nickname || '网易云用户',
          updatedAt: Date.now(),
        }
        await writeCloudCreds(creds)
        return res.json({ ok: true, user: { nickname: creds.netease.nickname, uin: creds.netease.uin } })
      }
      return res.json({ code: r.body?.code, message: r.body?.message || '' })
    }

    if (action === 'adminQrKey') {
      if (!(await adminGuard(req, res))) return
      const r = await Netease.login_qr_key({ realIP: REAL_IP })
      return res.json({ key: r.body?.data?.unikey || '' })
    }

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

    if (action === 'sharedStatus') {
      const creds = await readCloudCreds()
      const info = creds?.netease
      return res.json({
        user: info ? { nickname: info.nickname || info.uin || '已绑定', uin: info.uin } : null,
      })
    }

    if (action === 'search') {
      const r = await Netease.search({
        keywords: clean(body.keywords, 100),
        limit: Math.min(40, Number(body.limit) || 30),
        type: 1,
        realIP: REAL_IP,
      })
      const list = r.body?.result?.songs || []
      // 搜索接口只返回数字 picId，需按歌曲 id 批量拉 song_detail 才能拿到有效封面 URL
      let coverMap = {}
      if (list.length) {
        try {
          const ids = list.map((s) => s.id).filter(Boolean).slice(0, 40).join(',')
          const detail = await Netease.song_detail({ ids, realIP: REAL_IP })
          coverMap = Object.fromEntries(
            (detail.body?.songs || [])
              .map((s) => [String(s.id), s.al?.picUrl ? s.al.picUrl.replace(/^http:/, 'https:') : ''])
              .filter(([, v]) => v),
          )
        } catch {
          coverMap = {}
        }
      }
      const songs = list.map((s) => ({
        id: `cloud-netease-${s.id}`,
        source: 'cloud',
        platform: 'netease',
        platformId: String(s.id),
        title: s.name || '未知曲目',
        artist: (s.artists || []).map((a) => a.name).filter(Boolean).join(' / ') || '未知歌手',
        album: s.album?.name || '',
        artwork: coverMap[String(s.id)] || null,
        durationMs: s.duration || 0,
      }))
      return res.json({ songs })
    }

    if (action === 'url') {
      const effectiveCookie = cookie || (await sharedCookie())
      const r = await Netease.song_url_v1({
        id: clean(body.id, 100),
        level: clean(body.level, 20) || 'exhigh',
        cookie: effectiveCookie,
        realIP: REAL_IP,
      })
      const first = r.body?.data?.[0]
      if (!first || !first.url) {
        return res.status(403).json({
          error: effectiveCookie
            ? '该歌曲暂无版权或当前会员不可播'
            : '无法获取播放地址（请先扫码登录，或联系管理员绑定共享会员）',
          code: r.body?.code,
        })
      }
      return res.json({
        url: first.url.replace(/^http:/, 'https:'),
        br: first.br,
        level: first.level,
      })
    }

    if (action === 'lyric') {
      const r = await Netease.lyric({
        id: clean(body.id, 100),
        cookie: cookie || (await sharedCookie()),
        realIP: REAL_IP,
      })
      return res.json({ lrc: r.body?.lrc?.lyric || '', tlyric: r.body?.tlyric?.lyric || '' })
    }

    return res.status(400).json({ error: '未知操作' })
  } catch (e) {
    return res.status(500).json({ error: e.message || '网易云接口出错' })
  }
}
