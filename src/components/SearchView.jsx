import { useState } from 'react'
import { MagnifyingGlass, Spinner, WarningCircle } from '@phosphor-icons/react'
import TrackRow from './TrackRow'
import { SkeletonRows } from './Skeleton'
import { cloudSearch } from '../lib/cloud'

const TAGS = ['周杰伦', 'Taylor Swift', '林俊杰', '邓紫棋', '陈奕迅', '古典', '纯音乐', '粤语']

export default function SearchView({ currentTrack, isPlaying, isFav, hasLyrics, onPlay, onToggleFavorite, onAddToPlaylist }) {
  const [platform, setPlatform] = useState('netease')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  async function doSearch(q) {
    const keywords = (q ?? query).trim()
    if (!keywords) return
    setQuery(keywords)
    setSearching(true)
    setError('')
    try {
      setResults(await cloudSearch(platform, keywords))
    } catch (e) {
      setError(e.message || '搜索失败')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const platformName = platform === 'netease' ? '网易云音乐' : 'QQ 音乐'

  return (
    <section className="pt-6 lg:pt-8">
      <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">搜索</h1>
      <p className="mt-1 text-sm text-mist-500">搜遍网易云 + QQ 音乐全曲库，免费歌直接听，会员歌走共享会员</p>

      <div className="mt-5 flex w-fit gap-1 rounded-2xl border border-white/8 bg-white/[0.04] p-1">
        {[
          { key: 'netease', label: '网易云音乐' },
          { key: 'qq', label: 'QQ 音乐' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setPlatform(t.key)
              setResults([])
              setError('')
            }}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
              platform === t.key ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-mist-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder={`搜索${platformName}的歌曲…`}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
          />
        </div>
        <button
          onClick={() => doSearch()}
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
            onClick={() => doSearch(tag)}
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
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white/[0.02] px-4 py-10 text-center text-sm text-mist-500">
            输入歌名或歌手，搜遍全网
          </p>
        )}
      </div>
    </section>
  )
}
