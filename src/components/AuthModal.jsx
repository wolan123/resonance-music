import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Spinner, User, X } from '@phosphor-icons/react'
import { SparkleIcon } from './LightIcons'

export default function AuthModal({ open, initialMode = 'login', message = '', onClose, onLogin, onRegister }) {
  const [mode, setMode] = useState(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      setBusy(false)
    }
  }, [open, initialMode])

  async function submit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (mode === 'register') await onRegister(username.trim(), password)
      else await onLogin(username.trim(), password)
      setUsername('')
      setPassword('')
    } catch (err) {
      setError(err.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

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
            className="glass-strong fixed inset-x-4 top-1/2 z-[60] mx-auto w-full max-w-sm -translate-y-1/2 rounded-[1.8rem] p-7"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            role="dialog"
            aria-label="登录"
          >
            <button
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-4 top-4 rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 hover:text-white active:scale-90"
            >
              <X size={17} weight="bold" />
            </button>

            <div className="flex items-center gap-2">
              <SparkleIcon className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-bold text-white">{mode === 'login' ? '登录 LUMEN' : '注册账号'}</h2>
            </div>
            {message && <p className="mt-2 text-sm text-violet-300">{message}</p>}

            <div className="mt-4 flex rounded-2xl border border-white/10 bg-black/20 p-1">
              {[
                { key: 'login', label: '登录' },
                { key: 'register', label: '注册' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setMode(tab.key)
                    setError('')
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    mode === tab.key ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'text-mist-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-mist-500">用户名</span>
                <div className="relative mt-1.5">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-700" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="2-20 位字母、数字或中文"
                    autoComplete="username"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-mist-500">密码</span>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-700" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-mist-700 transition focus:border-violet-400/60 focus:outline-none"
                  />
                </div>
              </label>

              {error && <p className="text-sm text-pink-400">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="btn-glow flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Spinner size={16} className="animate-spin" />
                    请稍候…
                  </>
                ) : mode === 'login' ? (
                  '登录'
                ) : (
                  '注册并登录'
                )}
              </button>
              <p className="text-center text-xs leading-relaxed text-mist-700">
                登录后上传的歌会署上你的名字，也只有你能删除
              </p>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
