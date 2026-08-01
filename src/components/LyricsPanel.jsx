import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowClockwise, X } from '@phosphor-icons/react'
import { artworkOf } from '../lib/api'
import { activeLineIndex, parseLrc } from '../lib/lrc'
import { SparkleIcon } from './LightIcons'

export default function LyricsPanel({ open, track, lrc, currentTime, onClose, onFetchLyrics, onSeek }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const itemRefs = useRef({})
  const reduced = useReducedMotion()

  useEffect(() => {
    if (open) {
      setState('idle')
      setError('')
    }
  }, [open, track?.id])

  const lines = useMemo(() => (lrc ? parseLrc(lrc) : []), [lrc])
  const plainText = useMemo(() => {
    if (!lrc) return ''
    if (lines.length) return ''
    return lrc.trim()
  }, [lrc, lines])

  const activeIdx = activeLineIndex(lines, currentTime)

  useEffect(() => {
    if (!open || activeIdx < 0) return
    const el = itemRefs.current[activeIdx]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [open, activeIdx, reduced])

  async function handleFetch() {
    if (!track) return
    setState('loading')
    setError('')
    try {
      const text = await onFetchLyrics(track)
      if (!text) {
        setState('error')
        setError('没有找到这首歌的歌词，换首试试~')
      } else {
        setState('done')
      }
    } catch (e) {
      setState('error')
      setError(e.message || '歌词服务暂时不可用')
    }
  }

  return (
    <AnimatePresence>
      {open && track && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[75vh] w-full max-w-2xl flex-col rounded-t-[1.8rem] p-5 shadow-2xl lg:bottom-6 lg:right-6 lg:mx-0 lg:w-[26rem] lg:max-h-[calc(100vh-12rem)] lg:rounded-[1.5rem]"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            role="dialog"
            aria-label="歌词"
          >
            <div className="flex items-center gap-3">
              <img src={artworkOf(track)} alt="" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/15" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-white">{track.title}</p>
                <p className="truncate text-xs text-mist-500">{track.artist || '未知歌手'}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭歌词"
                className="rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 hover:text-white active:scale-90"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl bg-black/25 p-5">
              {lines.length > 0 ? (
                <div className="space-y-3 text-center">
                  {lines.map((line, i) => (
                    <button
                      key={`${i}-${line.time}`}
                      ref={(el) => {
                        itemRefs.current[i] = el
                      }}
                      onClick={() => onSeek(line.time)}
                      className={`block w-full transition-all duration-300 ${
                        i === activeIdx
                          ? 'scale-[1.05] text-lg font-bold text-glow text-cyan-300'
                          : 'text-sm text-mist-500 hover:text-mist-300'
                      }`}
                    >
                      {line.text || '♪'}
                    </button>
                  ))}
                </div>
              ) : plainText ? (
                <div className="space-y-3 whitespace-pre-line text-sm leading-relaxed text-mist-300">{plainText}</div>
              ) : state === 'loading' ? (
                <p className="py-10 text-center text-sm text-mist-500">正在找歌词…</p>
              ) : state === 'error' ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <SparkleIcon className="h-6 w-6 text-cyan-300" />
                  <p className="text-sm text-mist-500">{error}</p>
                  <button onClick={handleFetch} className="btn-glow flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold">
                    <ArrowClockwise size={14} />
                    再试一次
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <SparkleIcon className="h-6 w-6 animate-twinkle text-cyan-300" />
                  <p className="text-sm text-mist-500">还没有歌词，去网上找找看？</p>
                  <button onClick={handleFetch} className="btn-glow rounded-full px-4 py-2 text-xs font-semibold">
                    在线搜索歌词
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
