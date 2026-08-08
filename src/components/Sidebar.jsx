import {
  Cloud,
  Compass,
  ChartPie,
  MagnifyingGlass,
  Playlist,
  PlayCircle,
  SignOut,
  Sparkle,
  Trophy,
  User,
  Waveform,
} from '@phosphor-icons/react'

const NAV = [
  { key: 'discover', label: '发现', icon: Compass },
  { key: 'feed', label: '推荐', icon: PlayCircle },
  { key: 'search', label: '搜索', icon: MagnifyingGlass },
  { key: 'playlists', label: '歌单', icon: Playlist },
  { key: 'rankings', label: '排行', icon: Trophy },
  { key: 'cloud', label: '云音乐', icon: Cloud },
  { key: 'report', label: '报告', icon: ChartPie },
  { key: 'profile', label: '我的', icon: User },
]

export default function Sidebar({
  view,
  onChangeView,
  user,
  onOpenAuth,
  onLogout,
  visualizerOn,
  onToggleVisualizer,
  songCount,
  playlistCount,
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/8 bg-abyss-950/70 px-4 py-5 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_4px_18px_rgba(139,92,246,0.45)]">
          <Waveform size={20} weight="fill" className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-white">LUMEN 流光音乐</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-mist-500">shared music</p>
        </div>
      </div>

      <nav className="mt-7 space-y-1" aria-label="主导航">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => onChangeView(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                active
                  ? 'bg-gradient-to-r from-violet-500/25 to-cyan-500/25 text-white'
                  : 'text-mist-500 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} />
              {item.label}
              {item.key === 'discover' && songCount > 0 && (
                <span className="ml-auto rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-bold text-mist-300">
                  {songCount}
                </span>
              )}
              {item.key === 'playlists' && playlistCount > 0 && (
                <span className="ml-auto rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-bold text-mist-300">
                  {playlistCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <button
          onClick={onToggleVisualizer}
          aria-pressed={visualizerOn}
          className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
            visualizerOn ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-cyan-300' : 'text-mist-500 hover:bg-white/[0.05]'
          }`}
        >
          <Sparkle size={18} weight={visualizerOn ? 'fill' : 'regular'} />
          沉浸光效
          <span className={`ml-auto h-5 w-9 rounded-full p-0.5 transition ${visualizerOn ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-white/10'}`}>
            <span className={`block h-4 w-4 rounded-full bg-white transition ${visualizerOn ? 'translate-x-4' : ''}`} />
          </span>
        </button>

        {user ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] p-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{user.username}</span>
            <button
              onClick={onLogout}
              aria-label="退出登录"
              title="退出登录"
              className="rounded-full p-1.5 text-mist-500 transition hover:bg-white/10 hover:text-white active:scale-90"
            >
              <SignOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/40 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20 active:scale-[0.98]"
          >
            <User size={15} />
            登录 / 注册
          </button>
        )}
      </div>
    </aside>
  )
}
