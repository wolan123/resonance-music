import { useMemo, useState } from 'react'
import { CaretRight, Play, Trophy } from '@phosphor-icons/react'
import TrackRow from './TrackRow'
import PlaylistCover from './PlaylistCover'
import { SkeletonRows } from './Skeleton'
import { artworkOf } from '../lib/api'
import { formatPlays } from '../lib/format'

const HUES = [265, 190, 320, 220]

export default function DiscoverView({
  songs,
  playlists,
  loading,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onPlay,
  onToggleFavorite,
  onAddToPlaylist,
  onOpenPlaylist,
  onGoPlaylists,
  onGoRankings,
}) {
  const [bannerIdx, setBannerIdx] = useState(0)

  const banners = useMemo(() => {
    const fromPlaylists = playlists.slice(0, 4).map((pl, i) => ({
      type: 'playlist',
      playlist: pl,
      key: `pl-${pl.id}`,
      hue: HUES[i % HUES.length],
    }))
    const fromSongs = songs.slice(0, 4).map((s, i) => ({
      type: 'song',
      song: s,
      key: `s-${s.id}`,
      hue: HUES[i % HUES.length],
    }))
    const merged = [...fromPlaylists, ...fromSongs].slice(0, 4)
    return merged.length ? merged : [{ type: 'empty', key: 'empty', hue: 265 }]
  }, [playlists, songs])

  const hot = useMemo(() => [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10), [songs])
  const fresh = useMemo(
    () => [...songs].sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0)).slice(0, 10),
    [songs],
  )

  if (loading) {
    return (
      <div className="pt-6 lg:pt-8">
        <div className="h-44 animate-pulse rounded-[1.6rem] bg-white/[0.05] sm:h-56" />
        <div className="mt-8"><SkeletonRows count={5} /></div>
      </div>
    )
  }

  return (
    <div className="pt-6 lg:pt-8">
      {banners[0]?.type !== 'empty' && (
        <div className="relative h-44 overflow-hidden rounded-[1.6rem] border border-white/8 sm:h-56">
          {banners.map((b, i) => {
            const active = i === bannerIdx
            const art = b.type === 'playlist' ? songs.find((s) => s.id === b.playlist.trackIds?.[0]) : b.song
            const title = b.type === 'playlist' ? b.playlist.name : b.song.title
            const sub =
              b.type === 'playlist'
                ? `${b.playlist.creatorName} 创建 · ${b.playlist.trackIds.length} 首`
                : `${b.song.artist} · ${formatPlays(b.song.playCount)}次播放`
            return (
              <div
                key={b.key}
                className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                style={{
                  background: `linear-gradient(115deg, hsla(${b.hue}, 72%, 46%, 0.6), hsla(${(b.hue + 70) % 360}, 78%, 52%, 0.28)), #0b0d16`,
                }}
              >
                {art && (
                  <img
                    src={artworkOf(art)}
                    alt=""
                    className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-35 blur-[2px]"
                  />
                )}
                <div className="absolute inset-0 flex items-center">
                  <div className="relative z-10 max-w-xl px-6 sm:px-10">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
                      {b.type === 'playlist' ? '推荐歌单' : '推荐歌曲'}
                    </span>
                    <h2 className="mt-2 truncate text-2xl font-bold text-white sm:text-3xl">{title}</h2>
                    <p className="mt-1 truncate text-sm text-white/60">{sub}</p>
                    <button
                      onClick={() =>
                        b.type === 'playlist' ? onOpenPlaylist(b.playlist) : onPlay(b.song, songs)
                      }
                      className="btn-glow mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                    >
                      <Play size={15} weight="fill" />
                      {b.type === 'playlist' ? '播放歌单' : '立即播放'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.key}
                onClick={() => setBannerIdx(i)}
                aria-label={`轮播第 ${i + 1} 张`}
                className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      )}

      {playlists.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">推荐歌单</h2>
            <button onClick={onGoPlaylists} className="flex items-center gap-0.5 text-xs text-mist-500 transition hover:text-white">
              更多 <CaretRight size={13} />
            </button>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {playlists.slice(0, 12).map((pl) => (
              <button key={pl.id} onClick={() => onOpenPlaylist(pl)} className="w-36 shrink-0 text-left">
                <PlaylistCover playlist={pl} songs={songs} className="h-36 w-36 rounded-xl shadow-lg" />
                <p className="mt-2 truncate text-sm font-semibold text-white">{pl.name}</p>
                <p className="truncate text-xs text-mist-500">{pl.creatorName} · {pl.trackIds.length}首</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {hot.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Trophy size={18} className="text-gold-300" weight="fill" />
              热歌榜
            </h2>
            <button onClick={onGoRankings} className="flex items-center gap-0.5 text-xs text-mist-500 transition hover:text-white">
              完整榜单 <CaretRight size={13} />
            </button>
          </div>
          <div className="mt-3 space-y-1">
            {hot.map((song, i) => {
              const rank = i + 1
              return (
                <div
                  key={song.id}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
                    currentTrack?.id === song.id ? 'glass-strong' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <span
                    className={`w-7 shrink-0 text-center text-lg font-black ${
                      rank === 1 ? 'text-gold-300' : rank === 2 ? 'text-mist-300' : rank === 3 ? 'text-amber-500' : 'text-mist-700'
                    }`}
                  >
                    {rank}
                  </span>
                  <img src={artworkOf(song)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${currentTrack?.id === song.id ? 'text-cyan-300' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p className="truncate text-xs text-mist-500">{song.artist}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-mist-700">{formatPlays(song.playCount)}次</span>
                  <button
                    onClick={() => onPlay(song, hot)}
                    aria-label={`播放 ${song.title}`}
                    className="btn-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  >
                    <Play size={15} weight="fill" />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">新歌速递</h2>
          <div className="glass mt-3 rounded-[1.6rem] p-2">
            {fresh.map((song, i) => (
              <TrackRow
                key={song.id}
                track={song}
                index={i}
                isActive={currentTrack?.id === song.id}
                isPlaying={isPlaying && currentTrack?.id === song.id}
                isFavorite={isFav(song)}
                hasLyrics={hasLyrics(song)}
                plays={song.playCount}
                onPlay={(t) => onPlay(t, fresh)}
                onToggleFavorite={onToggleFavorite}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        </section>
      )}

      {songs.length === 0 && playlists.length === 0 && (
        <div className="glass mt-6 flex flex-col items-center gap-3 rounded-[1.8rem] p-12 text-center">
          <p className="text-lg font-semibold text-white">这里还没有内容</p>
          <p className="max-w-sm text-sm leading-relaxed text-mist-500">登录后上传第一首歌，或者创建第一个歌单吧</p>
        </div>
      )}
    </div>
  )
}
