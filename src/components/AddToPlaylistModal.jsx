import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, Spinner, X } from '@phosphor-icons/react'
import PlaylistCover from './PlaylistCover'
import { artworkOf, resolvePlaylistTracks } from '../lib/api'

export default function AddToPlaylistModal({
  track,
  playlists,
  songs,
  onClose,
  onAdd,
  onCreate,
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createNew(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      const playlist = await onCreate(name.trim())
      setName('')
      if (playlist?.id) await onAdd(playlist.id)
    } catch (err) {
      setError(err.message || '创建失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {track && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-4 top-1/2 z-[60] mx-auto max-h-[75vh] w-full max-w-sm -translate-y-1/2 overflow-hidden rounded-[1.6rem] p-5"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            role="dialog"
            aria-label="收藏到歌单"
          >
            <div className="flex items-center gap-3">
              <img src={artworkOf(track)} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/15" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{track.title}</p>
                <p className="truncate text-xs text-mist-500">{track.artist}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 active:scale-90"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-mist-500">收藏到歌单</p>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {playlists.length === 0 && (
                <p className="py-6 text-center text-sm text-mist-500">还没有歌单，先创建一个吧</p>
              )}
              {playlists.map((pl) => {
                const has = (pl.trackIds || []).includes(track.id)
                return (
                  <button
                    key={pl.id}
                    onClick={() => onAdd(pl.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.06]"
                  >
                    <PlaylistCover playlist={pl} songs={songs} className="h-10 w-10 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{pl.name}</span>
                      <span className="block text-xs text-mist-500">{resolvePlaylistTracks(pl, songs).length} 首</span>
                    </span>
                    {has && <Check size={16} weight="bold" className="text-cyan-300" />}
                  </button>
                )
              })}
            </div>

            <form onSubmit={createNew} className="mt-4 border-t border-white/8 pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-mist-500">新建歌单</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="歌单名称"
                  maxLength={40}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !name.trim()}
                  className="btn-glow flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? <Spinner size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />}
                  创建并加入
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-pink-400">{error}</p>}
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
