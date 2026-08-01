import { Compass, Heart, Waveform } from '@phosphor-icons/react'

export default function Sidebar({ view, onChangeView, favoriteCount }) {
  const items = [
    { key: 'discover', label: '发现音乐', icon: Compass },
    { key: 'favorites', label: '我的收藏', icon: Heart },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/8 bg-ink-900/80 px-6 py-8 backdrop-blur lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-ink-950">
          <Waveform size={22} weight="fill" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight">共鸣</p>
          <p className="text-xs text-cream-400">Resonance</p>
        </div>
      </div>

      <nav className="mt-10 space-y-1" aria-label="主导航">
        {items.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => onChangeView(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                active ? 'bg-ink-800 text-accent-300' : 'text-cream-400 hover:bg-ink-850 hover:text-cream-200'
              }`}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} />
              {item.label}
              {item.key === 'favorites' && favoriteCount > 0 && (
                <span className="ml-auto rounded-full bg-ink-700 px-2 py-0.5 text-xs text-cream-200">{favoriteCount}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 text-xs leading-relaxed text-cream-400/70">
        <p>数据与试听片段来自公开音乐接口（iTunes），版权归原作者所有。</p>
        <p>在线搜索 · 30 秒试听 · 收藏</p>
      </div>
    </aside>
  )
}
