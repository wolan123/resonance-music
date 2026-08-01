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
import { SparkleIcon } from './KleeIcons'

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
}) {
  const [duration, setDuration] = useState(0)

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
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 sm:px-5 lg:left-72 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2 rounded-[1.8rem] border border-skin-200 bg-white/95 px-5 py-4 shadow-[0_16px_45px_rgba(229,72,77,0.14)] backdrop-blur">
          <MusicNotes size={17} className="text-klee-500" />
          <p className="text-sm text-cocoa-400">搜索或点击一首歌开始播放吧~</p>
          <SparkleIcon className="ml-auto h-4 w-4 text-gold-400 animate-twinkle" />
        </div>
      </div>
    )
  }

  const max = duration > 0 ? duration : Math.max(30, (track.durationMs || 0) / 1000)

  function seek(value) {
    try {
      audio.currentTime = value
    } catch {
      /* not seekable yet */
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 sm:px-5 lg:left-72 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[1.8rem] border border-skin-200 bg-white/95 px-4 py-3 shadow-[0_16px_45px_rgba(229,72,77,0.16)] backdrop-blur sm:px-6">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-center gap-3 lg:w-72 lg:shrink-0">
            <img src={artworkOf(track)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-skin-200" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-cocoa-900">
                {track.title}
                {hasLyrics && <span className="shrink-0 rounded-full bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold text-cocoa-700">词</span>}
              </p>
              <p className="truncate text-xs text-cocoa-400">{track.artist || '未知歌手'}</p>
            </div>
            <button
              onClick={() => onToggleFavorite(track)}
              aria-label={isFavorite ? '取消收藏' : '收藏'}
              className={`shrink-0 rounded-lg p-2 transition active:scale-90 ${
                isFavorite ? 'text-klee-500' : 'text-cocoa-300 hover:text-klee-500'
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
                className="rounded-full p-2 text-cocoa-700 transition hover:bg-skin-100 active:scale-90"
              >
                <SkipBack size={18} weight="fill" />
              </button>
              <button
                onClick={onTogglePlay}
                aria-label={isPlaying ? '暂停' : '播放'}
                className={`btn-boom flex h-10 w-10 items-center justify-center rounded-full ${isPlaying ? 'glow-pulse' : ''}`}
              >
                {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
              </button>
              <button
                onClick={onNext}
                aria-label="下一首"
                className="rounded-full p-2 text-cocoa-700 transition hover:bg-skin-100 active:scale-90"
              >
                <SkipForward size={18} weight="fill" />
              </button>
            </div>
            <div className="flex w-full items-center gap-2">
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-cocoa-400">{formatSeconds(currentTime)}</span>
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
              <span className="w-9 shrink-0 text-xs tabular-nums text-cocoa-400">{formatSeconds(duration || max)}</span>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              aria-label={volume > 0 ? '静音' : '恢复音量'}
              className="rounded-full p-2 text-cocoa-700 transition hover:bg-skin-100 active:scale-90"
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
                hasLyrics ? 'bg-gold-100 text-cocoa-700 hover:bg-gold-200' : 'bg-skin-100 text-cocoa-700 hover:bg-skin-200'
              }`}
            >
              <TextAa size={15} weight="bold" />
              歌词
            </button>
            <button
              onClick={onToggleVisualizer}
              aria-pressed={visualizerOn}
              aria-label="光效开关"
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                visualizerOn ? 'bg-klee-500 text-white' : 'bg-skin-100 text-cocoa-700 hover:bg-skin-200'
              }`}
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              光效
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
