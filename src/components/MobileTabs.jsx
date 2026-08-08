import { Cloud, Compass, MagnifyingGlass, PlayCircle, Playlist, Trophy, User } from '@phosphor-icons/react'

const TABS = [
  { key: 'discover', label: '发现', icon: Compass },
  { key: 'feed', label: '推荐', icon: PlayCircle },
  { key: 'search', label: '搜索', icon: MagnifyingGlass },
  { key: 'playlists', label: '歌单', icon: Playlist },
  { key: 'rankings', label: '排行', icon: Trophy },
  { key: 'cloud', label: '云音乐', icon: Cloud },
  { key: 'profile', label: '我的', icon: User },
]

export default function MobileTabs({ view, onChangeView, onOpenAuth }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-abyss-950/90 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 backdrop-blur-xl lg:hidden" aria-label="移动端导航">
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = view === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onChangeView(tab.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition active:scale-95 ${
                active ? 'text-cyan-300' : 'text-mist-500'
              }`}
            >
              <Icon size={19} weight={active ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
