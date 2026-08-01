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
        className="flex items-center gap-2 rounded-full border border-skin-200 bg-white p-2 pl-5 shadow-[0_8px_24px_rgba(229,72,77,0.08)] transition focus-within:border-klee-400"
      >
        <MagnifyingGlass size={20} className="shrink-0 text-cocoa-300" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑…"
          aria-label="搜索音乐"
          className="w-full bg-transparent py-2 text-base text-cocoa-900 placeholder:text-cocoa-300 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-boom flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
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
            className="rounded-full border border-skin-200 bg-white px-3.5 py-1.5 text-sm text-cocoa-500 transition hover:border-klee-300 hover:text-klee-600 active:scale-[0.97]"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
