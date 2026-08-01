import { Heart, MagnifyingGlass, MusicNotes } from '@phosphor-icons/react'
import { BombIcon, SparkleIcon } from './KleeIcons'

const ITEMS = [
  { key: 'library', label: '我的音乐', icon: MusicNotes },
  { key: 'search', label: '在线搜索', icon: MagnifyingGlass },
  { key: 'favorites', label: '我的收藏', icon: Heart },
]

export default function Sidebar({ view, onChangeView, favoriteCount, trackCount }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-skin-200 bg-white/85 px-6 py-7 backdrop-blur lg:flex">
      <div className="flex items-center gap-3">
        <div className="relative">
          <BombIcon className="h-11 w-11" />
          <SparkleIcon className="absolute -right-1.5 -top-1.5 h-4 w-4 text-gold-400 animate-twinkle" />
        </div>
        <div>
          <p className="font-display text-xl font-bold tracking-wide text-cocoa-900">蹦蹦音乐</p>
          <p className="text-xs text-cocoa-400">Boom Music</p>
        </div>
      </div>

      <nav className="mt-9 space-y-1.5" aria-label="主导航">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => onChangeView(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                active ? 'bg-skin-100 text-klee-600' : 'text-cocoa-500 hover:bg-skin-50 hover:text-cocoa-700'
              }`}
            >
              <Icon size={19} weight={active ? 'fill' : 'regular'} />
              {item.label}
              {item.key === 'favorites' && favoriteCount > 0 && (
                <span className="ml-auto rounded-full bg-klee-500 px-2 py-0.5 text-xs font-bold text-white">{favoriteCount}</span>
              )}
              {item.key === 'library' && trackCount > 0 && (
                <span className="ml-auto rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-cocoa-700">{trackCount}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 text-xs leading-relaxed text-cocoa-400">
        <p className="flex items-center gap-1.5">
          <SparkleIcon className="h-3.5 w-3.5 text-gold-500" />
          今天也要听很多很多歌哦！
        </p>
        <p>上传的音乐只存在你的浏览器本地，只有你能听到。</p>
      </div>
    </aside>
  )
}
