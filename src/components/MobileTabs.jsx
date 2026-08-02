import { Compass, Playlist, Trophy, UploadSimple, User } from '@phosphor-icons/react'

const TABS = [
  { key: 'discover', label: '发现', icon: Compass },
  { key: 'playlists', label: '歌单', icon: Playlist },
  { key: 'rankings', label: '排行', icon: Trophy },
  { key: 'profile', label: '我的', icon: User },
  { key: 'upload', label: '上传', icon: UploadSimple },
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
