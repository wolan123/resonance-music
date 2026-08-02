import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Spinner, X } from '@phosphor-icons/react'
import PlaylistCover from './PlaylistCover'
import { SkeletonRows } from './Skeleton'

function CreatePlaylistModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      await onCreate(name.trim(), description.trim())
      setName('')
      setDescription('')
      onClose()
    } catch (err) {
      setError(err.message || '创建失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="glass-strong fixed inset-x-4 top-1/2 z-[60] mx-auto w-full max-w-sm -translate-y-1/2 rounded-[1.6rem] p-6"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            role="dialog"
            aria-label="创建歌单"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">创建歌单</h2>
              <button onClick={onClose} aria-label="关闭" className="ml-auto rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 active:scale-90">
                <X size={16} weight="bold" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-mist-500">歌单名称</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：深夜循环、开车必听"
                  maxLength={40}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-mist-500">简介（可选）</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                />
              </label>
              {error && <p className="text-sm text-pink-400">{error}</p>}
              <button type="submit" disabled={busy || !name.trim()} className="btn-glow flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold disabled:opacity-50">
                {busy ? <Spinner size={15} className="animate-spin" /> : <Plus size={16} weight="bold" />}
                创建歌单
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function PlaylistGrid({ playlists, songs, onOpenPlaylist, emptyText }) {
  if (playlists.length === 0) {
    return <p className="rounded-2xl bg-white/[0.03] px-4 py-8 text-center text-sm text-mist-500">{emptyText}</p>
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {playlists.map((pl) => (
        <button key={pl.id} onClick={() => onOpenPlaylist(pl)} className="group text-left">
          <PlaylistCover playlist={pl} songs={songs} className="aspect-square w-full rounded-2xl shadow-lg transition group-hover:scale-[1.02]" />
          <p className="mt-2 truncate text-sm font-semibold text-white">{pl.name}</p>
          <p className="truncate text-xs text-mist-500">
            {pl.creatorName} · {pl.trackIds.length}首
            {pl.playCount > 0 && ` · ${pl.playCount}次播放`}
          </p>
        </button>
      ))}
    </div>
  )
}

export default function PlaylistsView({
  playlists,
  songs,
  loading,
  user,
  onOpenPlaylist,
  onCreate,
  onOpenAuth,
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const mine = user ? playlists.filter((p) => p.creatorId === user.id) : []
  const others = playlists.filter((p) => !user || p.creatorId !== user.id)

  return (
    <section className="pt-6 lg:pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">歌单</h1>
        <button
          onClick={() => (user ? setCreateOpen(true) : onOpenAuth())}
          className="btn-glow flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
        >
          <Plus size={15} weight="bold" />
          创建歌单
        </button>
      </div>
      <p className="mt-1 text-sm text-mist-500">把喜欢的歌装进自己的歌单，分享给所有人</p>

      {loading ? (
        <div className="mt-6"><SkeletonRows count={6} /></div>
      ) : (
        <>
          {user && (
            <div className="mt-6">
              <h2 className="text-base font-bold text-white">我的歌单</h2>
              <div className="mt-3">
                <PlaylistGrid playlists={mine} songs={songs} onOpenPlaylist={onOpenPlaylist} emptyText="还没有创建歌单，点右上角创建第一个" />
              </div>
            </div>
          )}
          <div className="mt-7">
            <h2 className="text-base font-bold text-white">歌单广场</h2>
            <div className="mt-3">
              <PlaylistGrid playlists={others} songs={songs} onOpenPlaylist={onOpenPlaylist} emptyText="还没有人创建歌单，来做第一个" />
            </div>
          </div>
        </>
      )}

      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={onCreate} />
    </section>
  )
}
