import { Heart, MusicNotes } from '@phosphor-icons/react'
import TrackRow from './TrackRow'
import { SparkleIcon } from './KleeIcons'

export default function FavoritesView({
  tracks,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onPlay,
  onToggleFavorite,
  onGoLibrary,
}) {
  return (
    <section className="pt-6 lg:pt-10">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-cocoa-900 lg:text-3xl">我的收藏</h1>
        <SparkleIcon className="h-5 w-5 text-gold-400 animate-twinkle" />
        {tracks.length > 0 && (
          <span className="ml-1 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-bold text-cocoa-700">{tracks.length}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-cocoa-400">点一下心形，把喜欢的歌都收进来</p>

      {tracks.length === 0 ? (
        <div className="card-klee mt-6 flex flex-col items-center gap-3 rounded-[2rem] p-12 text-center">
          <Heart size={40} className="text-skin-300" />
          <p className="font-display text-xl font-bold text-cocoa-900">还没有收藏</p>
          <p className="max-w-sm text-sm leading-relaxed text-cocoa-400">听歌的时候点一下心形，喜欢的歌就会出现在这里</p>
          <button onClick={onGoLibrary} className="btn-boom rounded-full px-5 py-2.5 text-sm font-semibold">
            去听歌
          </button>
        </div>
      ) : (
        <div className="card-klee mt-6 rounded-[1.8rem] p-2">
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
