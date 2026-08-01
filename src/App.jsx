import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Heart, MusicNotes } from '@phosphor-icons/react'
import Sidebar from './components/Sidebar'
import TrackRow from './components/TrackRow'
import PlayerBar from './components/PlayerBar'
import LyricsPanel from './components/LyricsPanel'
import VisualizerCanvas from './components/VisualizerCanvas'
import LibraryView from './components/LibraryView'
import SearchView from './components/SearchView'
import FavoritesView from './components/FavoritesView'
import { BombIcon, SparkleIcon } from './components/KleeIcons'
import { searchTracks } from './lib/api'
import { deleteTrack as deleteDbTrack, getAllTracks, getTrack, putTrack } from './lib/db'
import { parseAudioFile } from './lib/metadata'
import { fetchLyrics as fetchLyricsApi } from './lib/lyricsApi'
import { getAnalyser } from './lib/visualizer'
import { loadFavorites, loadVolume, saveFavorites, saveVolume } from './lib/storage'

const TABS = [
  { key: 'library', label: '音乐' },
  { key: 'search', label: '搜索' },
  { key: 'favorites', label: '收藏' },
]

function toMemoryTrack(record) {
  let audioUrl = null
  let artworkUrl = null
  try {
    audioUrl = URL.createObjectURL(record.audioBlob)
  } catch {
    audioUrl = null
  }
  if (record.artworkBlob) {
    try {
      artworkUrl = URL.createObjectURL(record.artworkBlob)
    } catch {
      artworkUrl = null
    }
  }
  return { ...record, audioUrl, artworkUrl }
}

function KleeBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-gold-200/50 blur-3xl" />
      <div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-skin-200/70 blur-3xl" />
      <div className="absolute bottom-10 left-1/4 h-72 w-72 rounded-full bg-gold-100/60 blur-3xl" />
      <SparkleIcon className="absolute left-[6%] top-[16%] h-6 w-6 text-gold-400 animate-twinkle" />
      <SparkleIcon className="absolute right-[8%] top-[28%] h-4 w-4 text-klee-300 animate-twinkle" />
      <SparkleIcon className="absolute left-[12%] top-[55%] h-5 w-5 text-klee-300 animate-twinkle" />
      <SparkleIcon className="absolute right-[16%] top-[62%] h-6 w-6 text-gold-300 animate-twinkle" />
    </div>
  )
}

