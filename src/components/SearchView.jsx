import { ArrowClockwise, MusicNotes, WarningCircle } from '@phosphor-icons/react'
import SearchBar from './SearchBar'
import TrackRow from './TrackRow'
import { SkeletonRows } from './Skeleton'
import { SparkleIcon } from './KleeIcons'

export default function SearchView({
  query,
  searching,
  error,
  results,
  onSearch,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onPlay,
  onToggleFavorite,
}) {
  return (
    <section className="pt-6 lg:pt-10">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-cocoa-900 lg:text-3xl">在线搜索</h1>
        <SparkleIcon className="h-5 w-5 text-gold-400 animate-twinkle" />
      </div>
      <p className="mt-1 text-sm text-cocoa-400">搜一搜想听的歌，在线试听 30 秒片段</p>

      <div className="mt-5 max-w-2xl">
        <SearchBar onSearch={onSearch} loading={searching} />
      </div>

      {searching ? (
        <div className="mt-6">
          <SkeletonRows count={8} />
        </div>
      ) : error ? (
        <div className="card-klee mt-6 flex flex-col items-start gap-3 rounded-[2rem] p-8">
          <WarningCircle size={26} className="text-klee-500" />
          <p className="text-sm text-cocoa-700">{error}</p>
          <button
            onClick={() => onSearch(query)}
            className="btn-boom flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
          >
            <ArrowClockwise size={14} />
            重试
          </button>
        </div>
      ) : query ? (
        <div className="mt-6">
          <p aria-live="polite" className="text-sm text-cocoa-400">
            “{query}” 找到 {results.length} 首
          </p>
          {results.length === 0 ? (
            <div className="card-klee mt-3 flex flex-col items-center gap-2 rounded-[2rem] p-10 text-center">
              <MusicNotes size={30} className="text-skin-300" />
              <p className="text-sm text-cocoa-400">没有找到相关音乐，换个关键词试试</p>
            </div>
          ) : (
            <div className="card-klee mt-3 rounded-[1.8rem] p-2">
              {results.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  isActive={currentTrack?.id === track.id}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  isFavorite={isFav(track)}
                  hasLyrics={hasLyrics(track)}
                  onPlay={(t) => onPlay(t, results)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-10 text-center text-cocoa-400">
          <MusicNotes size={34} className="mx-auto text-skin-300" />
          <p className="mt-2 text-sm">输入关键词，开始搜索吧~</p>
        </div>
      )}
    </section>
  )
}
