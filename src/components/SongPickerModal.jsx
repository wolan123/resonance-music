import { useState } from 'react'
import { Check, MagnifyingGlass, Spinner, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { artworkOf } from '../lib/api'
import { cloudSearch } from '../lib/cloud'

export default function SongPickerModal({ open, playlist, onClose, onToggle }) {
  const [platform, setPlatform] = useState('netease')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const ids = new Set(playlist?.trackIds || [])

  async function doSearch(q) {
    const keywords = (q ?? query).trim()
    if (!keywords) return
    setSearching(true)
    setError('')
    try {
      setResults(await cloudSearch(platform, keywords))
    } catch (e) {
      setError(e.message || '搜索失败')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-4 top-1/2 z-[60] mx-auto flex max-h-[80vh] w-full max-w-md -translate-y-1/2 flex-col rounded-[1.6rem] p-5"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            role="dialog"
            aria-label="添加歌曲"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white">添加歌曲到《{playlist?.name}》</h2>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="ml-auto rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 active:scale-90"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="mt-3 flex w-fit gap-1 rounded-xl border border-white/8 bg-white/[0.04] p-0.5">
              {[
                { key: 'netease', label: '网易云' },
                { key: 'qq', label: 'QQ 音乐' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setPlatform(t.key)
                    setResults([])
                  }}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    platform === t.key ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-mist-500 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="搜索歌名 / 歌手…"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                />
              </div>
              <button
                onClick={() => doSearch()}
                disabled={searching}
                className="btn-glow rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
              >
                {searching ? <Spinner size={14} className="animate-spin" /> : '搜索'}
              </button>
            </div>

            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {error ? (
                <p className="py-8 text-center text-sm text-pink-400">{error}</p>
              ) : searching ? (
                <div className="flex justify-center py-8"><Spinner size={20} className="animate-spin text-violet-400" /></div>
              ) : results.length === 0 ? (
                <p className="py-8 text-center text-sm text-mist-500">搜索网易云 / QQ 音乐全曲库，把歌加进歌单</p>
              ) : (
                results.map((track) => {
                  const inPlaylist = ids.has(track.id)
                  return (
                    <button
                      key={track.id}
                      onClick={() => onToggle(track)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                        inPlaylist ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <img src={artworkOf(track)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{track.title}</span>
                        <span className="block truncate text-xs text-mist-500">
                          {track.artist} · {track.platform === 'qq' ? 'QQ 音乐' : '网易云'}
                        </span>
                      </span>
                      {inPlaylist && <Check size={17} weight="bold" className="text-cyan-300" />}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
