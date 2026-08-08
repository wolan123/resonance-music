import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Gauge,
  Heart,
  Pause,
  Play,
  Plus,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerX,
  TextAa,
  Timer,
} from '@phosphor-icons/react'
import { artworkOf } from '../lib/api'
import { formatSeconds } from '../lib/format'
import { activeLineIndex, parseLrc } from '../lib/lrc'
import { EFFECT_MODES } from '../lib/effects'
import { QUALITY_LEVELS } from '../lib/cloud'
import { SparkleIcon } from './LightIcons'
import LightCanvas from './LightCanvas'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export default function PlayerPage({
  open,
  onClose,
  track,
  isPlaying,
  currentTime,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleFavorite,
  isFavorite,
  audio,
  analyser,
  visualizerOn,
  volume,
  onVolumeChange,
  lrc,
  onFetchLyrics,
  onSeek,
  onAddToPlaylist,
  effectMode,
  onEffectModeChange,
  quality,
  onQualityChange,
  playbackRate,
  onPlaybackRateChange,
  sleepEndsAt,
  sleepLabel,
  onArmSleep,
  onCancelSleep,
}) {
  const [duration, setDuration] = useState(0)
  const [showLyrics, setShowLyrics] = useState(true)
  const [fetchState, setFetchState] = useState('idle')
  const [fetchError, setFetchError] = useState('')
  const [menu, setMenu] = useState(null)
  const [tick, setTick] = useState(0)
  const itemRefs = useRef({})
  const lyricsRef = useRef(null)
  const touchRef = useRef(null)

  useEffect(() => {
    if (sleepEndsAt <= 0) return
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [sleepEndsAt])

  useEffect(() => {
    const el = audio
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0)
    const onReset = () => setDuration(0)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('loadstart', onReset)
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('loadstart', onReset)
    }
  }, [audio])

  const lines = useMemo(() => (lrc ? parseLrc(lrc) : []), [lrc])
  const plainText = useMemo(() => {
    if (!lrc) return ''
    if (lines.length) return ''
    return lrc.trim()
  }, [lrc, lines])
  const activeIdx = activeLineIndex(lines, currentTime)

  useEffect(() => {
    if (!showLyrics || activeIdx < 0) return
    const el = itemRefs.current[activeIdx]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [showLyrics, activeIdx])

  useEffect(() => {
    if (open) {
      setFetchState('idle')
      setFetchError('')
    }
  }, [open, track?.id])

  async function fetchLyrics() {
    if (!track) return
    setFetchState('loading')
    setFetchError('')
    try {
      const text = await onFetchLyrics(track)
      if (!text) {
        setFetchState('error')
        setFetchError('没有找到这首歌的歌词')
      } else {
        setFetchState('done')
      }
    } catch (e) {
      setFetchState('error')
      setFetchError(e.message || '歌词服务暂时不可用')
    }
  }

  if (!track) return null

  const max = duration > 0 ? duration : Math.max(30, (track.durationMs || 0) / 1000)
  const currentMode = EFFECT_MODES.find((m) => m.key === effectMode) || EFFECT_MODES[0]

  function seek(value) {
    try {
      audio.currentTime = value
    } catch {
      /* not seekable yet */
    }
  }

  const sleepActive = sleepEndsAt > 0
  const sleepRemaining = sleepActive && sleepLabel !== '当前歌曲后' ? Math.max(0, sleepEndsAt - tick) : 0
  const sleepText =
    sleepLabel === '当前歌曲后'
      ? '当前歌曲后暂停'
      : sleepActive
        ? `${Math.floor(sleepRemaining / 60000)}:${String(Math.floor((sleepRemaining % 60000) / 1000)).padStart(2, '0')}`
        : ''

  function inScrollable(el) {
    let node = el
    while (node && node !== document.body) {
      if (node === lyricsRef.current) return true
      node = node.parentElement
    }
    return false
  }

  // 汽水式上下滑切歌：滚轮/触摸，歌词区域到顶/到底才切歌，避免和歌词滚动打架
  function onWheel(e) {
    if (e.target && e.target.tagName === 'INPUT') return
    if (Math.abs(e.deltaY) < 24) return
    const el = lyricsRef.current
    if (el) {
      const atTop = el.scrollTop <= 0
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      if (e.deltaY < 0 && !atTop) return
      if (e.deltaY > 0 && !atBottom) return
    }
    if (e.deltaY > 0) onNext()
    else onPrev()
  }

  function onTouchStart(e) {
    if (e.target && e.target.tagName === 'INPUT') {
      touchRef.current = null
      return
    }
    touchRef.current = {
      y: e.touches[0].clientY,
      scrollTop: inScrollable(e.target) ? lyricsRef.current.scrollTop : null,
    }
  }

  function onTouchEnd(e) {
    const t = touchRef.current
    touchRef.current = null
    if (!t) return
    const dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dy) < 60) return
    const el = lyricsRef.current
    if (t.scrollTop !== null && el) {
      const atTop = el.scrollTop <= 0
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      if (dy > 0 && !atTop) return
      if (dy < 0 && !atBottom) return
    }
    if (dy < 0) onNext()
    else onPrev()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden bg-abyss-950/55 backdrop-blur-xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-label="播放页"
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={artworkOf(track)}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-abyss-950/50 via-transparent to-abyss-950/90" />
          {visualizerOn !== false && <LightCanvas analyser={analyser} playing={isPlaying} mode={effectMode} />}

          <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col px-4 pb-6 pt-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                aria-label="收起播放页"
                className="rounded-full bg-white/8 p-2.5 text-white transition hover:bg-white/15 active:scale-90"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-base font-bold text-white">{track.title}</p>
                <p className="truncate text-xs text-mist-500">{track.artist}</p>
              </div>
              <button
                onClick={() => onToggleFavorite(track)}
                aria-label={isFavorite ? '取消收藏' : '收藏'}
                className={`rounded-full p-2.5 transition active:scale-90 ${
                  isFavorite ? 'bg-pink-500/20 text-pink-400' : 'bg-white/8 text-white hover:bg-white/15'
                }`}
              >
                <Heart size={19} weight={isFavorite ? 'fill' : 'regular'} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center gap-6 pt-6 lg:flex-row lg:justify-center lg:gap-16 lg:pt-2">
              <div className="relative flex shrink-0 items-center justify-center">
                <div
                  className={`animate-spin-slow h-56 w-56 overflow-hidden rounded-full shadow-[0_30px_90px_rgba(139,92,246,0.4)] ring-1 ring-white/20 sm:h-72 sm:w-72 lg:h-80 lg:w-80 ${
                    isPlaying ? '' : ''
                  }`}
                  style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                >
                  <img src={artworkOf(track)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="absolute h-9 w-9 rounded-full border-4 border-white/25 bg-abyss-950 shadow-[0_0_20px_rgba(0,0,0,0.6)]" />
                <div className="absolute h-2 w-2 rounded-full bg-violet-300" />
              </div>

              <div className="flex min-h-0 w-full max-w-md flex-1 flex-col lg:h-full lg:flex-none lg:py-6">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowLyrics(true)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      showLyrics ? 'bg-violet-500/30 text-white' : 'bg-white/6 text-mist-400'
                    }`}
                  >
                    歌词
                  </button>
                  <button
                    onClick={() => setShowLyrics(false)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      !showLyrics ? 'bg-violet-500/30 text-white' : 'bg-white/6 text-mist-400'
                    }`}
                  >
                    封面
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-black/25 px-4 py-3">
                  {showLyrics ? (
                    <div ref={lyricsRef} className="h-full overflow-y-auto">
                      {lines.length > 0 ? (
                        <div className="space-y-3 text-center">
                          {lines.map((line, i) => (
                            <button
                              key={`${i}-${line.time}`}
                              ref={(el) => {
                                itemRefs.current[i] = el
                              }}
                              onClick={() => onSeek(line.time)}
                              className={`block w-full transition-all duration-300 ${
                                i === activeIdx
                                  ? 'scale-[1.04] text-base font-bold text-glow text-cyan-300'
                                  : 'text-sm text-mist-500 hover:text-mist-300'
                              }`}
                            >
                              {line.text || '♪'}
                            </button>
                          ))}
                        </div>
                      ) : plainText ? (
                        <div className="whitespace-pre-line text-center text-sm leading-relaxed text-mist-300">{plainText}</div>
                      ) : fetchState === 'loading' ? (
                        <p className="py-10 text-center text-sm text-mist-500">正在找歌词…</p>
                      ) : fetchState === 'error' ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                          <p className="text-sm text-mist-500">{fetchError}</p>
                          <button onClick={fetchLyrics} className="btn-glow rounded-full px-4 py-2 text-xs font-semibold">
                            再试一次
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                          <p className="text-sm text-mist-500">还没有歌词</p>
                          <button onClick={fetchLyrics} className="btn-glow rounded-full px-4 py-2 text-xs font-semibold">
                            在线搜索歌词
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <img
                        src={artworkOf(track)}
                        alt=""
                        className={`h-52 w-52 rounded-2xl object-cover shadow-2xl ring-1 ring-white/15 sm:h-64 sm:w-64 ${
                          isPlaying ? 'animate-spin-slow' : ''
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <span className="w-9 text-right text-xs tabular-nums text-mist-500">{formatSeconds(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={max}
                  step={0.1}
                  value={Math.min(currentTime, max)}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="w-full"
                  aria-label="播放进度"
                />
                <span className="w-9 text-xs tabular-nums text-mist-500">{formatSeconds(duration || max)}</span>
              </div>

              <div className="relative mt-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setMenu(menu === 'quality' ? null : 'quality')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                      menu === 'quality' ? 'bg-violet-500/30 text-white' : 'bg-white/6 text-mist-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal size={13} />
                    音质 · {QUALITY_LEVELS.find((q) => q.key === quality)?.label || quality}
                  </button>
                  <button
                    onClick={() => setMenu(menu === 'speed' ? null : 'speed')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                      menu === 'speed' ? 'bg-violet-500/30 text-white' : 'bg-white/6 text-mist-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Gauge size={13} />
                    倍速 · {playbackRate}x
                  </button>
                  <button
                    onClick={() => setMenu(menu === 'sleep' ? null : 'sleep')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                      menu === 'sleep' || sleepActive ? 'bg-violet-500/30 text-white' : 'bg-white/6 text-mist-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Timer size={13} />
                    {sleepActive ? `定时 ${sleepText}` : '定时关闭'}
                  </button>
                  {sleepActive && (
                    <button
                      onClick={onCancelSleep}
                      className="flex items-center rounded-full bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/25 active:scale-95"
                    >
                      取消
                    </button>
                  )}
                </div>

                {menu && (
                  <div className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-2xl border border-white/10 bg-abyss-900/95 p-2 shadow-2xl backdrop-blur-xl">
                    {menu === 'quality' && (
                      <>
                        <p className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-wider text-mist-500">音质 · 网易云曲目生效</p>
                        {QUALITY_LEVELS.map((q) => (
                          <button
                            key={q.key}
                            onClick={() => {
                              onQualityChange(q.key)
                              setMenu(null)
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                              quality === q.key ? 'bg-violet-500/20 text-white' : 'text-mist-300 hover:bg-white/8 hover:text-white'
                            }`}
                          >
                            {q.label}
                            {quality === q.key && <span className="text-cyan-300">✓</span>}
                          </button>
                        ))}
                        {track.platform !== 'netease' && (
                          <p className="px-2 pb-1 pt-1 text-[10px] text-mist-700">QQ 曲目暂按默认音质播放</p>
                        )}
                      </>
                    )}
                    {menu === 'speed' && (
                      <>
                        <p className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-wider text-mist-500">播放倍速</p>
                        {SPEEDS.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              onPlaybackRateChange(r)
                              setMenu(null)
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                              playbackRate === r ? 'bg-violet-500/20 text-white' : 'text-mist-300 hover:bg-white/8 hover:text-white'
                            }`}
                          >
                            {r}x
                            {playbackRate === r && <span className="text-cyan-300">✓</span>}
                          </button>
                        ))}
                      </>
                    )}
                    {menu === 'sleep' && (
                      <>
                        <p className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-wider text-mist-500">定时关闭</p>
                        {[10, 20, 30, 60].map((min) => (
                          <button
                            key={min}
                            onClick={() => {
                              onArmSleep(min)
                              setMenu(null)
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-mist-300 transition hover:bg-white/8 hover:text-white"
                          >
                            {min} 分钟
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            onArmSleep(0)
                            setMenu(null)
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-mist-300 transition hover:bg-white/8 hover:text-white"
                        >
                          播完当前歌曲
                        </button>
                        {sleepActive && (
                          <button
                            onClick={() => {
                              onCancelSleep()
                              setMenu(null)
                            }}
                            className="mt-1 flex w-full items-center justify-center rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25"
                          >
                            取消定时
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
                    aria-label={volume > 0 ? '静音' : '恢复音量'}
                    className="rounded-full p-2 text-mist-300 transition hover:bg-white/8 active:scale-90"
                  >
                    {volume > 0 ? <SpeakerHigh size={19} /> : <SpeakerX size={19} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="hidden w-24 sm:block"
                    aria-label="音量"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={onPrev}
                    aria-label="上一首"
                    className="rounded-full p-2 text-white transition hover:bg-white/8 active:scale-90"
                  >
                    <SkipBack size={24} weight="fill" />
                  </button>
                  <button
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? '暂停' : '播放'}
                    className={`btn-glow flex h-16 w-16 items-center justify-center rounded-full ${isPlaying ? 'pulse-ring' : ''}`}
                  >
                    {isPlaying ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" className="ml-0.5" />}
                  </button>
                  <button
                    onClick={onNext}
                    aria-label="下一首"
                    className="rounded-full p-2 text-white transition hover:bg-white/8 active:scale-90"
                  >
                    <SkipForward size={24} weight="fill" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onAddToPlaylist}
                    aria-label="加入歌单"
                    className="rounded-full p-2 text-mist-300 transition hover:bg-white/8 hover:text-white active:scale-90"
                  >
                    <Plus size={20} weight="bold" />
                  </button>
                  <button
                    onClick={() => {
                      const idx = EFFECT_MODES.findIndex((m) => m.key === effectMode)
                      onEffectModeChange(EFFECT_MODES[(idx + 1) % EFFECT_MODES.length].key)
                    }}
                    aria-label="切换播放特效"
                    className="flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-2 text-xs font-semibold text-mist-300 transition hover:bg-white/10 hover:text-white active:scale-95"
                  >
                    <SparkleIcon className="h-3.5 w-3.5 text-gold-300" />
                    <span className="hidden sm:inline">{currentMode.label}</span>
                  </button>
                  <button
                    onClick={() => setShowLyrics((v) => !v)}
                    aria-label="显示歌词"
                    className="rounded-full p-2 text-mist-300 transition hover:bg-white/8 hover:text-white active:scale-90 sm:hidden"
                  >
                    <TextAa size={19} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
