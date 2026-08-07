import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sparkle, User, Waveform } from '@phosphor-icons/react'
import Sidebar from './components/Sidebar'
import MobileTabs from './components/MobileTabs'
import DiscoverView from './components/DiscoverView'
import SearchView from './components/SearchView'
import PlaylistsView from './components/PlaylistsView'
import PlaylistDetailView from './components/PlaylistDetailView'
import RankingsView from './components/RankingsView'
import ReportView from './components/ReportView'
import ProfileView from './components/ProfileView'
import CloudView from './components/CloudView'
import PlayerBar from './components/PlayerBar'
import PlayerPage from './components/PlayerPage'
import LightCanvas from './components/LightCanvas'
import Toasts from './components/Toasts'
import AuthModal from './components/AuthModal'
import QueuePanel from './components/QueuePanel'
import AddToPlaylistModal from './components/AddToPlaylistModal'
import {
  addToPlaylist,
  autoMatchLyrics,
  createPlaylist,
  deletePlaylist,
  deleteSong,
  fetchMe,
  fetchPlaylists,
  fetchRankings,
  fetchReport,
  fetchSongs,
  fetchUserData,
  loginUser,
  logoutUser,
  registerUser,
  removeFromPlaylist,
  reportPlay,
  resolvePlaylistTracks,
  saveFavoritesRemote,
  saveRecentRemote,
} from './lib/api'
import { fetchLyrics as fetchLyricsClient } from './lib/lyricsApi'
import { cloudLyrics, isCloudTrack, resolveCloudTrack } from './lib/cloud'
import { getAnalyser } from './lib/visualizer'
import { loadVolume, saveVolume } from './lib/storage'

const EFFECT_KEY = 'lumen.effect.v1'
function snapshotTrack(track) {
  return {
    id: track.id,
    source: track.source,
    platform: track.platform,
    platformId: track.platformId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artworkUrl: track.artworkUrl,
    artwork: track.artwork,
    audioUrl: track.audioUrl,
    durationMs: track.durationMs,
    uploader: track.uploader,
  }
}

