import {
  getLoginQr,
  checkLoginQr,
  search as qqSearch,
  lyric as qqLyric,
} from '@sansenjian/qq-music-api/sdk'

export const config = { maxDuration: 60 }

const GUEST_UIN = '956581739'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function parseCookieString(str) {
  const obj = {}
  String(str || '')
    .split(';')
    .forEach((part) => {
      const i = part.indexOf('=')
      if (i > 0) obj[part.slice(0, i).trim()] = part.slice(i + 1).trim()
    })
  return obj
}

// QQ 音乐播放地址：CgiGetVkey 需要完整 query 参数，
// 未登录只能拿到 104003（无权限），必须带登录 cookie（含 qqmusic_key）才能出 purl。
async function fetchPlayUrl(songmid, cookieStr) {
  const cookieObj = parseCookieString(cookieStr)
  const uin = cookieObj.uin || GUEST_UIN
  const authst = cookieObj.qqmusic_key || cookieObj.qm_keyst || ''
  const param = {
    guid: '2796982635',
    songmid: [songmid],
    songtype: [0],
    uin,
    loginflag: 1,
    platform: '20',
  }
  if (authst) param.authst = authst
  const data = JSON.stringify({
    req_0: { module: 'vkey.GetVkeyServer', method: 'CgiGetVkey', param },
    comm: { uin, format: 'json', ct: 24, cv: 0 },
  })
  const url =
    `https://u.y.qq.com/cgi-bin/musicu.fcg?-=getplaysongvkey&g_tk=5381&loginUin=${uin}` +
    `&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json` +
    `&needNewCode=0&data=${encodeURIComponent(data)}`
  const headers = { Referer: 'https://y.qq.com/', 'User-Agent': UA }
  if (cookieStr) headers.Cookie = cookieStr
  const res = await fetch(url, { headers })
  const json = await res.json().catch(() => ({}))
  const req0 = json?.req_0?.data
  if (!req0) return { url: '', error: json?.req_0?.msg || '获取播放链接失败' }
  const domain =
    (req0.sip || []).find((i) => !String(i).startsWith('http://ws')) || req0.sip?.[0] || ''
  const item = (req0.midurlinfo || []).find((x) => x.songmid === songmid)
  if (!item?.purl) {
    const needLogin = cookieObj.uin && cookieObj.uin !== GUEST_UIN
    return {
      url: '',
      error: needLogin
        ? '该歌曲需要 QQ 音乐会员或暂不可播'
        : '请先扫码登录 QQ 音乐后再播放',
    }
  }
  let playUrl = `${domain}${item.purl}`
  if (playUrl.startsWith('http://')) playUrl = playUrl.replace('http://', 'https://')
  return { url: playUrl }
}

export default async function handler(req, res) {
  const body = req.body || {}
  const action = String(body.action || '')
  const cookieStr = String(body.cookie || '')
  try {
    if (action === 'qrCreate') {
      const qr = await getLoginQr()
      const b = qr.body || {}
      if (!b.img || !b.qrsig || !b.ptqrtoken) {
        return res.status(502).json({ error: b.error || '二维码生成失败' })
      }
      return res.json({
        image: b.img,
        cookie: JSON.stringify({ qrsig: b.qrsig, ptqrtoken: b.ptqrtoken }),
      })
    }

    if (action === 'qrPoll') {
      let session = {}
      try {
        session = JSON.parse(cookieStr || '{}')
      } catch {
        /* ignore */
      }
      if (!session.qrsig || !session.ptqrtoken) {
        return res.json({ state: 'expired', message: '二维码已失效，请刷新' })
      }
      const r = await checkLoginQr({
        ptqrtoken: session.ptqrtoken,
        qrsig: session.qrsig,
      })
      const b = r.body || {}
      if (b.isOk) {
        return res.json({
          state: 'success',
          cookie: b.session?.cookie || '',
          uin: b.session?.uin || '',
          nickname: b.message || 'QQ 用户',
        })
      }
      if (b.refresh) return res.json({ state: 'expired', message: '二维码已过期，请刷新' })
      return res.json({ state: 'waiting', message: b.message || '等待扫码' })
    }

    const cookieObj = parseCookieString(cookieStr)

    if (action === 'status') {
      if (!cookieObj.uin) return res.json({ user: null })
      return res.json({ user: { nickname: String(cookieObj.uin), uin: cookieObj.uin } })
    }

    if (action === 'search') {
      const s = await qqSearch({
        key: String(body.keywords || '').slice(0, 100),
        limit: 30,
        page: 1,
      })
      const list = s.body?.response?.data?.song?.list || []
      const songs = list.map((x) => ({
        id: `cloud-qq-${x.songmid}`,
        platform: 'qq',
        platformId: String(x.songmid || ''),
        title: x.songname || '未知曲目',
        artist: (x.singer || []).map((v) => v.name).filter(Boolean).join(' / ') || '未知歌手',
        album: x.albumname || '',
        artwork: x.albummid
          ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${x.albummid}.jpg`
          : null,
        durationMs: (Number(x.interval) || 0) * 1000,
      }))
      return res.json({ songs })
    }

    if (action === 'url') {
      const songmid = String(body.id || '').slice(0, 100)
      if (!songmid) return res.status(400).json({ error: '缺少歌曲 ID' })
      const result = await fetchPlayUrl(songmid, cookieStr)
      if (!result.url) return res.status(403).json({ error: result.error })
      return res.json({ url: result.url })
    }

    if (action === 'lyric') {
      const songmid = String(body.id || '').slice(0, 100)
      const l = await qqLyric({ songmid, isFormat: false })
      const resp = l.body?.response || {}
      const raw = resp.lyric
      const lrc = typeof raw === 'string' ? raw : raw?.lyric || ''
      const tlyric = typeof raw === 'object' ? raw?.trans || '' : resp.trans || ''
      return res.json({ lrc, tlyric })
    }

    return res.status(400).json({ error: '未知操作' })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'QQ音乐接口出错' })
  }
}
