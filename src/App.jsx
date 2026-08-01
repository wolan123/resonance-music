import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import NavBar from './components/NavBar'
import HallView from './components/HallView'
import UploadView from './components/UploadView'
import FavoritesView from './components/FavoritesView'
import PlayerBar from './components/PlayerBar'
import LyricsPanel from './components/LyricsPanel'
import LightCanvas from './components/LightCanvas'
import Toasts from './components/Toasts'
import { deleteSong, fetchSongs } from './lib/api'
import { fetchLyrics as fetchLyricsApi } from './lib/lyricsApi'
import { getAnalyser } from './lib/visualizer'
import { loadFavorites, loadVolume, saveFavorites, saveVolume } from './lib/storage'

export default function App() {
  const [audio] = useState(() => {
    const a = new Audio()
    a.crossOrigin = 'anonymous'
    a.preload = 'auto'
    return a
  })
  const reducedMotion = useReducedMotion()

  const [view, setView] = useState('hall')
  const [songs, setSongs] = useState([])
  const [hallLoading, setHallLoading] = useState(true)
  const [hallError, setHallError] = useState('')
  const [filter, setFilter] = useState('')

  const [favorites, setFavorites] = useState(loadFavorites)
  const [lrcMap, setLrcMap] = useState({})
  const [toasts, setToasts] = useState([])

  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(loadVolume)
  const [visualizerOn, setVisualizerOn] = useState(true)
  const [analyser, setAnalyser] = useState(null)
  const [lyricsOpen, setLyricsOpen] = useState(false)

  const queueRef = useRef(queue)
  const indexRef = useRef(index)
  const lrcMapRef = useRef(lrcMap)
  const analyserRef = useRef(null)
  const visualizerOnRef = useRef(visualizerOn)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])
  useEffect(() => {
    indexRef.current = index
  }, [index])
  useEffect(() => {
    lrcMapRef.current = lrcMap
  }, [lrcMap])
  useEffect(() => {
    visualizerOnRef.current = visualizerOn
  }, [visualizerOn])

  const toast = useCallback((text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  const ensureAnalyser = useCallback(() => {
    if (analyserRef.current) return analyserRef.current
    const a = getAnalyser(audio)
    analyserRef.current = a
    if (a) setAnalyser(a)
    return a
  }, [audio])

  const loadSongs = useCallback(async () => {
    setHallLoading(true)
    setHallError('')
    try {
      setSongs(await fetchSongs())
    } catch (e) {
      setHallError(e.message || '加载失败')
    } finally {
      setHallLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSongs()
  }, [loadSongs])

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  useEffect(() => {
    saveVolume(volume)
    audio.volume = volume
  }, [volume, audio])

  const playAt = useCallback(
    (i) => {
      const list = queueRef.current
      if (!list.length) return
      const safe = ((i % list.length) + list.length) % list.length
      indexRef.current = safe
      setIndex(safe)
      const track = list[safe]
      audio.src = track.audioUrl
      audio.play().catch(() => {})
      if (visualizerOnRef.current && !analyserRef.current) ensureAnalyser()
    },
    [audio, ensureAnalyser],
  )

  const playTrack = useCallback(
    (track, list) => {
      const target = list && list.length ? list : queueRef.current
      if (!target.length) return
      queueRef.current = target
      setQueue(target)
      const idx = target.findIndex((t) => t.id === track.id)
      const safe = idx < 0 ? 0 : idx
      indexRef.current = safe
      setIndex(safe)
      audio.src = track.audioUrl
      audio.play().catch(() => {})
      if (visualizerOnRef.current && !analyserRef.current) ensureAnalyser()
    },
    [audio, ensureAnalyser],
  )

  const next = useCallback(() => playAt(indexRef.current + 1), [playAt])

  const prev = useCallback(() => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    playAt(indexRef.current - 1)
  }, [audio, playAt])

  const togglePlay = useCallback(() => {
    if (indexRef.current < 0) return
    if (audio.paused) {
      if (visualizerOnRef.current && !analyserRef.current) ensureAnalyser()
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [audio, ensureAnalyser])

  useEffect(() => {
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTime = () => setCurrentTime(audio.currentTime || 0)
    const onEnded = () => next()
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audio, next])

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay])

  const isFav = useCallback((track) => favorites.some((f) => f.id === track.id), [favorites])

  const toggleFavorite = useCallback(
    (track) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.id === track.id)) return prev.filter((f) => f.id !== track.id)
        return [
          {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            artworkUrl: track.artworkUrl,
            audioUrl: track.audioUrl,
            durationMs: track.durationMs,
            lrc: track.lrc,
            uploader: track.uploader,
            addedAt: Date.now(),
          },
          ...prev,
        ]
      })
    },
    [],
  )

  const getLrcText = useCallback((track) => {
    if (!track) return null
    return lrcMapRef.current[track.id] ?? track.lrc ?? null
  }, [])

  const fetchLyricsFor = useCallback(
    async (track) => {
      if (!track) return null
      const existing = getLrcText(track)
      if (existing) return existing
      const found = await fetchLyricsApi(track)
      if (!found) return null
      const text = found.synced || found.plain || null
      if (text) {
        lrcMapRef.current = { ...lrcMapRef.current, [track.id]: text }
        setLrcMap({ ...lrcMapRef.current })
      }
      return text
    },
    [getLrcText],
  )

  const handleDelete = useCallback(
    async (track) => {
      if (!window.confirm(`确定删除《${track.title}》吗？删除后所有人都听不到了。`)) return
      try {
        await deleteSong(track.id)
      } catch (e) {
        toast(e.message || '删除失败')
        return
      }
      if (queueRef.current[indexRef.current]?.id === track.id) {
        audio.pause()
        setIndex(-1)
        setQueue([])
        queueRef.current = []
        indexRef.current = -1
      }
      setSongs((prev) => prev.filter((s) => s.id !== track.id))
      setFavorites((prev) => prev.filter((f) => f.id !== track.id))
      toast(`《${track.title}》已删除`)
    },
    [audio, toast],
  )

  const handleUploaded = useCallback(
    (song) => {
      toast(`《${song.title}》已经发光上线！`)
      setView('hall')
      loadSongs()
    },
    [loadSongs, toast],
  )

  const toggleVisualizer = useCallback(() => {
    setVisualizerOn((v) => {
      const next = !v
      if (next && !analyserRef.current) {
        const a = getAnalyser(audio)
        analyserRef.current = a
        if (a) setAnalyser(a)
      }
      return next
    })
  }, [audio])

  const currentTrack = index >= 0 && index < queue.length ? queue[index] : null
  const currentLrc = getLrcText(currentTrack)

  const anim = reducedMotion
    ? { initial: false }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      }

  return (
    <div className="relative min-h-[100dvh]">
      {visualizerOn && <LightCanvas analyser={analyser} playing={isPlaying} />}

      <NavBar
        view={view}
        onChangeView={setView}
        visualizerOn={visualizerOn}
        onToggleVisualizer={toggleVisualizer}
        songCount={songs.length}
      />

      <main className="relative z-10 pb-44 lg:pb-40">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {view === 'hall' && (
              <motion.div key="hall" {...anim}>
                <HallView
                  songs={songs}
                  loading={hallLoading}
                  error={hallError}
                  onRetry={loadSongs}
                  filter={filter}
                  onFilterChange={setFilter}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isFav={isFav}
                  hasLyrics={getLrcText}
                  onPlay={playTrack}
                  onToggleFavorite={toggleFavorite}
                  onDelete={handleDelete}
                />
              </motion.div>
            )}
            {view === 'upload' && (
              <motion.div key="upload" {...anim}>
                <UploadView onUploaded={handleUploaded} />
              </motion.div>
            )}
            {view === 'favorites' && (
              <motion.div key="favorites" {...anim}>
                <FavoritesView
                  tracks={favorites}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isFav={isFav}
                  hasLyrics={getLrcText}
                  onPlay={playTrack}
                  onToggleFavorite={toggleFavorite}
                  onGoHall={() => setView('hall')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying && !!currentTrack}
        currentTime={currentTime}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrev={prev}
        onToggleFavorite={toggleFavorite}
        isFavorite={currentTrack ? isFav(currentTrack) : false}
        audio={audio}
        volume={volume}
        onVolumeChange={setVolume}
        onOpenLyrics={() => setLyricsOpen(true)}
        hasLyrics={!!currentLrc}
        visualizerOn={visualizerOn}
        onToggleVisualizer={toggleVisualizer}
      />

      <LyricsPanel
        open={lyricsOpen}
        track={currentTrack}
        lrc={currentLrc}
        currentTime={currentTime}
        onClose={() => setLyricsOpen(false)}
        onFetchLyrics={fetchLyricsFor}
        onSeek={(t) => {
          try {
            audio.currentTime = t
          } catch {
            /* ignore */
          }
        }}
      />

      <Toasts toasts={toasts} />
    </div>
  )
}
