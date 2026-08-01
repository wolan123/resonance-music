import { Heart, Pause, Play, Trash } from '@phosphor-icons/react'
import { formatMs } from '../lib/format'
import { artworkOf } from '../lib/api'

export function Equalizer({ active }) {
  return (
    <span className={`flex h-4 items-end justify-center gap-0.5 ${active ? 'text-cyan-400' : 'text-mist-700'}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="eq-bar w-1 rounded-sm bg-current" style={{ height: '100%', animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  )
}

export default function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  isFavorite,
  hasLyrics = false,
  onPlay,
  onToggleFavorite,
  onDelete,
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition sm:gap-4 ${
        isActive ? 'glass-strong' : 'hover:bg-white/[0.04]'
      }`}
    >
      <div className="hidden w-7 shrink-0 text-center text-sm tabular-nums text-mist-700 sm:block">
        {isActive ? <Equalizer active={isPlaying} /> : index + 1}
      </div>
      <img
        src={artworkOf(track)}
        alt=""
        loading="lazy"
        className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-white/10 sm:h-12 sm:w-12"
      />
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1.5 truncate text-sm font-semibold ${isActive ? 'text-glow text-cyan-300' : 'text-mist-100'}`}>
          {track.title}
          {hasLyrics && (
            <span className="hidden shrink-0 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300 sm:inline-flex">
              词
            </span>
          )}
        </p>
        <p className="truncate text-xs text-mist-500">
          {track.artist || '未知歌手'}
          {track.uploader && <span className="ml-1.5 text-mist-700">· {track.uploader} 上传</span>}
        </p>
      </div>
      <p className="hidden w-40 shrink-0 truncate text-sm text-mist-700 md:block">{track.album || '—'}</p>
      <button
        onClick={() => onToggleFavorite(track)}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
        className={`shrink-0 rounded-lg p-2 transition active:scale-90 ${
          isFavorite
            ? 'text-pink-400'
            : 'text-mist-700 hover:text-pink-400 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'
        }`}
      >
        <Heart size={18} weight={isFavorite ? 'fill' : 'regular'} />
      </button>
      <button
        onClick={() => onPlay(track)}
        aria-label={isActive && isPlaying ? '暂停' : '播放'}
        className={`btn-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isActive && isPlaying ? 'pulse-ring' : ''}`}
      >
        {isActive && isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
      </button>
      {onDelete && (
        <button
          onClick={() => onDelete(track)}
          aria-label={`删除 ${track.title}`}
          className="shrink-0 rounded-lg p-2 text-mist-700 opacity-0 transition hover:text-pink-400 group-hover:opacity-100 focus-visible:opacity-100 active:scale-90"
        >
          <Trash size={17} />
        </button>
      )}
      <p className="hidden w-12 shrink-0 text-right text-sm tabular-nums text-mist-700 md:block">
        {formatMs(track.durationMs)}
      </p>
    </div>
  )
}
