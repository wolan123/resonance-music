import { SparkleIcon } from './LightIcons'

export default function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass-strong pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white animate-pop"
        >
          <SparkleIcon className="h-4 w-4 shrink-0 text-cyan-300" />
          {t.text}
        </div>
      ))}
    </div>
  )
}
