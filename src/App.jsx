import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowClockwise,
  Compass,
  Heart,
  MusicNotes,
  WarningCircle,
  Waveform,
} from '@phosphor-icons/react'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import TrackRow from './components/TrackRow'
import TrackCard from './components/TrackCard'
import PlayerBar from './components/PlayerBar'
import { SkeletonCard, SkeletonRows } from './components/Skeleton'
import { fetchTrending, searchTracks } from './lib/api'
import { loadFavorites, loadVolume, saveFavorites, saveVolume } from './lib/storage'

function ErrorState({ message, onRetry }) {
  return (
    <div className="mt-5 flex flex-col items-start gap-4 rounded-2xl border border-white/8 bg-ink-900/60 p-8">
      <WarningCircle size={28} className="text-accent-400" />
      <div>
        <p className="font-medium">{message || '出错了'}</p>
        <p className="mt-1 text-sm text-cream-400">网络或音乐接口暂时不可用，请稍后重试。</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-accent-400 active:scale-[0.98]"
        >
          <ArrowClockwise size={16} />
          重试
        </button>
      )}
    </div>
  )
}

function EmptyFavorites({ onDiscover }) {
  return (
    <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-white/12 bg-ink-900/40 p-10">
      <Heart size={32} className="text-cream-400/50" />
      <div>
        <p className="text-lg font-medium">还没有收藏任何歌曲</p>
        <p className="mt-1 text-sm text-cream-400">去发现页找一首喜欢的歌，点一下心形就能收藏。</p>
      </div>
      <button
        onClick={onDiscover}
        className="flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-accent-400 active:scale-[0.98]"
      >
        <Compass size={16} />
        去发现
      </button>
    </div>
  )
}

