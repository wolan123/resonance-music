import { ChartPie, Clock, Heart, MusicNotes, Playlist } from '@phosphor-icons/react'
import TrackRow from './TrackRow'
import PlaylistCover from './PlaylistCover'

export default function ProfileView({
  user,
  songs,
  favorites,
  recentPlays,
  playlists,
  currentTrack,
  isPlaying,
  isFav,
  hasLyrics,
  onOpenAuth,
  onPlay,
  onToggleFavorite,
  onAddToPlaylist,
  onDeleteSong,
  onOpenPlaylist,
  onGoReport,
}) {
  if (!user) {
    return (
      <section className="pt-6 lg:pt-8">
        <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">我的</h1>
        <div className="glass mt-6 flex flex-col items-center gap-4 rounded-[1.8rem] p-12 text-center">
          <MusicNotes size={38} className="text-violet-400/70" />
          <p className="text-lg font-semibold text-white">登录后解锁你的音乐世界</p>
          <p className="max-w-sm text-sm leading-relaxed text-mist-500">最近播放、上传的歌、收藏和歌单都会在这里</p>
          <button onClick={onOpenAuth} className="btn-glow rounded-full px-6 py-2.5 text-sm font-semibold">
            登录 / 注册
          </button>
        </div>
      </section>
    )
  }

  const myPlaylists = playlists.filter((p) => p.creatorId === user.id)

  return (
    <section className="pt-6 lg:pt-8">
      <div className="glass flex flex-col gap-4 rounded-[1.8rem] p-6 sm:flex-row sm:items-center sm:gap-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl font-bold text-white">
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white">{user.username}</h1>
          <p className="mt-1 text-sm text-mist-500">
            歌单 {myPlaylists.length} 个 · 收藏 {favorites.length} 首
          </p>
        </div>
      </div>

      <button
        onClick={onGoReport}
        className="glass mt-5 flex w-full items-center gap-4 rounded-[1.6rem] p-5 text-left transition hover:border-violet-400/40 hover:bg-white/[0.05] active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400">
          <ChartPie size={22} weight="fill" className="text-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-white">我的听歌报告</span>
          <span className="mt-0.5 block text-xs text-mist-500">播放次数、最爱歌曲、歌手、平台分布，只统计你的账号</span>
        </span>
        <span className="btn-glow rounded-full px-4 py-2 text-xs font-semibold">查看</span>
      </button>

      {recentPlays.length > 0 && (
        <div className="mt-7">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Clock size={17} className="text-cyan-300" />
            最近播放
          </h2>
          <div className="glass mt-3 rounded-[1.4rem] p-2">
            {recentPlays.slice(0, 10).map((track, i) => (
              <TrackRow
                key={`${track.id}-${i}`}
                track={track}
                index={i}
                isActive={currentTrack?.id === track.id}
                isPlaying={isPlaying && currentTrack?.id === track.id}
                isFavorite={isFav(track)}
                hasLyrics={hasLyrics(track)}
                onPlay={(t) => onPlay(t, recentPlays)}
                onToggleFavorite={onToggleFavorite}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-7">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <Heart size={17} className="text-pink-400" />
          我的收藏
        </h2>
        <div className="glass mt-3 rounded-[1.4rem] p-2">
          {favorites.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-mist-500">还没有收藏歌曲</p>
          ) : (
            favorites.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isActive={currentTrack?.id === track.id}
                isPlaying={isPlaying && currentTrack?.id === track.id}
                isFavorite
                hasLyrics={hasLyrics(track)}
                onPlay={(t) => onPlay(t, favorites)}
                onToggleFavorite={onToggleFavorite}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-7">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <Playlist size={17} className="text-gold-300" />
          我的歌单
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {myPlaylists.length === 0 ? (
            <p className="col-span-full rounded-2xl bg-white/[0.03] px-4 py-8 text-center text-sm text-mist-500">还没有创建歌单</p>
          ) : (
            myPlaylists.map((pl) => (
              <button key={pl.id} onClick={() => onOpenPlaylist(pl)} className="text-left">
                <PlaylistCover playlist={pl} songs={songs} className="aspect-square w-full rounded-2xl shadow-lg" />
                <p className="mt-2 truncate text-sm font-semibold text-white">{pl.name}</p>
                <p className="text-xs text-mist-500">{pl.trackIds.length}首</p>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
