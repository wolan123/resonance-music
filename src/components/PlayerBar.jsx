import { useEffect, useState } from 'react'
import {
  Heart,
  List,
  MusicNotes,
  Pause,
  Play,
  SkipForward,
  TextAa,
} from '@phosphor-icons/react'
import { formatSeconds } from '../lib/format'
import { artworkOf } from '../lib/api'
import { EFFECT_MODES } from '../lib/effects'
import { SparkleIcon } from './LightIcons'

export default function PlayerBar({
  track,
  isPlaying,
  currentTime,
  onTogglePlay,
  onNext,
  onToggleFavorite,
  isFavorite,
  audio,
  onOpenPlayer,
  onOpenQueue,
  hasLyrics,
  visualizerOn,
  onToggleVisualizer,
  effectMode,
  onEffectModeChange,
}) {
  const [duration, setDuration] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

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

  if (!track) {
    return (
      <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-1 sm:px-6 lg:bottom-0 lg:left-60 lg:px-8">
        <div className="glass-strong mx-auto flex max-w-6xl items-center gap-2 rounded-[1.3rem] px-4 py-3">
          <MusicNotes size={17} className="text-violet-400" />
          <p className="text-sm text-mist-500">点一首歌，让光响起来</p>
          <SparkleIcon className="ml-auto h-4 w-4 text-cyan-300 animate-twinkle" />
        </div>
      </div>
    )
  }

  const max = duration > 0 ? duration : Math.max(30, (track.durationMs || 0) / 1000)
  const currentMode = EFFECT_MODES.find((m) => m.key === effectMode) || EFFECT_MODES[0]

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-1 sm:px-6 lg:bottom-0 lg:left-60 lg:px-8">
      <div className="glass-strong mx-auto max-w-6xl rounded-[1.3rem] px-3 py-2.5 shadow-[0_16px_50px_rgba(139,92,246,0.2)] sm:px-4">
        <div className="flex items-center gap-3">
          <button onClick={onOpenPlayer} aria-label="打开播放页" className="group relative shrink-0">
            <img
              src={artworkOf(track)}
              alt=""
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/15 transition group-hover:scale-[1.03]"
            />
            {isPlaying && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
          </button>

          <button onClick={onOpenPlayer} className="min-w-0 flex-1 text-left">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
              {track.title}
              {hasLyrics && (
                <span className="shrink-0 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">词</span>
              )}
            </p>
            <p className="truncate text-xs text-mist-500">{track.artist || '未知歌手'}</p>
          </button>

          <div className="hidden w-28 shrink-0 items-center gap-2 lg:flex">
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-mist-500">{formatSeconds(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={max}
              step={0.1}
              value={Math.min(currentTime, max)}
              onChange={(e) => {
                try {
                  audio.currentTime = Number(e.target.value)
                } catch {
                  /* ignore */
                }
              }}
              className="w-full"
              aria-label="播放进度"
            />
            <span className="w-9 text-xs tabular-nums text-mist-500">{formatSeconds(duration || max)}</span>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => onToggleFavorite(track)}
              aria-label={isFavorite ? '取消收藏' : '收藏'}
              className={`rounded-full p-2 transition active:scale-90 ${
                isFavorite ? 'text-pink-400' : 'text-mist-400 hover:text-white'
              }`}
            >
              <Heart size={18} weight={isFavorite ? 'fill' : 'regular'} />
            </button>
            <button
              onClick={onTogglePlay}
              aria-label={isPlaying ? '暂停' : '播放'}
              className={`btn-glow flex h-9 w-9 items-center justify-center rounded-full ${isPlaying ? 'pulse-ring' : ''}`}
            >
              {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
            </button>
            <button
              onClick={onNext}
              aria-label="下一首"
              className="rounded-full p-2 text-mist-300 transition hover:bg-white/8 hover:text-white active:scale-90"
            >
              <SkipForward size={17} weight="fill" />
            </button>
            <button
              onClick={onOpenPlayer}
              aria-label="查看歌词"
              className="hidden rounded-full p-2 text-mist-300 transition hover:bg-white/8 hover:text-white active:scale-90 sm:block"
            >
              <TextAa size={17} weight="bold" />
            </button>
            <button
              onClick={onOpenQueue}
              aria-label="播放队列"
              className="hidden rounded-full p-2 text-mist-300 transition hover:bg-white/8 hover:text-white active:scale-90 sm:block"
            >
              <List size={17} weight="bold" />
            </button>
            <button
              onClick={onToggleVisualizer}
              aria-pressed={visualizerOn}
              aria-label="沉浸光效开关"
              className={`hidden rounded-full p-2 transition active:scale-90 md:block ${
                visualizerOn ? 'text-cyan-300' : 'text-mist-500 hover:text-white'
              }`}
            >
              <SparkleIcon className="h-4 w-4" />
            </button>

            <div className="relative hidden md:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="播放特效"
                className="flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-2 text-xs font-semibold text-mist-300 transition hover:bg-white/10 active:scale-95"
              >
                <SparkleIcon className="h-3.5 w-3.5 text-gold-300" />
                {currentMode.label}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="glass-strong absolute bottom-full right-0 z-50 mb-2 w-44 rounded-2xl p-1.5 shadow-2xl">
                    <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-mist-700">播放特效</p>
                    {EFFECT_MODES.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => {
                          onEffectModeChange(m.key)
                          setMenuOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                          effectMode === m.key ? 'bg-gradient-to-r from-violet-500/30 to-cyan-500/30 text-white' : 'text-mist-300 hover:bg-white/8'
                        }`}
                      >
                        <span className="font-semibold">{m.label}</span>
                        <span className="text-[10px] text-mist-500">{m.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