function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-skin-200 bg-white px-4 py-3 text-sm font-medium text-cocoa-700 shadow-[0_12px_32px_rgba(229,72,77,0.16)] animate-pop"
        >
          <SparkleIcon className="h-4 w-4 shrink-0 text-gold-500" />
          {t.text}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [audio] = useState(() => new Audio())
  const reducedMotion = useReducedMotion()

  const [view, setView] = useState('library')
  const [library, setLibrary] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [uploading, setUploading] = useState({ active: false, current: '', done: 0, total: 0 })
  const [filter, setFilter] = useState('')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

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
  const libraryRef = useRef(library)
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
    libraryRef.current = library
  }, [library])
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const records = await getAllTracks()
        const mems = records
          .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
          .map(toMemoryTrack)
        if (!cancelled) {
          libraryRef.current = mems
          setLibrary(mems)
        }
      } catch (e) {
        if (!cancelled) toast(`音乐库加载失败：${e.message}`)
      } finally {
        if (!cancelled) setLibraryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

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
      audio.src = track.audioUrl || track.preview
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
      audio.src = track.audioUrl || track.preview
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
        const entry =
          track.source === 'local'
            ? { id: track.id, source: 'local', title: track.title, artist: track.artist, addedAt: Date.now() }
            : { source: 'online', addedAt: Date.now(), ...track }
        return [entry, ...prev]
      })
    },
    [],
  )

  const getLrcText = useCallback((track) => {
    if (!track) return null
    return lrcMapRef.current[track.id] ?? track.lrc ?? null
  }, [])

  const attachLrc = useCallback(
    async (track, text) => {
      if (!text || !track) return
      if (track.source === 'local') {
        try {
          const record = await getTrack(track.id)
          if (record) {
            record.lrc = text
            record.lrcSource = 'file'
            await putTrack(record)
          }
        } catch {
          /* ignore */
        }
        setLibrary((prev) => prev.map((t) => (t.id === track.id ? { ...t, lrc: text } : t)))
        libraryRef.current = libraryRef.current.map((t) => (t.id === track.id ? { ...t, lrc: text } : t))
      }
      lrcMapRef.current = { ...lrcMapRef.current, [track.id]: text }
      setLrcMap({ ...lrcMapRef.current })
    },
    [],
  )

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
        if (track.source === 'local') {
          try {
            const record = await getTrack(track.id)
            if (record) {
              record.lrc = text
              record.lrcSource = record.lrcSource || 'online'
              await putTrack(record)
            }
          } catch {
            /* ignore */
          }
          setLibrary((prev) => prev.map((t) => (t.id === track.id ? { ...t, lrc: text } : t)))
          libraryRef.current = libraryRef.current.map((t) => (t.id === track.id ? { ...t, lrc: text } : t))
        }
      }
      return text
    },
    [getLrcText],
  )

  const removeTrack = useCallback(
    async (track) => {
      try {
        await deleteDbTrack(track.id)
      } catch {
        /* ignore */
      }
      if (queueRef.current[indexRef.current]?.id === track.id) {
        audio.pause()
        setIndex(-1)
        setQueue([])
        queueRef.current = []
        indexRef.current = -1
      }
      try {
        URL.revokeObjectURL(track.audioUrl)
        if (track.artworkUrl) URL.revokeObjectURL(track.artworkUrl)
      } catch {
        /* ignore */
      }
      setLibrary((prev) => prev.filter((t) => t.id !== track.id))
      libraryRef.current = libraryRef.current.filter((t) => t.id !== track.id)
      setFavorites((prev) => prev.filter((f) => !(f.source === 'local' && f.id === track.id)))
      toast(`《${track.title}》已从背包删除`)
    },
    [audio, toast],
  )

  const handleFiles = useCallback(
    async (files) => {
      const audioFiles = []
      const lrcFiles = []
      for (const f of files) {
        const name = f.name.toLowerCase()
        if (name.endsWith('.lrc')) lrcFiles.push(f)
        else if (f.type.startsWith('audio/') || /\.(mp3|m4a|flac|wav|ogg|opus|aac|mp4)$/.test(name)) audioFiles.push(f)
      }
      if (!audioFiles.length && !lrcFiles.length) {
        toast('好像没有音乐文件哦，再检查一下？')
        return
      }
      setUploading({ active: true, current: '', done: 0, total: audioFiles.length })
      let added = 0
      let skipped = 0
      let failed = 0
      for (let i = 0; i < audioFiles.length; i += 1) {
        const file = audioFiles[i]
        setUploading((u) => ({ ...u, current: file.name, done: i }))
        try {
          const parsed = await parseAudioFile(file)
          const dup = libraryRef.current.some((t) => t.fileName === file.name && t.size === file.size)
          if (dup) {
            skipped += 1
            continue
          }
          const id = crypto.randomUUID
            ? crypto.randomUUID()
            : `loc-${Date.now()}-${Math.random().toString(36).slice(2)}`
          const record = {
            id,
            source: 'local',
            fileName: file.name,
            size: file.size,
            title: parsed.title,
            artist: parsed.artist,
            album: parsed.album,
            durationMs: parsed.durationMs,
            artworkBlob: parsed.artworkBlob,
            audioBlob: file,
            lrc: parsed.lrc,
            lrcSource: parsed.lrc ? 'embedded' : null,
            addedAt: Date.now(),
          }
          await putTrack(record)
          const mem = toMemoryTrack(record)
          libraryRef.current = [mem, ...libraryRef.current]
          setLibrary([...libraryRef.current])
          if (parsed.lrc) {
            lrcMapRef.current = { ...lrcMapRef.current, [id]: parsed.lrc }
            setLrcMap({ ...lrcMapRef.current })
          }
          added += 1
        } catch {
          failed += 1
        }
      }
      for (const lf of lrcFiles) {
        try {
          const base = lf.name.replace(/\.lrc$/i, '').toLowerCase()
          const match = libraryRef.current.find(
            (t) => t.fileName.replace(/\.[^.]+$/, '').toLowerCase() === base,
          )
          if (match) {
            const text = await lf.text()
            await attachLrc(match, text)
            toast(`歌词已配对：《${match.title}》`)
          }
        } catch {
          failed += 1
        }
      }
      setUploading({ active: false, current: '', done: 0, total: 0 })
      if (added) toast(`装进背包 ${added} 首歌！`)
      if (skipped) toast(`${skipped} 首歌已经存在，跳过啦`)
      if (failed) toast(`${failed} 个文件处理失败`)
    },
    [attachLrc, toast],
  )

  const handleSearch = useCallback(async (q) => {
    setQuery(q)
    setSearching(true)
    setSearchError('')
    try {
      const tracks = await searchTracks(q)
      setResults(tracks)
    } catch (e) {
      setSearchError(e.message || '搜索失败，请稍后重试')
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

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
  const favoriteTracks = favorites
    .map((f) => (f.source === 'local' ? library.find((t) => t.id === f.id) : f))
    .filter(Boolean)

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
      <KleeBackground />
      {visualizerOn && <VisualizerCanvas analyser={analyser} playing={isPlaying} />}

      <Sidebar view={view} onChangeView={setView} favoriteCount={favorites.length} trackCount={library.length} />

      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-skin-200 bg-snow-50/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="relative">
          <BombIcon className="h-9 w-9" />
          <SparkleIcon className="absolute -right-1 -top-1 h-3.5 w-3.5 text-gold-400 animate-twinkle" />
        </div>
        <p className="font-display text-lg font-bold text-cocoa-900">蹦蹦音乐</p>
        <div className="ml-auto flex rounded-2xl border border-skin-200 bg-white p-1 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              aria-selected={view === tab.key}
              className={`rounded-xl px-3 py-1.5 text-[13px] font-semibold transition ${
                view === tab.key ? 'bg-klee-500 text-white' : 'text-cocoa-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleVisualizer}
          aria-pressed={visualizerOn}
          aria-label="光效开关"
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-90 ${
            visualizerOn ? 'bg-klee-500 text-white' : 'border border-skin-200 bg-white text-cocoa-500'
          }`}
        >
          <SparkleIcon className="h-4 w-4" />
        </button>
      </header>

      <main className="relative z-10 pb-44 lg:pb-36 lg:pl-72">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
          <AnimatePresence mode="wait">
            {view === 'library' && (
              <motion.div key="library" {...anim}>
                <LibraryView
                  tracks={library}
                  loading={libraryLoading}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isFav={isFav}
                  hasLyrics={getLrcText}
                  onPlay={playTrack}
                  onToggleFavorite={toggleFavorite}
                  onDelete={removeTrack}
                  uploading={uploading}
                  onFiles={handleFiles}
                  filter={filter}
                  onFilterChange={setFilter}
                />
              </motion.div>
            )}
            {view === 'search' && (
              <motion.div key={`search-${query}`} {...anim}>
                <SearchView
                  query={query}
                  searching={searching}
                  error={searchError}
                  results={results}
                  onSearch={handleSearch}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isFav={isFav}
                  hasLyrics={getLrcText}
                  onPlay={playTrack}
                  onToggleFavorite={toggleFavorite}
                />
              </motion.div>
            )}
            {view === 'favorites' && (
              <motion.div key="favorites" {...anim}>
                <FavoritesView
                  tracks={favoriteTracks}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isFav={isFav}
                  hasLyrics={getLrcText}
                  onPlay={playTrack}
                  onToggleFavorite={toggleFavorite}
                  onGoLibrary={() => setView('library')}
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