export default function App() {
  const [audio] = useState(() => new Audio())
  const reducedMotion = useReducedMotion()

  const [view, setView] = useState('discover')
  const [query, setQuery] = useState('')
  const [trending, setTrending] = useState([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [trendingError, setTrendingError] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [favorites, setFavorites] = useState(loadFavorites)

  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(loadVolume)
  const queueRef = useRef(queue)
  const indexRef = useRef(index)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    indexRef.current = index
  }, [index])

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true)
    setTrendingError('')
    try {
      const tracks = await fetchTrending()
      setTrending(tracks)
    } catch (e) {
      setTrendingError(e.message || '加载失败')
    } finally {
      setTrendingLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrending()
  }, [loadTrending])

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  useEffect(() => {
    saveVolume(volume)
    audio.volume = volume
  }, [volume, audio])

  const playAt = useCallback(
    (i) => {
      const list = queueRef.current
      if (!list.length) return
      const safe = ((i % list.length) + list.length) % list.length
      indexRef.current = safe
      setIndex(safe)
      const track = list[safe]
      audio.src = track.preview
      audio.play().catch(() => {})
    },
    [audio],
  )

  const playTrack = useCallback(
    (track, list) => {
      const target = list || queueRef.current
      if (!target.length) return
      queueRef.current = target
      setQueue(target)
      const idx = target.findIndex((t) => t.id === track.id)
      const safe = idx < 0 ? 0 : idx
      indexRef.current = safe
      setIndex(safe)
      audio.src = track.preview
      audio.play().catch(() => {})
    },
    [audio],
  )

  const next = useCallback(() => playAt(indexRef.current + 1), [playAt])

  const prev = useCallback(() => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    playAt(indexRef.current - 1)
  }, [audio, playAt])

  const togglePlay = useCallback(() => {
    if (indexRef.current < 0) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [audio])

  useEffect(() => {
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => next()
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audio, next])

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay])

  const currentTrack = index >= 0 && index < queue.length ? queue[index] : null
  const isFav = (track) => favorites.some((t) => t.id === track.id)
  const toggleFavorite = (track) =>
    setFavorites((prev) =>
      prev.some((t) => t.id === track.id) ? prev.filter((t) => t.id !== track.id) : [track, ...prev],
    )

  const handleSearch = async (q) => {
    setQuery(q)
    setView('discover')
    setSearching(true)
    setSearchError('')
    try {
      const tracks = await searchTracks(q)
      setResults(tracks)
    } catch (e) {
      setSearchError(e.message || '搜索失败，请稍后重试')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const sectionAnim = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  }
  const noMotion = reducedMotion ? { initial: false } : sectionAnim

  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink-950 text-cream-50">
      <Sidebar view={view} onChangeView={setView} favoriteCount={favorites.length} />

      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/8 bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 text-ink-950">
          <Waveform size={18} weight="fill" />
        </div>
        <p className="font-bold tracking-tight">共鸣</p>
        <div className="ml-auto flex rounded-xl bg-ink-850 p-1" role="tablist" aria-label="导航">
          {[
            { key: 'discover', label: '发现' },
            { key: 'favorites', label: '收藏' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              role="tab"
              aria-selected={view === item.key}
              className={`rounded-lg px-3.5 py-1.5 text-sm transition ${
                view === item.key ? 'bg-ink-800 text-accent-300' : 'text-cream-400'
              }`}
            >
              {item.label}
              {item.key === 'favorites' && favorites.length > 0 && ` (${favorites.length})`}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 pb-44 lg:pb-32 lg:pl-72">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
          <AnimatePresence mode="wait">
            {view === 'discover' && !query ? (
              <motion.section key="home" {...noMotion} className="pt-8 lg:pt-14">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-400">Resonance</p>
                <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  让每一首歌
                  <br />
                  都有回响
                </h1>
                <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-cream-400">
                  搜索你喜欢的音乐，在线试听，把动人的旋律收进你的收藏夹。
                </p>
                <div className="mt-8 max-w-2xl">
                  <SearchBar onSearch={handleSearch} loading={searching} />
                </div>

                <div className="mt-14">
                  <div className="flex items-end justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">今日热门</h2>
                    <p className="text-xs text-cream-400/70">试听片段来自公开音乐接口</p>
                  </div>
                  {trendingLoading ? (
                    <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  ) : trendingError ? (
                    <ErrorState message={trendingError} onRetry={loadTrending} />
                  ) : (
                    <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                      {trending.map((track, i) => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          index={i}
                          isActive={currentTrack?.id === track.id}
                          isPlaying={isPlaying && currentTrack?.id === track.id}
                          isFavorite={isFav(track)}
                          onPlay={(t) => playTrack(t, trending)}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.section>
            ) : view === 'discover' ? (
              <motion.section key={`search-${query}`} {...noMotion} className="pt-8 lg:pt-12">
                <div className="max-w-2xl">
                  <SearchBar onSearch={handleSearch} loading={searching} />
                </div>
                {searching ? (
                  <SkeletonRows count={8} />
                ) : searchError ? (
                  <ErrorState message={searchError} onRetry={() => handleSearch(query)} />
                ) : (
                  <div className="mt-8">
                    <div className="flex items-center justify-between gap-4">
                      <p aria-live="polite" className="text-sm text-cream-400">
                        “{query}” 的搜索结果 · {results.length} 首
                      </p>
                      <button
                        onClick={() => setQuery('')}
                        className="shrink-0 text-xs text-accent-300 underline-offset-4 transition hover:underline"
                      >
                        返回热门推荐
                      </button>
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/8 bg-ink-900/60 p-2">
                      {results.map((track, i) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          index={i}
                          isActive={currentTrack?.id === track.id}
                          isPlaying={isPlaying && currentTrack?.id === track.id}
                          isFavorite={isFav(track)}
                          onPlay={(t) => playTrack(t, results)}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.section>
            ) : (
              <motion.section key="favorites" {...noMotion} className="pt-8 lg:pt-12">
                <h2 className="text-2xl font-semibold tracking-tight">我的收藏</h2>
                <p className="mt-1 text-sm text-cream-400">共 {favorites.length} 首歌曲</p>
                {favorites.length === 0 ? (
                  <EmptyFavorites onDiscover={() => setView('discover')} />
                ) : (
                  <div className="mt-6 rounded-2xl border border-white/8 bg-ink-900/60 p-2">
                    {favorites.map((track, i) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={i}
                        isActive={currentTrack?.id === track.id}
                        isPlaying={isPlaying && currentTrack?.id === track.id}
                        isFavorite
                        onPlay={(t) => playTrack(t, favorites)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying && !!currentTrack}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrev={prev}
        onToggleFavorite={currentTrack ? () => toggleFavorite(currentTrack) : undefined}
        isFavorite={currentTrack ? isFav(currentTrack) : false}
        audio={audio}
        volume={volume}
        onVolumeChange={setVolume}
      />
    </div>
  )
}
