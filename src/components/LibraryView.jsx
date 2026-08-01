import { FileAudio, MagnifyingGlass, MusicNotes } from '@phosphor-icons/react'
import UploadZone from './UploadZone'
import TrackRow from './TrackRow'
import { SkeletonRows } from './Skeleton'
import { BombIcon, SparkleIcon } from './KleeIcons'

export default function LibraryView({
  tracks,
  loading,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onPlay,
  onToggleFavorite,
  onDelete,
  uploading,
  onFiles,
  filter,
  onFilterChange,
}) {
  const q = filter.trim().toLowerCase()
  const shown = q
    ? tracks.filter((t) => `${t.title} ${t.artist} ${t.album} ${t.fileName}`.toLowerCase().includes(q))
    : tracks

  return (
    <section className="pt-6 lg:pt-10">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-cocoa-900 lg:text-3xl">我的音乐</h1>
        <SparkleIcon className="h-5 w-5 text-gold-400 animate-twinkle" />
        {tracks.length > 0 && (
          <span className="ml-1 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-bold text-cocoa-700">{tracks.length}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-cocoa-400">把喜欢的歌装进蹦蹦背包，随时听、随时看歌词</p>

      <div className="mt-5">
        <UploadZone onFiles={onFiles} busy={uploading.active} current={uploading.current} />
      </div>

      {uploading.active && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-skin-50 px-4 py-3 text-sm text-cocoa-700">
          <FileAudio size={18} className="animate-bob text-klee-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate">{uploading.current || '整理中…'}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-klee-400 to-gold-400 transition-all duration-300"
                style={{ width: `${uploading.total ? Math.round((uploading.done / uploading.total) * 100) : 8}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-cocoa-400">
            {uploading.done}/{uploading.total}
          </span>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="relative mt-5 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cocoa-300" />
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="在音乐库中搜索…"
            aria-label="在音乐库中搜索"
            className="w-full rounded-full border border-skin-200 bg-white py-2.5 pl-10 pr-4 text-sm text-cocoa-900 placeholder:text-cocoa-300 transition focus:border-klee-400 focus:outline-none"
          />
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <SkeletonRows count={6} />
        ) : tracks.length === 0 ? (
          <div className="card-klee flex flex-col items-center gap-3 rounded-[2rem] p-12 text-center">
            <BombIcon className="h-16 w-16 animate-bob" />
            <p className="font-display text-xl font-bold text-cocoa-900">蹦蹦背包还空空的</p>
            <p className="max-w-sm text-sm leading-relaxed text-cocoa-400">
              把你的音乐拖进上面的框框，或者点一下选择文件。马上就能听啦！
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="card-klee flex flex-col items-center gap-2 rounded-[2rem] p-10 text-center">
            <MusicNotes size={30} className="text-skin-300" />
            <p className="text-sm text-cocoa-400">没有找到匹配的歌</p>
          </div>
        ) : (
          <div className="card-klee rounded-[1.8rem] p-2">
            {shown.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isActive={currentTrack?.id === track.id}
                isPlaying={isPlaying && currentTrack?.id === track.id}
                isFavorite={isFav(track)}
                hasLyrics={hasLyrics(track)}
                onPlay={(t) => onPlay(t, shown)}
                onToggleFavorite={onToggleFavorite}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
