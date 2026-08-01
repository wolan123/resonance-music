import { Heart } from '@phosphor-icons/react'
import TrackRow from './TrackRow'

export default function FavoritesView({
  tracks,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onPlay,
  onToggleFavorite,
  onGoHall,
}) {
  return (
    <section className="pt-8 lg:pt-14">
      <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">我的收藏</h1>
      <p className="mt-1 text-sm text-mist-500">点一下心形，把喜欢的歌都收进来</p>

      {tracks.length === 0 ? (
        <div className="glass mt-6 flex flex-col items-center gap-4 rounded-[2rem] p-12 text-center">
          <Heart size={38} className="text-pink-400/70" />
          <p className="text-lg font-semibold text-white">还没有收藏</p>
          <p className="max-w-sm text-sm leading-relaxed text-mist-500">去音乐大厅听听，遇到喜欢的歌点亮心形</p>
          <button onClick={onGoHall} className="btn-glow rounded-full px-5 py-2.5 text-sm font-semibold">
            去音乐大厅
          </button>
        </div>
      ) : (
        <div className="glass mt-6 rounded-[1.8rem] p-2">
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              isActive={currentTrack?.id === track.id}
              isPlaying={isPlaying && currentTrack?.id === track.id}
              isFavorite
              hasLyrics={hasLyrics(track)}
              onPlay={(t) => onPlay(t, tracks)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  )
}
