import { useRef, useState } from 'react'
import { CheckCircle, CloudArrowUp, FileAudio, FileText, SignIn, Spinner, X } from '@phosphor-icons/react'
import { parseAudioFile } from '../lib/metadata'
import { uploadFileToBlob } from '../lib/upload'
import { registerSong } from '../lib/api'

export default function UploadView({ user, onUploaded, onRequireAuth }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [file, setFile] = useState(null)
  const [lrcText, setLrcText] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [uploader, setUploader] = useState('')
  const [durationMs, setDurationMs] = useState(0)
  const [artworkBlob, setArtworkBlob] = useState(null)
  const [artworkUrl, setArtworkUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setFile(null)
    setLrcText('')
    setTitle('')
    setArtist('')
    setAlbum('')
    setDurationMs(0)
    setArtworkBlob(null)
    setArtworkUrl(null)
    setError('')
  }

  async function handleFiles(files) {
    setError('')
    const audioFile = [...files].find(
      (f) => f.type.startsWith('audio/') || /\.(mp3|m4a|flac|wav|ogg|opus|aac|mp4)$/i.test(f.name),
    )
    const lrcFile = [...files].find((f) => f.name.toLowerCase().endsWith('.lrc'))
    if (!audioFile) {
      setError('请选择音频文件（MP3 / FLAC / M4A / WAV / OGG）')
      return
    }
    setBusy(true)
    setStep('读取歌曲信息…')
    try {
      const meta = await parseAudioFile(audioFile)
      setFile(audioFile)
      setTitle(meta.title)
      setArtist(meta.artist)
      setAlbum(meta.album)
      setDurationMs(meta.durationMs)
      if (meta.artworkBlob) {
        setArtworkBlob(meta.artworkBlob)
        setArtworkUrl(URL.createObjectURL(meta.artworkBlob))
      }
      if (lrcFile) {
        setLrcText(await lrcFile.text())
      } else if (meta.lrc) {
        setLrcText(meta.lrc)
      }
    } catch (e) {
      setError(`读取歌曲信息失败：${e.message}`)
    } finally {
      setBusy(false)
      setStep('')
    }
  }

  async function handleSubmit() {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setStep('正在上传音频…')
      const audioUrl = await uploadFileToBlob(file, 'audio')
      let coverUrl = null
      if (artworkBlob) {
        setStep('正在上传封面…')
        const coverFile = new File([artworkBlob], 'cover.jpg', { type: artworkBlob.type || 'image/jpeg' })
        coverUrl = await uploadFileToBlob(coverFile, 'image')
      }
      setStep('正在登记歌曲…')
      const song = await registerSong({
        title: title || file.name.replace(/\.[^.]+$/, ''),
        artist,
        album,
        durationMs,
        audioUrl,
        artworkUrl: coverUrl,
        lrc: lrcText.trim() || null,
        uploader: uploader.trim() || '匿名听众',
      })
      reset()
      onUploaded(song)
    } catch (e) {
      setError(e.message || '上传失败，请重试')
    } finally {
      setBusy(false)
      setStep('')
    }
  }

  return (
    <section className="mx-auto max-w-2xl pt-8 lg:pt-14">
      <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">上传音乐</h1>
      <p className="mt-1 text-sm text-mist-500">上传后所有人都会在音乐大厅听到这首歌。请只上传你有权分享的音乐。</p>

      {!user ? (
        <div className="glass mt-6 flex flex-col items-center gap-4 rounded-[2rem] p-12 text-center">
          <SignIn size={34} className="text-violet-400" />
          <p className="text-lg font-semibold text-white">登录后才能上传</p>
          <p className="max-w-sm text-sm leading-relaxed text-mist-500">登录后，你上传的歌会署上你的名字，也只有你能删除。</p>
          <button onClick={onRequireAuth} className="btn-glow rounded-full px-5 py-2.5 text-sm font-semibold">
            去登录 / 注册
          </button>
        </div>
      ) : !file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="选择音乐文件"
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !busy) inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            handleFiles(e.dataTransfer?.files || [])
          }}
          className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed px-6 py-14 text-center transition ${
            drag
              ? 'scale-[1.01] border-violet-400/70 bg-violet-500/10'
              : 'border-white/15 bg-white/[0.03] hover:border-violet-400/50 hover:bg-white/[0.05]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="audio/*,.lrc"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files || [])
              e.target.value = ''
            }}
          />
          <CloudArrowUp size={40} className="text-violet-400" />
          <div>
            <p className="text-base font-semibold text-white">拖进来，或者点这里选择文件</p>
            <p className="mt-1 text-xs text-mist-500">支持 MP3 / FLAC / M4A / WAV / OGG；可以同时选择 .lrc 歌词</p>
          </div>
          {busy && (
            <p className="flex items-center gap-2 text-sm text-cyan-300">
              <Spinner size={15} className="animate-spin" />
              {step}
            </p>
          )}
        </div>
      ) : (
        <div className="glass mt-6 rounded-[2rem] p-6">
          <div className="flex items-start gap-4">
            {artworkUrl ? (
              <img src={artworkUrl} alt="封面" className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-white/10" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/30 ring-1 ring-white/10">
                <FileAudio size={28} className="text-violet-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{file.name}</p>
              <p className="mt-0.5 text-xs text-mist-500">{(file.size / 1024 / 1024).toFixed(1)} MB · 自动读取了元数据和封面</p>
              <button
                onClick={reset}
                disabled={busy}
                className="mt-2 flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-mist-500 transition hover:text-white disabled:opacity-50"
              >
                <X size={13} />
                换一个文件
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-mist-500">歌曲标题</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-mist-500">歌手</span>
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-mist-500">专辑</span>
                <input
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-mist-500">你的名字（会显示在歌曲上）</span>
              <input
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                placeholder="匿名听众"
                maxLength={40}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-mist-500">
                <FileText size={13} />
                歌词（LRC 格式，可选）
              </span>
              <textarea
                value={lrcText}
                onChange={(e) => setLrcText(e.target.value)}
                rows={5}
                placeholder="[00:00.00] 第一句歌词&#10;[00:03.00] 第二句歌词"
                className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 font-mono text-xs leading-relaxed text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
              />
            </label>
          </div>

          {error && <p className="mt-4 text-sm text-pink-400">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={busy || !title.trim()}
            className="btn-glow mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold disabled:opacity-50"
          >
            {busy ? (
              <>
                <Spinner size={16} className="animate-spin" />
                {step}
              </>
            ) : (
              <>
                <CheckCircle size={17} weight="fill" />
                发布到音乐大厅
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
