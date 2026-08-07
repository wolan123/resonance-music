import { ChartPie, Clock, Headphones, MusicNotes, Play, Sparkle, UserCircle } from '@phosphor-icons/react'
import TrackRow from './TrackRow'
import { artworkOf } from '../lib/api'
import { SkeletonRows } from './Skeleton'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <Icon size={18} className="text-violet-400" />
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-0.5 text-xs text-mist-500">{label}</p>
    </div>
  )
}

export default function ReportView({ report, loading, user, onOpenAuth, onPlay }) {
  if (!user) {
    return (
      <section className="pt-6 lg:pt-8">
        <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">我的听歌报告</h1>
        <div className="glass mt-6 flex flex-col items-center gap-4 rounded-[1.8rem] p-12 text-center">
          <ChartPie size={38} className="text-violet-400/70" />
          <p className="text-lg font-semibold text-white">登录后生成你的专属报告</p>
          <p className="max-w-sm text-sm leading-relaxed text-mist-500">每个账号独立统计：播放次数、时长、最爱歌曲和歌手</p>
          <button onClick={onOpenAuth} className="btn-glow rounded-full px-6 py-2.5 text-sm font-semibold">
            登录 / 注册
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="pt-6 lg:pt-8">
      <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">我的听歌报告</h1>
      <p className="mt-1 text-sm text-mist-500">只为 {user.username} 生成 · 数据来自你的独立播放记录</p>

      {loading ? (
        <div className="mt-5"><SkeletonRows count={8} /></div>
      ) : !report || report.empty ? (
        <div className="glass mt-5 flex flex-col items-center gap-3 rounded-[1.8rem] p-12 text-center">
          <MusicNotes size={30} className="text-violet-400/70" />
          <p className="text-lg font-semibold text-white">还没有听歌记录</p>
          <p className="max-w-sm text-sm leading-relaxed text-mist-500">去搜索或榜单里点几首歌，报告会自动累计</p>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <div className="glass flex flex-col items-center gap-4 rounded-[1.8rem] p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl font-bold text-white">
              {report.user.username.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="text-lg font-bold text-white">{report.user.username} 的听歌人格</p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-1.5 text-sm font-semibold text-violet-200">
                <Sparkle size={14} weight="fill" />
                {report.personality}
              </p>
              <p className="mt-3 text-sm text-mist-500">
                最常出没在 {report.peakHour}:00 前后 · 主力平台是 {report.platformName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Headphones} label="累计播放" value={report.totals.plays} />
            <Stat icon={Clock} label="累计时长（分钟）" value={report.totals.listenMinutes} />
            <Stat icon={MusicNotes} label="听过歌曲" value={report.totals.uniqueSongs} />
            <Stat icon={UserCircle} label="听过歌手" value={report.totals.uniqueArtists} />
          </div>

          {report.topSongs.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-white">最爱歌曲 Top {report.topSongs.length}</h2>
              <div className="glass mt-3 rounded-[1.4rem] p-2">
                {report.topSongs.map((song, i) => {
                  const track = {
                    id: `cloud-${song.platform || 'local'}-${song.platformId || i}`,
                    source: song.platform ? 'cloud' : '',
                    platform: song.platform || '',
                    platformId: song.platformId || '',
                    title: song.title,
                    artist: song.artist,
                    artwork: song.artwork,
                    durationMs: 0,
                  }
                  return (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      isActive={false}
                      isPlaying={false}
                      isFavorite={false}
                      hasLyrics={false}
                      plays={song.count}
                      onPlay={(t) => onPlay(t, report.topSongs.map((s) => ({
                        id: `cloud-${s.platform || 'local'}-${s.platformId || ''}`,
                        source: s.platform ? 'cloud' : '',
                        platform: s.platform || '',
                        platformId: s.platformId || '',
                        title: s.title,
                        artist: s.artist,
                        artwork: s.artwork,
                        durationMs: 0,
                      })))}
                      onToggleFavorite={() => {}}
                      onAddToPlaylist={() => {}}
                    />
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-[1.4rem] p-5">
              <h2 className="text-base font-bold text-white">最爱歌手</h2>
              <div className="mt-3 space-y-2">
                {report.topArtists.slice(0, 8).map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3">
                    <span className="w-5 text-right text-sm font-black text-mist-600">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{a.name}</span>
                    <span className="text-xs tabular-nums text-mist-500">{a.count} 次</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                        style={{ width: `${Math.max(8, (a.count / report.topArtists[0].count) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-[1.4rem] p-5">
              <h2 className="text-base font-bold text-white">平台分布</h2>
              <div className="mt-4 space-y-3">
                {[
                  { key: 'netease', label: '网易云音乐', color: 'from-red-500 to-orange-400' },
                  { key: 'qq', label: 'QQ 音乐', color: 'from-cyan-500 to-blue-400' },
                  { key: 'local', label: '站内歌曲', color: 'from-violet-500 to-fuchsia-400' },
                ].map((p) => {
                  const count = report.platformCount[p.key] || 0
                  const total = Object.values(report.platformCount).reduce((a, b) => a + b, 0) || 1
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-mist-400">{p.label}</span>
                        <span className="font-bold text-white">{count}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className={`h-full rounded-full bg-gradient-to-r ${p.color}`} style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {report.last7.length > 0 && (
            <div className="glass rounded-[1.4rem] p-5">
              <h2 className="text-base font-bold text-white">最近 7 天</h2>
              <div className="mt-4 flex h-28 items-end gap-2">
                {report.last7.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-mist-500">{d.count}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-cyan-400"
                      style={{ height: `${Math.max(6, (d.count / (Math.max(...report.last7.map((x) => x.count)) || 1)) * 80)}%` }}
                    />
                    <span className="text-[10px] text-mist-600">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(report.first || report.last) && (
            <div className="glass flex flex-col gap-3 rounded-[1.4rem] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-mist-500">第一首</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {report.first?.title} · {report.first?.artist}
                </p>
              </div>
              <Play size={16} className="shrink-0 text-violet-400" />
              <div className="min-w-0 sm:text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-mist-500">最近一首</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {report.last?.title} · {report.last?.artist}
                </p>
              </div>
            </div>
          )}

          <p className="pb-2 text-center text-xs text-mist-600">
            活跃 {report.activeDays} 天 · 收藏 {report.favoriteCount} 首 · 数据每播放一次自动更新
          </p>
        </div>
      )}
    </section>
  )
}
