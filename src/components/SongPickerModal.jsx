import { Check, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { artworkOf } from '../lib/api'

export default function SongPickerModal({ open, songs, playlist, onClose, onToggle }) {
  const ids = new Set(playlist?.trackIds || [])
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
            className="glass-strong fixed inset-x-4 top-1/2 z-[60] mx-auto flex max-h-[75vh] w-full max-w-md -translate-y-1/2 flex-col rounded-[1.6rem] p-5"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            role="dialog"
            aria-label="添加歌曲"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white">添加歌曲到「{playlist?.name}」</h2>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="ml-auto rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 active:scale-90"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {songs.length === 0 && <p className="py-10 text-center text-sm text-mist-500">大厅还没有歌</p>}
              {songs.map((song) => {
                const inPlaylist = ids.has(song.id)
                return (
                  <button
                    key={song.id}
                    onClick={() => onToggle(song.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                      inPlaylist ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'
                    }`}
                  >
                    <img src={artworkOf(song)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{song.title}</span>
                      <span className="block truncate text-xs text-mist-500">{song.artist}</span>
                    </span>
                    {inPlaylist && <Check size={17} weight="bold" className="text-cyan-300" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
