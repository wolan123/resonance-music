import { ArrowLeft, Play, Plus, Trash } from '@phosphor-icons/react'
import TrackRow from './TrackRow'
import PlaylistCover from './PlaylistCover'
import SongPickerModal from './SongPickerModal'
import { formatPlays } from '../lib/format'

export default function PlaylistDetailView({
  playlist,
  songs,
  user,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onBack,
  onPlayAll,
  onPlay,
  onToggleFavorite,
  onAddToPlaylist,
  onRemoveTrack,
  onDeletePlaylist,
  pickerOpen,
  onTogglePicker,
  onToggleSong,
}) {
  if (!playlist) return null
  const tracks = (playlist.trackIds || [])
    .map((id) => songs.find((s) => s.id === id))
    .filter(Boolean)
  const isOwner = !!user && playlist.creatorId === user.id

  return (
    <section className="pt-6 lg:pt-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-mist-500 transition hover:text-white">
        <ArrowLeft size={16} />
        返回歌单
      </button>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end">
        <PlaylistCover playlist={playlist} songs={songs} className="h-40 w-40 shrink-0 rounded-2xl shadow-2xl sm:h-48 sm:w-48" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{playlist.name}</h1>
          {playlist.description && <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist-500">{playlist.description}</p>}
          <p className="mt-2 text-xs text-mist-500">
            {playlist.creatorName} 创建 · {tracks.length} 首
            {playlist.playCount > 0 && ` · ${formatPlays(playlist.playCount)}次播放`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onPlayAll(tracks)}
              disabled={!tracks.length}
              className="btn-glow flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <Play size={15} weight="fill" />
              播放全部
            </button>
            {isOwner && (
              <>
                <button
                  onClick={onTogglePicker}
                  className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-mist-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Plus size={15} weight="bold" />
                  添加歌曲
                </button>
                <button
                  onClick={onDeletePlaylist}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-mist-500 transition hover:border-pink-400/40 hover:text-pink-400"
                >
                  <Trash size={15} />
                  删除歌单
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="glass mt-6 rounded-[1.6rem] p-2">
        {tracks.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-mist-500">
            {isOwner ? '歌单还是空的，点「添加歌曲」把歌装进来' : '这个歌单还没有歌'}
          </p>
        ) : (
          tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              isActive={currentTrack?.id === track.id}
              isPlaying={isPlaying && currentTrack?.id === track.id}
              isFavorite={isFav(track)}
              hasLyrics={hasLyrics(track)}
              onPlay={(t) => onPlay(t, tracks)}
              onToggleFavorite={onToggleFavorite}
              onAddToPlaylist={onAddToPlaylist}
              onDelete={isOwner ? (t) => onRemoveTrack(t.id) : undefined}
            />
          ))
        )}
      </div>

      <SongPickerModal
        open={pickerOpen}
        songs={songs}
        playlist={playlist}
        onClose={onTogglePicker}
        onToggle={onToggleSong}
      />
    </section>
  )
}
