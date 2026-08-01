import { useEffect, useState } from 'react'
import { Heart, MusicNotes, Pause, Play, SkipBack, SkipForward, SpeakerHigh, SpeakerX } from '@phosphor-icons/react'
import { formatSeconds } from '../lib/format'

export default function PlayerBar({
  track,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleFavorite,
  isFavorite,
  audio,
  volume,
  onVolumeChange,
}) {
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const el = audio
    const onTime = () => setCurrent(el.currentTime || 0)
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0)
    const onReset = () => {
      setCurrent(0)
      setDuration(0)
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('loadstart', onReset)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('loadstart', onReset)
    }
  }, [audio])

  if (!track) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink-900/95 px-5 py-4 backdrop-blur lg:left-72">
        <p className="flex items-center gap-2 text-sm text-cream-400/70">
          <MusicNotes size={16} />
          搜索或点击任意歌曲开始播放
        </p>
      </div>
    )
  }

  const max = duration > 0 ? duration : Math.max(30, (track.durationMs || 0) / 1000)

  function seek(value) {
    setCurrent(value)
    try {
      audio.currentTime = value
    } catch {
      /* not seekable yet */
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink-900/95 px-4 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-3 backdrop-blur lg:left-72 lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-center gap-3 lg:w-72 lg:shrink-0">
          <img src={track.artwork} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{track.title}</p>
            <p className="truncate text-xs text-cream-400">{track.artist}</p>
          </div>
          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? '取消收藏' : '收藏'}
            className={`shrink-0 rounded-lg p-2 transition active:scale-90 ${
              isFavorite ? 'text-accent-400' : 'text-cream-400/60 hover:text-cream-200'
            }`}
          >
            <Heart size={18} weight={isFavorite ? 'fill' : 'regular'} />
          </button>
        </div>

        <div className="flex flex-1 items-center gap-3 lg:justify-center">
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onPrev}
              aria-label="上一首"
              className="rounded-full p-2 text-cream-200 transition hover:bg-ink-800 hover:text-cream-50 active:scale-90"
            >
              <SkipBack size={18} weight="fill" />
            </button>
            <button
              onClick={onTogglePlay}
              aria-label={isPlaying ? '暂停' : '播放'}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-50 text-ink-950 transition hover:bg-accent-400 active:scale-90"
            >
              {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            </button>
            <button
              onClick={onNext}
              aria-label="下一首"
              className="rounded-full p-2 text-cream-200 transition hover:bg-ink-800 hover:text-cream-50 active:scale-90"
            >
              <SkipForward size={18} weight="fill" />
            </button>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-cream-400/70">{formatSeconds(current)}</span>
            <input
              type="range"
              min={0}
              max={max}
              step={0.1}
              value={Math.min(current, max)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full"
              aria-label="播放进度"
            />
            <span className="w-9 shrink-0 text-xs tabular-nums text-cream-400/70">{formatSeconds(duration || max)}</span>
          </div>
        </div>

        <div className="hidden w-40 shrink-0 items-center gap-2 lg:flex">
          <button
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
            aria-label={volume > 0 ? '静音' : '恢复音量'}
            className="rounded-full p-2 text-cream-200 transition hover:bg-ink-800 hover:text-cream-50 active:scale-90"
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
            className="w-full"
            aria-label="音量"
          />
        </div>
      </div>
    </div>
  )
}
