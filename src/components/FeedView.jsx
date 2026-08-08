import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Heart, Pause, Play, Sparkle } from '@phosphor-icons/react'
import { artworkOf } from '../lib/api'

// 汽水音乐式沉浸推荐流：全屏卡片 + 上下滑切歌 + 自动连播
export default function FeedView({
  songs,
  loading,
  currentTrack,
  isPlaying,
  isFav,
  onSwipePlay,
  onOpenTrack,
  onToggleFavorite,
  onRefresh,
}) {
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState(1)
  const startedRef = useRef(false)
  const touchY = useRef(null)
  const listKey = useRef('')

  useEffect(() => {
    const key = songs.map((s) => s.id).join('|')
    if (key !== listKey.current) {
      listKey.current = key
      const i = songs.findIndex((s) => s.id === currentTrack?.id)
      setIdx(i >= 0 ? i : 0)
    }
  }, [songs, currentTrack?.id])

  const song = songs[idx] || null

  const go = useCallback(
    (delta) => {
      if (!songs.length) return
      setDir(delta > 0 ? 1 : -1)
      setIdx((v) => (v + delta + songs.length) % songs.length)
    },
    [songs],
  )

  // 卡片变化后自动连播（用户点过一次播放后生效）
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (startedRef.current && song) onSwipePlay(songs, idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  const playOrPause = useCallback(() => {
    if (!song) return
    if (currentTrack?.id === song.id && isPlaying) {
      return
    }
    startedRef.current = true
    onOpenTrack(song, songs)
  }, [song, songs, currentTrack?.id, isPlaying, onOpenTrack])

  const onTouchStart = useCallback((e) => {
    touchY.current = e.touches[0].clientY
  }, [])
  const onTouchEnd = useCallback(
    (e) => {
      if (touchY.current == null) return
      const dy = e.changedTouches[0].clientY - touchY.current
      touchY.current = null
      if (Math.abs(dy) < 60) return
      startedRef.current = true
      go(dy < 0 ? 1 : -1)
    },
    [go],
  )

  const onWheel = useCallback(
    (e) => {
      if (Math.abs(e.deltaY) < 40) return
      startedRef.current = true
      go(e.deltaY > 0 ? 1 : -1)
    },
    [go],
  )

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-16rem)] min-h-[24rem] items-center justify-center pt-6 lg:h-[calc(100dvh-12rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-64 w-64 animate-pulse rounded-3xl bg-white/[0.06] sm:h-80 sm:w-80" />
          <div className="h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-24 animate-pulse rounded bg-white/[0.05]" />
        </div>
      </div>
    )
  }

  if (!songs.length) {
    return (
      <div className="flex h-[calc(100dvh-16rem)] min-h-[24rem] flex-col items-center justify-center gap-4 text-center pt-6 lg:h-[calc(100dvh-12rem)]">
        <Sparkle size={34} className="text-cyan-300" />
        <p className="text-lg font-bold text-white">推荐正在生成</p>
        <p className="max-w-xs text-sm leading-relaxed text-mist-500">
          登录后按你的收藏和最近播放生成每日推荐，未登录则先听全网热歌
        </p>
        <button onClick={onRefresh} className="btn-glow rounded-full px-5 py-2 text-sm font-semibold">
          重新生成
        </button>
      </div>
    )
  }

  const active = currentTrack?.id === song.id

  return (
    <div
      className="flex h-[calc(100dvh-16rem)] min-h-[24rem] flex-col items-center justify-center overflow-hidden pt-6 lg:h-[calc(100dvh-12rem)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-mist-500">
        <ArrowUp size={13} />
        上滑切下一首
        <ArrowDown size={13} />
      </div>

      <div className="relative flex w-full max-w-sm flex-1 items-center justify-center sm:max-w-md">
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={song.id}
            custom={dir}
            initial={{ x: dir * 140, opacity: 0, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: dir * -140, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full cursor-pointer select-none"
            onClick={playOrPause}
          >
            <div className="relative overflow-hidden rounded-[1.8rem] shadow-[0_30px_90px_rgba(139,92,246,0.35)] ring-1 ring-white/15">
              <img
                src={artworkOf(song)}
                alt=""
                className="aspect-square w-full object-cover"
                draggable={false}
              />
              {active && isPlaying && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent pb-4 pt-10">
                  <span className="eq-bar h-3 w-1 rounded-full bg-cyan-300" style={{ animationDelay: '0ms' }} />
                  <span className="eq-bar h-5 w-1 rounded-full bg-violet-400" style={{ animationDelay: '120ms' }} />
                  <span className="eq-bar h-3.5 w-1 rounded-full bg-cyan-300" style={{ animationDelay: '240ms' }} />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 w-full max-w-sm sm:max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-white">{song.title}</p>
            <p className="mt-1 truncate text-sm text-mist-500">
              {song.artist} · {song.platform === 'qq' ? 'QQ 音乐' : '网易云'}
            </p>
          </div>
          <button
            onClick={() => onToggleFavorite(song)}
            aria-label={isFav(song) ? '取消收藏' : '收藏'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
              isFav(song) ? 'bg-pink-500/20 text-pink-400' : 'bg-white/8 text-white hover:bg-white/14'
            }`}
          >
            <Heart size={20} weight={isFav(song) ? 'fill' : 'regular'} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={playOrPause}
            className={`btn-glow flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold ${
              active && isPlaying ? 'pulse-ring' : ''
            }`}
          >
            {active && isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            {active && isPlaying ? '正在播放' : '播放'}
          </button>
          <button
            onClick={() => {
              startedRef.current = true
              go(1)
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-mist-300 transition hover:bg-white/14 hover:text-white active:scale-90"
            aria-label="下一首"
          >
            <ArrowDown size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {songs.slice(0, 9).map((s, i) => (
          <span
            key={s.id}
            className={`h-1 rounded-full transition-all ${i === idx ? 'w-5 bg-cyan-300' : 'w-1.5 bg-white/25'}`}
          />
        ))}
        {songs.length > 9 && <span className="text-[10px] text-mist-700">{songs.length}</span>}
      </div>
    </div>
  )
}
