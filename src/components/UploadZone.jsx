import { useRef, useState } from 'react'
import { CloudArrowUp } from '@phosphor-icons/react'
import { SparkleIcon } from './KleeIcons'

export default function UploadZone({ onFiles, busy, current }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)

  function pick(files) {
    if (!busy && files?.length) onFiles([...files])
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="上传音乐文件"
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
        pick(e.dataTransfer?.files)
      }}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed px-6 py-10 text-center transition ${
        drag ? 'scale-[1.01] border-klee-400 bg-skin-50' : 'border-skin-300 bg-white hover:border-klee-300 hover:bg-skin-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,.lrc"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="flex items-center gap-2">
        <CloudArrowUp size={28} className="text-klee-500" />
        <SparkleIcon className="h-5 w-5 text-gold-400 animate-twinkle" />
      </div>
      <div>
        <p className="font-display text-lg text-cocoa-900">把歌拖进来，或者点这里选择文件</p>
        <p className="mt-1 text-sm text-cocoa-400">支持 MP3 / FLAC / M4A / WAV / OGG；.lrc 歌词文件会自动配对</p>
      </div>
      {busy && <p className="text-sm font-medium text-klee-600">{current ? `正在装进蹦蹦背包：${current}` : '整理中…'}</p>}
    </div>
  )
}
