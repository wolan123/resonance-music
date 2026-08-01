import { useState } from 'react'
import { MagnifyingGlass, Spinner } from '@phosphor-icons/react'

const QUICK_TAGS = ['周杰伦', 'Taylor Swift', '流行', '摇滚', '爵士', '电子', '古典', '纯音乐']

export default function SearchBar({ onSearch, loading = false }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const q = value.trim()
    if (q) onSearch(q)
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-850 p-2 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition focus-within:border-accent-500/60"
      >
        <MagnifyingGlass size={20} className="shrink-0 text-cream-400" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑…"
          aria-label="搜索音乐"
          className="w-full bg-transparent py-2 text-base text-cream-50 placeholder:text-cream-400/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-accent-400 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Spinner size={16} className="animate-spin" /> : <MagnifyingGlass size={16} weight="bold" />}
          搜索
        </button>
      </form>
      <div className="flex flex-wrap gap-2" aria-label="热门搜索">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setValue(tag)
              onSearch(tag)
            }}
            className="rounded-full border border-white/10 bg-ink-850 px-3.5 py-1.5 text-sm text-cream-200 transition hover:border-accent-500/50 hover:text-accent-300 active:scale-[0.98]"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
