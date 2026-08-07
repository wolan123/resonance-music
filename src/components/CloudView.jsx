import { useCallback, useEffect, useState } from 'react'
import {
  Crown,
  LinkBreak,
  SignIn,
  SignOut,
  Spinner,
  UsersThree,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import QRLoginModal from './QRLoginModal'
import { clearCloudCookie, cloudRequest, loadCloudCookie } from '../lib/cloud'

const PLATFORM_NAME = {
  netease: '网易云音乐',
  qq: 'QQ 音乐',
}

export default function CloudView({
  user,
  onGoSearch,
}) {
  const [platform, setPlatform] = useState('netease')
  const [users, setUsers] = useState({ netease: null, qq: null })
  const [shared, setShared] = useState({ netease: null, qq: null })
  const [qrOpen, setQrOpen] = useState(false)
  const [qrMode, setQrMode] = useState('personal')
  const [bindPlatform, setBindPlatform] = useState('netease')
  const [busy, setBusy] = useState('')

  const isAdmin = !!user?.isAdmin

  const checkStatus = useCallback(async (pl) => {
    if (!loadCloudCookie(pl)) {
      setUsers((prev) => ({ ...prev, [pl]: null }))
      return
    }
    try {
      const data = await cloudRequest(pl, 'status')
      setUsers((prev) => ({ ...prev, [pl]: data.user || null }))
    } catch {
      setUsers((prev) => ({ ...prev, [pl]: null }))
    }
  }, [])

  const checkShared = useCallback(async () => {
    for (const pl of ['netease', 'qq']) {
      try {
        const data = await cloudRequest(pl, 'sharedStatus')
        setShared((prev) => ({ ...prev, [pl]: data.user || null }))
      } catch {
        setShared((prev) => ({ ...prev, [pl]: null }))
      }
    }
  }, [])

  useEffect(() => {
    checkStatus('netease')
    checkStatus('qq')
    checkShared()
  }, [checkStatus, checkShared])

  function handlePersonalLoginSuccess(cookie) {
    try {
      localStorage.setItem(`lumen.cloud.${platform}.v1`, cookie)
    } catch {
      /* ignore */
    }
    setQrOpen(false)
    checkStatus(platform)
  }

  async function handleAdminLoginSuccess() {
    setQrOpen(false)
    setBusy('')
    await checkShared()
  }

  async function handleUnbind(pl) {
    if (!window.confirm(`确定解绑共享的${PLATFORM_NAME[pl]}会员吗？解绑后全站用户将无法用会员听歌`)) return
    setBusy(pl)
    try {
      await cloudRequest(pl, 'adminUnbind')
      await checkShared()
    } catch (e) {
      window.alert(e.message || '解绑失败')
    } finally {
      setBusy('')
    }
  }

  function handleLogout() {
    clearCloudCookie(platform)
    setUsers((prev) => ({ ...prev, [platform]: null }))
  }

  const personalUser = users[platform]
  const platformName = PLATFORM_NAME[platform]
  const anyShared = shared.netease || shared.qq

  return (
    <section className="pt-6 lg:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">云音乐</h1>
          <p className="mt-1 text-sm text-mist-500">
            绑定网易云 / QQ 音乐账号，用你的会员听歌；管理员可绑定共享会员，全站一起听
          </p>
        </div>
      </div>

      {/* shared membership status */}
      <div className="glass mt-4 rounded-[1.4rem] p-4">
        <div className="flex items-center gap-2">
          {isAdmin ? <Crown size={18} weight="fill" className="text-gold-300" /> : <UsersThree size={18} className="text-violet-400" />}
          <h2 className="text-sm font-bold text-white">{isAdmin ? '共享会员管理（管理员）' : '共享会员'}</h2>
        </div>
        <p className="mt-1 text-xs text-mist-500">
          {isAdmin
            ? '绑定你的会员账号后，全站用户无需登录即可用会员身份听歌；凭证加密保存在服务器，不会对外展示'
            : anyShared
              ? '管理员已共享会员，直接搜索播放即可享受会员歌曲'
              : '管理员尚未绑定共享会员，可先扫码登录自己的账号听歌'}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {['netease', 'qq'].map((pl) => {
            const info = shared[pl]
            return (
              <div key={pl} className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{PLATFORM_NAME[pl]}</p>
                  <p className="truncate text-[11px] text-mist-500">
                    {info ? `已绑定 · ${info.nickname}${info.uin ? ` (${info.uin})` : ''}` : '未绑定'}
                  </p>
                </div>
                {isAdmin &&
                  (info ? (
                    <button
                      onClick={() => handleUnbind(pl)}
                      disabled={busy === pl}
                      className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-mist-400 transition hover:border-red-400/40 hover:text-red-300 active:scale-95"
                    >
                      {busy === pl ? <Spinner size={11} className="animate-spin" /> : <LinkBreak size={12} />}
                      解绑
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQrMode('admin')
                        setBindPlatform(pl)
                        setQrOpen(true)
                      }}
                      className="btn-glow flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold"
                    >
                      <SignIn size={12} weight="bold" />
                      绑定
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex w-fit gap-1 rounded-2xl border border-white/8 bg-white/[0.04] p-1">
        {['netease', 'qq'].map((pl) => (
          <button
            key={pl}
            onClick={() => {
              setPlatform(pl)
            }}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
              platform === pl ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-mist-500 hover:text-white'
            }`}
          >
            {PLATFORM_NAME[pl]}
            {(users[pl] || shared[pl]) && <span className="ml-1 text-[10px] opacity-80">可用</span>}
          </button>
        ))}
      </div>

      <div className="glass mt-4 flex flex-col gap-3 rounded-[1.4rem] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {personalUser ? (
            <p className="text-sm font-semibold text-white">
              {platformName} · {personalUser.nickname}
              {personalUser.uin && <span className="ml-2 text-xs text-mist-500">({personalUser.uin})</span>}
            </p>
          ) : shared[platform] ? (
            <p className="text-sm font-semibold text-white">
              使用共享会员（{shared[platform].nickname}）播放
            </p>
          ) : (
            <p className="text-sm text-mist-500">未登录，扫码登录后可用你自己的会员听歌</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {personalUser ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-xs font-semibold text-mist-400 transition hover:border-white/25 hover:text-white"
            >
              <SignOut size={14} />
              退出登录
            </button>
          ) : (
            <button
              onClick={() => {
                setQrMode('personal')
                setBindPlatform(platform)
                setQrOpen(true)
              }}
              className="btn-glow flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
            >
              <SignIn size={14} weight="bold" />
              扫码登录
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onGoSearch}
        className="btn-glow mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold sm:w-auto"
      >
        <MagnifyingGlass size={16} weight="bold" />
        去搜索全网歌曲
      </button>

      <QRLoginModal
        platform={bindPlatform}
        mode={qrMode}
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onSuccess={qrMode === 'admin' ? handleAdminLoginSuccess : handlePersonalLoginSuccess}
      />
    </section>
  )
}
