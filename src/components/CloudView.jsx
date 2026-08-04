import { useCallback, useEffect, useState } from 'react'
import { MagnifyingGlass, SignIn, SignOut, Spinner, WarningCircle } from '@phosphor-icons/react'
import QRLoginModal from './QRLoginModal'
import TrackRow from './TrackRow'
import { SkeletonRows } from './Skeleton'
import { clearCloudCookie, cloudRequest, cloudSearch, loadCloudCookie } from '../lib/cloud'

const TAGS = ['周杰伦', 'Taylor Swift', '林俊杰', '邓紫棋', '陈奕迅', '古典', '纯音乐', '粤语']

export default function CloudView({ currentTrack, isPlaying, isFav, hasLyrics, onPlay, onToggleFavorite }) {
  const [platform, setPlatform] = useState('netease')
  const [users, setUsers] = useState({ netease: null, qq: null })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [qrOpen, setQrOpen] = useState(false)

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

  useEffect(() => {
    checkStatus('netease')
    checkStatus('qq')
  }, [checkStatus])

  async function handleSearch(q) {
    const keywords = (q ?? query).trim()
    if (!keywords) return
    setQuery(keywords)
    setSearching(true)
    setError('')
    try {
      const songs = await cloudSearch(platform, keywords)
      setResults(songs)
    } catch (e) {
      setError(e.message || '搜索失败')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleLoginSuccess(cookie) {
    const key = platform === 'netease' ? 'netease' : 'qq'
    try {
      localStorage.setItem(`lumen.cloud.${key}.v1`, cookie)
    } catch {
      /* ignore */
    }
    setQrOpen(false)
    checkStatus(key)
  }

  function handleLogout() {
    clearCloudCookie(platform)
    setUsers((prev) => ({ ...prev, [platform]: null }))
    setResults([])
  }

  const user = users[platform]
  const platformName = platform === 'netease' ? '网易云音乐' : 'QQ 音乐'

  return (
    <section className="pt-6 lg:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">云音乐</h1>
          <p className="mt-1 text-sm text-mist-500">绑定网易云 / QQ 音乐账号，用你的会员听歌</p>
        </div>
      </div>

      <div className="mt-5 flex w-fit gap-1 rounded-2xl border border-white/8 bg-white/[0.04] p-1">
        {['netease', 'qq'].map((pl) => (
          <button
            key={pl}
            onClick={() => {
              setPlatform(pl)
              setResults([])
              setError('')
            }}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
              platform === pl ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-mist-500 hover:text-white'
            }`}
          >
            {pl === 'netease' ? '网易云音乐' : 'QQ 音乐'}
            {users[pl] && <span className="ml-1 text-[10px] opacity-80">已登录</span>}
          </button>
        ))}
      </div>

      <div className="glass mt-4 flex flex-col gap-3 rounded-[1.4rem] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {user ? (
            <p className="text-sm font-semibold text-white">
              {platformName} · {user.nickname}
              {user.uin && <span className="ml-2 text-xs text-mist-500">({user.uin})</span>}
            </p>
          ) : (
            <p className="text-sm text-mist-500">
              {platformName} 未登录，扫码登录后可听会员歌曲
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-xs font-semibold text-mist-400 transition hover:border-white/25 hover:text-white"
            >
              <SignOut size={14} />
              退出登录
            </button>
          ) : (
            <button onClick={() => setQrOpen(true)} className="btn-glow flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold">
              <SignIn size={14} weight="bold" />
              扫码登录
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={`搜索${platformName}的歌曲…`}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={searching}
          className="btn-glow rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {searching ? <Spinner size={15} className="animate-spin" /> : '搜索'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => handleSearch(tag)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-mist-400 transition hover:border-violet-400/50 hover:text-white active:scale-95"
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {searching ? (
          <SkeletonRows count={8} />
        ) : error ? (
          <div className="glass flex flex-col items-start gap-3 rounded-[1.4rem] p-6">
            <WarningCircle size={22} className="text-violet-400" />
            <p className="text-sm text-mist-500">{error}</p>
          </div>
        ) : results.length > 0 ? (
          <div className="glass rounded-[1.6rem] p-2">
            <p aria-live="polite" className="px-3 pb-1 pt-2 text-xs text-mist-500">
              {platformName} 找到 {results.length} 首
            </p>
            {results.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isActive={currentTrack?.id === track.id}
                isPlaying={isPlaying && currentTrack?.id === track.id}
                isFavorite={isFav(track)}
                hasLyrics={hasLyrics(track)}
                onPlay={(t) => onPlay(t, results)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white/[0.02] px-4 py-10 text-center text-sm text-mist-500">
            搜索你想听的歌，结果会出现在这里
          </p>
        )}
      </div>

      <QRLoginModal
        platform={platform}
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </section>
  )
}
