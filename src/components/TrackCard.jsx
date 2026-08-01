import { Heart, Pause, Play } from '@phosphor-icons/react'

export default function TrackCard({ track, index, isActive, isPlaying, isFavorite, onPlay, onToggleFavorite }) {
  return (
    <div className="group animate-fade-up" style={{ '--i': index % 12 }}>
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={track.artwork}
          alt={`${track.title} 封面`}
          loading="lazy"
          className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <button
          onClick={() => onPlay(track)}
          aria-label={`${isActive && isPlaying ? '暂停' : '播放'} ${track.title}`}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-500 text-ink-950 opacity-100 shadow-lg transition hover:bg-accent-400 active:scale-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          {isActive && isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
        </button>
        <button
          onClick={() => onToggleFavorite(track)}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
          className={`absolute right-3 top-3 rounded-full bg-ink-950/40 p-2 text-cream-50 backdrop-blur transition active:scale-90 ${
            isFavorite
              ? 'bg-ink-950/70 text-accent-400'
              : 'hover:bg-ink-950/70 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'
          }`}
        >
          <Heart size={16} weight={isFavorite ? 'fill' : 'regular'} />
        </button>
      </div>
      <div className="mt-3">
        <p className={`truncate text-sm font-medium ${isActive ? 'text-accent-300' : 'text-cream-50'}`}>{track.title}</p>
        <p className="truncate text-xs text-cream-400">{track.artist}</p>
      </div>
    </div>
  )
}