export default function App() {
  const [audio] = useState(() => {
    const a = new Audio()
    a.crossOrigin = 'anonymous'
    a.preload = 'auto'
    return a
  })
  const reducedMotion = useReducedMotion()

  const [view, setView] = useState('discover')
  const [playlistDetail, setPlaylistDetail] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [songs, setSongs] = useState([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [playlists, setPlaylists] = useState([])
  const [playlistsLoading, setPlaylistsLoading] = useState(true)
  const [rankings, setRankings] = useState({ hot: [], fresh: [], siteHot: [] })
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authMessage, setAuthMessage] = useState('')

  const [favorites, setFavorites] = useState([])
  const [recentPlays, setRecentPlays] = useState([])
  const [lrcMap, setLrcMap] = useState({})
  const [toasts, setToasts] = useState([])

  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(loadVolume)
  const [visualizerOn, setVisualizerOn] = useState(true)
  const [effectMode, setEffectMode] = useState(() => localStorage.getItem(EFFECT_KEY) || 'dynamic')
  const [analyser, setAnalyser] = useState(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [addToTrack, setAddToTrack] = useState(null)

  const queueRef = useRef(queue)
  const indexRef = useRef(index)
  const recentRef = useRef(recentPlays)
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
    recentRef.current = recentPlays
  }, [recentPlays])
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
    setSongsLoading(true)
    try {
      setSongs(await fetchSongs())
    } catch {
      setSongs([])
    } finally {
      setSongsLoading(false)
    }
  }, [])

  const loadPlaylists = useCallback(async () => {
    setPlaylistsLoading(true)
    try {
      setPlaylists(await fetchPlaylists())
    } catch {
      setPlaylists([])
    } finally {
      setPlaylistsLoading(false)
    }
  }, [])

  const loadRankings = useCallback(async () => {
    setRankingsLoading(true)
    try {
      setRankings(await fetchRankings())
    } catch {
      setRankings({ hot: [], fresh: [], siteHot: [] })
    } finally {
      setRankingsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSongs()
    loadPlaylists()
    loadRankings()
  }, [loadSongs, loadPlaylists, loadRankings])

  useEffect(() => {
    fetchMe()
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null))
  }, [])

  const loadUserData = useCallback(async (uid) => {
    if (!uid) {
      setFavorites([])
      setRecentPlays([])
      setReport(null)
      return
    }
    try {
      const data = await fetchUserData()
      setFavorites(data.favorites || [])
      setRecentPlays(data.recent || [])
    } catch {
      setFavorites([])
      setRecentPlays([])
    }
  }, [])

  useEffect(() => {
    loadUserData(user?.id)
  }, [user?.id, loadUserData])

  const loadReport = useCallback(async () => {
    if (!user) {
      setReport(null)
      return
    }
    setReportLoading(true)
    try {
      setReport(await fetchReport())
    } catch {
      setReport(null)
    } finally {
      setReportLoading(false)
    }
  }, [user])

  useEffect(() => {
    saveVolume(volume)
    audio.volume = volume
  }, [volume, audio])

  useEffect(() => {
    try {
      localStorage.setItem(EFFECT_KEY, effectMode)
    } catch {
      /* ignore */
    }
  }, [effectMode])

  const reportTrack = useCallback((track) => {
    if (!track) return
    const nextRecent = [snapshotTrack(track), ...recentRef.current.filter((p) => p.id !== track.id)].slice(0, 50)
    setRecentPlays(nextRecent)
    if (user?.id) saveRecentRemote(nextRecent).catch(() => {})
    const cloudTrack = isCloudTrack(track)
      ? {
          platform: track.platform,
          platformId: track.platformId,
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork: track.artwork || track.artworkUrl,
          durationMs: track.durationMs,
        }
      : undefined
    reportPlay(track.id, cloudTrack)
      .then((count) => {
        if (count != null) {
          setSongs((prev) => prev.map((s) => (s.id === track.id ? { ...s, playCount: count } : s)))
        }
      })
      .catch(() => {})
  }, [user])

  const playAt = useCallback(
    async (i) => {
      const list = queueRef.current
      if (!list.length) return
      const safe = ((i % list.length) + list.length) % list.length
      indexRef.current = safe
      setIndex(safe)
      const track = list[safe]
      let src = track.audioUrl
      if (!src && isCloudTrack(track)) {
        try {
          src = await resolveCloudTrack(track)
          const updated = list.map((t) => (t.id === track.id ? { ...t, audioUrl: src } : t))
          queueRef.current = updated
          setQueue(updated)
        } catch (e) {
          toast(e.message || '播放地址获取失败')
          return
        }
      }
      audio.src = src
      audio.play().catch(() => {})
      reportTrack(track)
      if (visualizerOnRef.current && !analyserRef.current) ensureAnalyser()
    },
    [audio, ensureAnalyser, reportTrack, toast],
  )

  const playTrack = useCallback(
    async (track, list) => {
      let target = list && list.length ? list : queueRef.current
      if (!target.length) return
      let src = track.audioUrl
      if (!src && isCloudTrack(track)) {
        try {
          src = await resolveCloudTrack(track)
          target = target.map((t) => (t.id === track.id ? { ...t, audioUrl: src } : t))
        } catch (e) {
          toast(e.message || '播放地址获取失败')
          return
        }
      }
      queueRef.current = target
      setQueue(target)
      const idx = target.findIndex((t) => t.id === track.id)
      const safe = idx < 0 ? 0 : idx
      indexRef.current = safe
      setIndex(safe)
      setPlayerOpen(true)
      audio.src = src
      audio.play().catch(() => {})
      reportTrack(track)
      if (visualizerOnRef.current && !analyserRef.current) ensureAnalyser()
    },
    [audio, ensureAnalyser, reportTrack, toast],
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

  const removeFromQueue = useCallback(
    (i) => {
      const list = queueRef.current
      if (i < 0 || i >= list.length) return
      const next = list.filter((_, idx) => idx !== i)
      queueRef.current = next
      setQueue(next)
      if (i === indexRef.current) {
        audio.pause()
        setIndex(-1)
        indexRef.current = -1
      } else if (i < indexRef.current) {
        indexRef.current -= 1
        setIndex(indexRef.current)
      }
    },
    [audio],
  )

  const clearQueue = useCallback(() => {
    audio.pause()
    queueRef.current = []
    setQueue([])
    setIndex(-1)
    indexRef.current = -1
  }, [audio])

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

  const openAuth = useCallback((mode = 'login', message = '') => {
    setAuthMode(mode)
    setAuthMessage(message)
    setAuthOpen(true)
  }, [])

  const toggleFavorite = useCallback(
    (track) => {
      if (!user) {
        openAuth('login', '登录后就能收藏歌曲，收藏属于你的账号')
        return
      }
      setFavorites((prev) => {
        const next = prev.some((f) => f.id === track.id)
          ? prev.filter((f) => f.id !== track.id)
          : [{ ...snapshotTrack(track), addedAt: Date.now() }, ...prev]
        saveFavoritesRemote(next).catch(() => {})
        return next
      })
    },
    [openAuth, user],
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
      let lrc = null
      if (isCloudTrack(track)) {
        try {
          lrc = (await cloudLyrics(track)) || null
        } catch {
          lrc = null
        }
      }
      if (!lrc) {
        if (!isCloudTrack(track)) {
          try {
            const data = await autoMatchLyrics(track.id)
            lrc = data.lrc || null
          } catch {
            lrc = null
          }
        }
      }
      if (!lrc) {
        try {
          const found = await fetchLyricsClient(track)
          lrc = found ? found.synced || found.plain || null : null
        } catch {
          lrc = null
        }
      }
      if (lrc) {
        lrcMapRef.current = { ...lrcMapRef.current, [track.id]: lrc }
        setLrcMap({ ...lrcMapRef.current })
      }
      return lrc
    },
    [getLrcText],
  )

  const currentTrack = index >= 0 && index < queue.length ? queue[index] : null
  const currentLrc = getLrcText(currentTrack)

  useEffect(() => {
    if (!currentTrack || getLrcText(currentTrack)) return
    fetchLyricsFor(currentTrack).catch(() => {})
  }, [currentTrack?.id])

  const canDeleteSong = useCallback(
    (track) => !!user && (track.userId === user.id || (user.isAdmin && !track.userId)),
    [user],
  )

  const handleDeleteSong = useCallback(
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
      setRecentPlays((prev) => prev.filter((p) => p.id !== track.id))
      toast(`《${track.title}》已删除`)
    },
    [audio, toast],
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

  const handleLogin = useCallback(
    async (username, password) => {
      const data = await loginUser(username, password)
      setUser(data.user)
      setAuthOpen(false)
      toast(`欢迎回来，${data.user.username}！`)
    },
    [toast],
  )

  const handleRegister = useCallback(
    async (username, password) => {
      const data = await registerUser(username, password)
      setUser(data.user)
      setAuthOpen(false)
      toast(`欢迎加入 LUMEN，${data.user.username}！`)
    },
    [toast],
  )

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser()
    } catch {
      /* ignore */
    }
    setUser(null)
    setPlaylistDetail(null)
    toast('已退出登录')
  }, [toast])

  const changeView = useCallback(
    (next) => {
      setPlaylistDetail(null)
      if (next === 'report') loadReport()
      setView(next)
    },
    [loadReport],
  )

  const handleCreatePlaylist = useCallback(
    async (name, description) => {
      const playlist = await createPlaylist(name, description)
      setPlaylists((prev) => [playlist, ...prev])
      toast(`歌单《${name}》创建成功`)
      return playlist
    },
    [toast],
  )

  const handleAddToPlaylistTrack = useCallback(
    (track) => {
      if (!user) {
        openAuth('login', '登录后才能把歌收藏到歌单')
        return
      }
      setAddToTrack(track)
    },
    [openAuth, user],
  )

  const handleAddTrackToPlaylist = useCallback(
    async (playlistId) => {
      if (!addToTrack) return
      try {
        const updated = await addToPlaylist(playlistId, addToTrack.id, addToTrack)
        setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)))
        toast(`已加入歌单《${updated.name}》`)
        setAddToTrack(null)
      } catch (e) {
        toast(e.message || '添加失败')
      }
    },
    [addToTrack, toast],
  )

  const handleTogglePlaylistSong = useCallback(
    async (track) => {
      if (!playlistDetail) return
      const trackId = track?.id
      if (!trackId) return
      const inList = (playlistDetail.trackIds || []).includes(trackId)
      try {
        const updated = inList
          ? await removeFromPlaylist(playlistDetail.id, trackId)
          : await addToPlaylist(playlistDetail.id, trackId, track)
        setPlaylists((prev) => prev.map((p) => (p.id === playlistDetail.id ? updated : p)))
        setPlaylistDetail(updated)
      } catch (e) {
        toast(e.message || '操作失败')
      }
    },
    [playlistDetail, toast],
  )

  const handleRemovePlaylistTrack = useCallback(
    async (trackId) => {
      if (!playlistDetail) return
      try {
        const updated = await removeFromPlaylist(playlistDetail.id, trackId)
        setPlaylists((prev) => prev.map((p) => (p.id === playlistDetail.id ? updated : p)))
        setPlaylistDetail(updated)
      } catch (e) {
        toast(e.message || '移除失败')
      }
    },
    [playlistDetail, toast],
  )

  const handleDeletePlaylist = useCallback(async () => {
    if (!playlistDetail) return
    if (!window.confirm(`确定删除歌单《${playlistDetail.name}》吗？`)) return
    try {
      await deletePlaylist(playlistDetail.id)
    } catch (e) {
      toast(e.message || '删除失败')
      return
    }
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistDetail.id))
    setPlaylistDetail(null)
    toast('歌单已删除')
  }, [playlistDetail, toast])

  const openPlaylist = useCallback((playlist) => {
    setPlaylistDetail(playlist)
  }, [])

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
      {visualizerOn && <LightCanvas analyser={analyser} playing={isPlaying} mode={effectMode} />}

      <Sidebar
        view={view}
        onChangeView={changeView}
        user={user}
        onOpenAuth={() => openAuth('login')}
        onLogout={handleLogout}
        visualizerOn={visualizerOn}
        onToggleVisualizer={toggleVisualizer}
        songCount={songs.length}
        playlistCount={playlists.length}
      />

      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/8 bg-abyss-950/75 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400">
          <Waveform size={17} weight="fill" className="text-white" />
        </div>
        <p className="text-sm font-bold tracking-wide text-white">LUMEN 流光音乐</p>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <button
              onClick={() => openAuth('login')}
              aria-label="登录"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/10 text-violet-200"
            >
              <User size={16} />
            </button>
          )}
          <button
            onClick={toggleVisualizer}
            aria-pressed={visualizerOn}
            aria-label="沉浸光效开关"
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              visualizerOn ? 'bg-gradient-to-br from-violet-500 to-cyan-400 text-white' : 'border border-white/10 text-mist-500'
            }`}
          >
            <Sparkle size={16} weight={visualizerOn ? 'fill' : 'regular'} />
          </button>
        </div>
      </header>

      <main className="relative z-10 pb-56 lg:pb-44 lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {playlistDetail ? (
            <motion.div key={`playlist-${playlistDetail.id}`} {...anim}>
              <PlaylistDetailView
                playlist={playlistDetail}
                songs={songs}
                user={user}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                isFav={isFav}
                hasLyrics={getLrcText}
                onBack={() => {
                  setPlaylistDetail(null)
                  setView('playlists')
                }}
                onPlayAll={(tracks) => tracks.length && playTrack(tracks[0], tracks)}
                onPlay={playTrack}
                onToggleFavorite={toggleFavorite}
                onAddToPlaylist={handleAddToPlaylistTrack}
                onRemoveTrack={handleRemovePlaylistTrack}
                onDeletePlaylist={handleDeletePlaylist}
                pickerOpen={pickerOpen}
                onTogglePicker={() => setPickerOpen((v) => !v)}
                onToggleSong={handleTogglePlaylistSong}
              />
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {view === 'discover' && (
                <motion.div key="discover" {...anim}>
                  <DiscoverView
                    songs={songs}
                    playlists={playlists}
                    rankings={rankings}
                    loading={songsLoading}
                    rankingsLoading={rankingsLoading}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    isFav={isFav}
                    hasLyrics={getLrcText}
                    onPlay={playTrack}
                    onToggleFavorite={toggleFavorite}
                    onAddToPlaylist={handleAddToPlaylistTrack}
                    onOpenPlaylist={openPlaylist}
                    onGoPlaylists={() => setView('playlists')}
                    onGoRankings={() => setView('rankings')}
                    onGoCloud={() => setView('cloud')}
                  />
                </motion.div>
              )}
              {view === 'search' && (
                <motion.div key="search" {...anim}>
                  <SearchView
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    isFav={isFav}
                    hasLyrics={getLrcText}
                    onPlay={playTrack}
                    onToggleFavorite={toggleFavorite}
                    onAddToPlaylist={handleAddToPlaylistTrack}
                  />
                </motion.div>
              )}
              {view === 'playlists' && (
                <motion.div key="playlists" {...anim}>
                  <PlaylistsView
                    playlists={playlists}
                    songs={songs}
                    loading={playlistsLoading}
                    user={user}
                    onOpenPlaylist={openPlaylist}
                    onCreate={handleCreatePlaylist}
                    onOpenAuth={() => openAuth('login', '登录后就能创建歌单')}
                  />
                </motion.div>
              )}
              {view === 'rankings' && (
                <motion.div key="rankings" {...anim}>
                  <RankingsView
                    rankings={rankings}
                    loading={rankingsLoading}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlay={playTrack}
                  />
                </motion.div>
              )}
              {view === 'cloud' && (
                <motion.div key="cloud" {...anim}>
                  <CloudView
                    user={user}
                    onGoSearch={() => setView('search')}
                  />
                </motion.div>
              )}
              {view === 'report' && (
                <motion.div key="report" {...anim}>
                  <ReportView
                    report={report}
                    loading={reportLoading}
                    user={user}
                    onOpenAuth={() => openAuth('login')}
                    onPlay={playTrack}
                  />
                </motion.div>
              )}
              {view === 'profile' && (
                <motion.div key="profile" {...anim}>
                  <ProfileView
                    user={user}
                    songs={songs}
                    favorites={favorites}
                    recentPlays={recentPlays}
                    playlists={playlists}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    isFav={isFav}
                    hasLyrics={getLrcText}
                    onOpenAuth={() => openAuth('login')}
                    onPlay={playTrack}
                    onToggleFavorite={toggleFavorite}
                    onAddToPlaylist={handleAddToPlaylistTrack}
                    onOpenPlaylist={openPlaylist}
                    onGoReport={() => changeView('report')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      <MobileTabs view={view} onChangeView={changeView} />

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying && !!currentTrack}
        currentTime={currentTime}
        onTogglePlay={togglePlay}
        onNext={next}
        onToggleFavorite={toggleFavorite}
        isFavorite={currentTrack ? isFav(currentTrack) : false}
        audio={audio}
        onOpenPlayer={() => setPlayerOpen(true)}
        onOpenQueue={() => setQueueOpen(true)}
        hasLyrics={!!currentLrc}
        visualizerOn={visualizerOn}
        onToggleVisualizer={toggleVisualizer}
        effectMode={effectMode}
        onEffectModeChange={setEffectMode}
      />

      <PlayerPage
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
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
        lrc={currentLrc}
        onFetchLyrics={fetchLyricsFor}
        onSeek={(t) => {
          try {
            audio.currentTime = t
          } catch {
            /* ignore */
          }
        }}
        onAddToPlaylist={handleAddToPlaylistTrack}
        effectMode={effectMode}
        onEffectModeChange={setEffectMode}
      />

      <QueuePanel
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        queue={queue}
        index={index}
        isPlaying={isPlaying}
        onPlayAt={playAt}
        onRemove={removeFromQueue}
        onClear={clearQueue}
      />

      <AddToPlaylistModal
        track={addToTrack}
        playlists={playlists.filter((p) => user && p.creatorId === user.id)}
        songs={songs}
        onClose={() => setAddToTrack(null)}
        onAdd={handleAddTrackToPlaylist}
        onCreate={handleCreatePlaylist}
      />

      <AuthModal
        open={authOpen}
        initialMode={authMode}
        message={authMessage}
        onClose={() => setAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <Toasts toasts={toasts} />
    </div>
  )
}
