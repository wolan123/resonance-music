import { Heart, MusicNotes, SignOut, Sparkle, UploadSimple, User, Waveform } from '@phosphor-icons/react'

const TABS = [
  { key: 'hall', label: '音乐大厅', icon: MusicNotes },
  { key: 'upload', label: '上传', icon: UploadSimple },
  { key: 'favorites', label: '收藏', icon: Heart },
]

export default function NavBar({ view, onChangeView, visualizerOn, onToggleVisualizer, songCount, user, onOpenAuth, onLogout }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-abyss-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_4px_18px_rgba(139,92,246,0.45)]">
            <Waveform size={20} weight="fill" className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide text-white">LUMEN 流光音乐</p>
            <p className="hidden text-[10px] uppercase tracking-[0.22em] text-mist-500 sm:block">shared music</p>
          </div>
        </div>

        <nav className="mx-auto hidden items-center gap-1 rounded-2xl border border-white/8 bg-white/[0.04] p-1 sm:flex" aria-label="主导航">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = view === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onChangeView(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
                  active
                    ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_4px_16px_rgba(139,92,246,0.4)]'
                    : 'text-mist-500 hover:text-white'
                }`}
              >
                <Icon size={16} weight={active ? 'fill' : 'regular'} />
                {tab.label}
                {tab.key === 'hall' && songCount > 0 && (
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-white/8 text-mist-300'}`}>
                    {songCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {user ? (
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white">
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-24 truncate text-sm font-semibold text-white md:block">{user.username}</span>
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
              className="flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-3.5 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 active:scale-95"
            >
              <User size={14} />
              登录 / 注册
            </button>
          )}
          <button
            onClick={onToggleVisualizer}
            aria-pressed={visualizerOn}
            aria-label="沉浸光效开关"
            title="沉浸光效"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-90 ${
              visualizerOn
                ? 'bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_4px_16px_rgba(6,182,212,0.45)]'
                : 'border border-white/10 text-mist-500 hover:text-white'
            }`}
          >
            <Sparkle size={18} weight={visualizerOn ? 'fill' : 'regular'} />
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="flex items-center gap-1 border-t border-white/6 px-3 py-2 sm:hidden" aria-label="移动端导航">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = view === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onChangeView(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-semibold transition ${
                active ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-mist-500'
              }`}
            >
              <Icon size={15} weight={active ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
