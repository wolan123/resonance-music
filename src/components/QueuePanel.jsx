import { X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { artworkOf } from '../lib/api'
import { Equalizer } from './TrackRow'

export default function QueuePanel({ open, onClose, queue, index, isPlaying, onPlayAt, onRemove, onClear }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[70vh] w-full max-w-2xl flex-col rounded-t-[1.6rem] p-4 shadow-2xl lg:bottom-6 lg:right-6 lg:mx-0 lg:w-[26rem] lg:max-h-[calc(100vh-12rem)] lg:rounded-[1.4rem]"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            role="dialog"
            aria-label="播放队列"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white">播放队列</h2>
              <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs text-mist-300">{queue.length} 首</span>
              <button
                onClick={onClose}
                aria-label="关闭播放队列"
                className="ml-auto rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 hover:text-white active:scale-90"
              >
                <X size={17} weight="bold" />
              </button>
            </div>
            {queue.length > 0 && (
              <button
                onClick={onClear}
                className="mt-3 self-start rounded-lg border border-white/10 px-2.5 py-1 text-xs text-mist-400 transition hover:border-white/25 hover:text-white"
              >
                清空队列
              </button>
            )}
            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {queue.length === 0 ? (
                <p className="py-10 text-center text-sm text-mist-500">队列还是空的，去听首歌吧</p>
              ) : (
                queue.map((track, i) => (
                  <div
                    key={`${track.id}-${i}`}
                    className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 transition ${
                      i === index ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="w-6 text-center text-xs text-mist-500">
                      {i === index ? <Equalizer active={isPlaying} /> : i + 1}
                    </span>
                    <img src={artworkOf(track)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
                    <button
                      onClick={() => onPlayAt(i)}
                      className={`min-w-0 flex-1 truncate text-left text-sm ${i === index ? 'font-semibold text-cyan-300' : 'text-mist-300 hover:text-white'}`}
                    >
                      {track.title}
                    </button>
                    <span className="hidden truncate text-xs text-mist-700 sm:block">{track.artist}</span>
                    <button
                      onClick={() => onRemove(i)}
                      aria-label={`从队列移除 ${track.title}`}
                      className="rounded-lg p-1.5 text-mist-700 opacity-0 transition hover:text-pink-400 group-hover:opacity-100 focus-visible:opacity-100 active:scale-90"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
