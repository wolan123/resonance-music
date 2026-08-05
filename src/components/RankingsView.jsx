import { useState } from 'react'
import { Play, TrendUp, Trophy } from '@phosphor-icons/react'
import { artworkOf } from '../lib/api'
import { formatPlays } from '../lib/format'
import { SkeletonRows } from './Skeleton'

const TABS = [
  { key: 'hot', label: '热歌榜', icon: Trophy },
  { key: 'new', label: '新歌榜', icon: TrendUp },
  { key: 'site', label: '本站热播', icon: Play },
]

export default function RankingsView({ rankings, loading, currentTrack, isPlaying, onPlay }) {
  const [tab, setTab] = useState('hot')
  const list = tab === 'hot' ? rankings.hot : tab === 'new' ? rankings.fresh : rankings.siteHot

  return (
    <section className="pt-6 lg:pt-8">
      <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">排行榜</h1>
      <p className="mt-1 text-sm text-mist-500">
        网易云 + QQ 音乐全网榜单实时融合，点一首就能听
      </p>

      <div className="mt-5 flex w-fit gap-1 rounded-2xl border border-white/8 bg-white/[0.04] p-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition ${
                tab === t.key ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-mist-500 hover:text-white'
              }`}
            >
              <Icon size={15} weight={tab === t.key ? 'fill' : 'regular'} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="glass mt-5 rounded-[1.6rem] p-2">
        {loading ? (
          <SkeletonRows count={8} />
        ) : list.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-mist-500">榜单正在路上，稍后再来看看</p>
        ) : (
          list.map((song, i) => {
            const rank = i + 1
            const active = currentTrack?.id === song.id
            return (
              <div
                key={song.id}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition sm:gap-4 ${
                  active ? 'glass-strong' : 'hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`w-8 shrink-0 text-center text-xl font-black ${
                    rank === 1 ? 'text-gold-300' : rank === 2 ? 'text-mist-300' : rank === 3 ? 'text-amber-500' : 'text-mist-700'
                  }`}
                >
                  {rank}
                </span>
                <img src={artworkOf(song)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${active ? 'text-cyan-300' : 'text-white'}`}>{song.title}</p>
                  <p className="truncate text-xs text-mist-500">
                    {song.artist} · {song.platform === 'qq' ? 'QQ 音乐' : '网易云'}
                    {typeof song.plays === 'number' && ` · ${formatPlays(song.plays)}次播放`}
                  </p>
                </div>
                <button
                  onClick={() => onPlay(song, list)}
                  aria-label={`播放 ${song.title}`}
                  className={`btn-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    active && isPlaying ? 'pulse-ring' : ''
                  }`}
                >
                  <Play size={15} weight="fill" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
