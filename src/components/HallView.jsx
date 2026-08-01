import { ArrowClockwise, MagnifyingGlass, MusicNotes, WarningCircle, Waveform } from '@phosphor-icons/react'
import TrackRow from './TrackRow'
import { SkeletonRows } from './Skeleton'

export default function HallView({
  songs,
  loading,
  error,
  onRetry,
  filter,
  onFilterChange,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onPlay,
  onToggleFavorite,
  onDelete,
}) {
  const q = filter.trim().toLowerCase()
  const shown = q
    ? songs.filter((s) => `${s.title} ${s.artist} ${s.album} ${s.uploader}`.toLowerCase().includes(q))
    : songs
  const uploaders = new Set(songs.map((s) => s.uploader).filter(Boolean)).size

  return (
    <section className="pt-8 lg:pt-14">
      <div className="glass relative overflow-hidden rounded-[2rem] p-8 lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
          <Waveform size={13} weight="fill" />
          共享音乐站 · 人人可听
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          让每首歌
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-pink-400 bg-clip-text text-transparent text-glow">
            都有一片光
          </span>
        </h1>
        <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-mist-500 sm:text-base">
          上传你的音乐，全世界都能听到。沉浸光效会跟着每一拍呼吸。
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-mist-500">
          <span className="rounded-lg bg-white/6 px-2.5 py-1">{songs.length} 首歌</span>
          <span className="rounded-lg bg-white/6 px-2.5 py-1">{uploaders} 位上传者</span>
        </div>
      </div>

      {songs.length > 0 && (
        <div className="relative mt-6 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="搜索歌曲、歌手、上传者…"
            aria-label="搜索歌曲"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-mist-700 backdrop-blur transition focus:border-violet-400/60 focus:outline-none"
          />
        </div>
      )}

      <div className="mt-5">
        {loading ? (
          <SkeletonRows count={8} />
        ) : error ? (
          <div className="glass flex flex-col items-start gap-4 rounded-[2rem] p-8">
            <WarningCircle size={26} className="text-violet-400" />
            <p className="text-sm text-mist-500">{error}</p>
            <button onClick={onRetry} className="btn-glow flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold">
              <ArrowClockwise size={14} />
              重试
            </button>
          </div>
        ) : songs.length === 0 ? (
          <div className="glass flex flex-col items-center gap-4 rounded-[2rem] p-12 text-center">
            <MusicNotes size={36} className="text-violet-400/70" />
            <p className="text-lg font-semibold text-white">这里还没有歌</p>
            <p className="max-w-sm text-sm leading-relaxed text-mist-500">去「上传」把第一首歌放进来，让光响起来吧。</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="glass rounded-[2rem] p-10 text-center text-sm text-mist-500">没有找到匹配的歌</div>
        ) : (
          <div className="glass rounded-[1.8rem] p-2">
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
