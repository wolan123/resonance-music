import { useEffect, useState } from 'react'
import {
  Heart,
  MusicNotes,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerX,
  TextAa,
} from '@phosphor-icons/react'
import { formatSeconds } from '../lib/format'
import { artworkOf } from '../lib/api'
import { SparkleIcon } from './LightIcons'

export const EFFECT_MODES = [
  { key: 'dynamic', label: '动感', hint: '炫彩频谱 + 光轮' },
  { key: 'aurora', label: '极光', hint: '流动极光 + 光点' },
  { key: 'pulse', label: '脉冲', hint: '随节拍扩散的光环' },
]

export default function PlayerBar({
  track,
  isPlaying,
  currentTime,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleFavorite,
  isFavorite,
  audio,
  volume,
  onVolumeChange,
  onOpenLyrics,
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
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 sm:px-6">
        <div className="glass-strong mx-auto flex max-w-6xl items-center gap-2 rounded-[1.5rem] px-5 py-4">
          <MusicNotes size={17} className="text-violet-400" />
          <p className="text-sm text-mist-500">点一首歌，让光响起来</p>
          <SparkleIcon className="ml-auto h-4 w-4 text-cyan-300 animate-twinkle" />
        </div>
      </div>
    )
  }

  const max = duration > 0 ? duration : Math.max(30, (track.durationMs || 0) / 1000)
  const currentMode = EFFECT_MODES.find((m) => m.key === effectMode) || EFFECT_MODES[0]

  function seek(value) {
    try {
      audio.currentTime = value
    } catch {
      /* not seekable yet */
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 sm:px-6">
      <div className="glass-strong mx-auto max-w-6xl rounded-[1.5rem] px-4 py-3 shadow-[0_20px_60px_rgba(139,92,246,0.18)] sm:px-6">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-center gap-3 lg:w-72 lg:shrink-0">
            <img src={artworkOf(track)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/15" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                {track.title}
                {hasLyrics && (
                  <span className="shrink-0 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">词</span>
                )}
              </p>
              <p className="truncate text-xs text-mist-500">{track.artist || '未知歌手'}</p>
            </div>
            <button
              onClick={() => onToggleFavorite(track)}
              aria-label={isFavorite ? '取消收藏' : '收藏'}
              className={`shrink-0 rounded-lg p-2 transition active:scale-90 ${
                isFavorite ? 'text-pink-400' : 'text-mist-700 hover:text-pink-400'
              }`}
            >
              <Heart size={19} weight={isFavorite ? 'fill' : 'regular'} />
            </button>
          </div>

          <div className="flex flex-1 items-center gap-3 lg:justify-center">
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={onPrev}
                aria-label="上一首"
                className="rounded-full p-2 text-mist-300 transition hover:bg-white/8 active:scale-90"
              >
                <SkipBack size={18} weight="fill" />
              </button>
              <button
                onClick={onTogglePlay}
                aria-label={isPlaying ? '暂停' : '播放'}
                className={`btn-glow flex h-10 w-10 items-center justify-center rounded-full ${isPlaying ? 'pulse-ring' : ''}`}
              >
                {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
              </button>
              <button
                onClick={onNext}
                aria-label="下一首"
                className="rounded-full p-2 text-mist-300 transition hover:bg-white/8 active:scale-90"
              >
                <SkipForward size={18} weight="fill" />
              </button>
            </div>
            <div className="flex w-full items-center gap-2">
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-mist-500">{formatSeconds(currentTime)}</span>
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
              <span className="w-9 shrink-0 text-xs tabular-nums text-mist-500">{formatSeconds(duration || max)}</span>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              aria-label={volume > 0 ? '静音' : '恢复音量'}
              className="rounded-full p-2 text-mist-300 transition hover:bg-white/8 active:scale-90"
            >
              {volume > 0 ? <SpeakerHigh size={18} /> : <SpeakerX size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-24"
              aria-label="音量"
            />
            <button
              onClick={onOpenLyrics}
              aria-label="查看歌词"
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                hasLyrics ? 'bg-violet-500/25 text-violet-200 hover:bg-violet-500/35' : 'bg-white/6 text-mist-300 hover:bg-white/10'
              }`}
            >
              <TextAa size={15} weight="bold" />
              歌词
            </button>
            <button
              onClick={onToggleVisualizer}
              aria-pressed={visualizerOn}
              aria-label="沉浸光效开关"
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                visualizerOn ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'bg-white/6 text-mist-300 hover:bg-white/10'
              }`}
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              光效
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="播放特效"
                className="flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2 text-xs font-semibold text-mist-300 transition hover:bg-white/10 active:scale-95"
              >
                <SparkleIcon className="h-3.5 w-3.5 text-gold-300" />
                特效 {currentMode.label}
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
