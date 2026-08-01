import { Heart, Pause, Play } from '@phosphor-icons/react'
import { formatMs } from '../lib/format'

export function Equalizer({ active }) {
  return (
    <span className={`flex h-4 items-end justify-center gap-0.5 ${active ? 'text-accent-400' : 'text-ink-700'}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="eq-bar w-1 rounded-sm bg-current"
          style={{ height: '100%', animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  )
}

export default function TrackRow({ track, index, isActive, isPlaying, isFavorite, onPlay, onToggleFavorite }) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition sm:gap-4 ${
        isActive ? 'bg-ink-850' : 'hover:bg-ink-850/70'
      }`}
    >
      <div className="hidden w-6 shrink-0 text-center text-sm tabular-nums text-cream-400/60 sm:block">
        {isActive ? <Equalizer active={isPlaying} /> : index + 1}
      </div>
      <img src={track.artwork} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover sm:h-12 sm:w-12" />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isActive ? 'text-accent-300' : 'text-cream-50'}`}>{track.title}</p>
        <p className="truncate text-xs text-cream-400">{track.artist}</p>
      </div>
      <p className="hidden w-44 shrink-0 truncate text-sm text-cream-400/70 md:block">{track.album || '—'}</p>
      <button
        onClick={() => onToggleFavorite(track)}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
        className={`shrink-0 rounded-lg p-2 transition active:scale-90 ${
          isFavorite
            ? 'text-accent-400'
            : 'text-cream-400/60 hover:text-cream-200 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'
        }`}
      >
        <Heart size={18} weight={isFavorite ? 'fill' : 'regular'} />
      </button>
      <button
        onClick={() => onPlay(track)}
        aria-label={isActive && isPlaying ? '暂停' : '播放'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-50 text-ink-950 transition hover:bg-accent-400 active:scale-90"
      >
        {isActive && isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
      </button>
      <p className="hidden w-12 shrink-0 text-right text-sm tabular-nums text-cream-400/60 md:block">
        {formatMs(track.durationMs)}
      </p>
    </div>
  )
}
