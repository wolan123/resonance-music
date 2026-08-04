import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowClockwise, Spinner, X } from '@phosphor-icons/react'
import { cloudRequest } from '../lib/cloud'

const PLATFORM_NAME = {
  netease: '网易云音乐',
  qq: 'QQ 音乐',
}

export default function QRLoginModal({ platform, mode = 'personal', open, onClose, onSuccess }) {
  const [image, setImage] = useState('')
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const sessionRef = useRef('')
  const timerRef = useRef(null)

  async function createQR() {
    setBusy(true)
    setStatus('loading')
    setMessage('')
    try {
      if (platform === 'netease') {
        const keyData = await cloudRequest('netease', mode === 'admin' ? 'adminQrKey' : 'qrKey')
        sessionRef.current = keyData.key || ''
        const qr = await cloudRequest('netease', 'qrCreate', { key: sessionRef.current })
        setImage(qr.qrimg || '')
        setStatus('waiting')
      } else {
        const qr = await cloudRequest('qq', mode === 'admin' ? 'adminQrCreate' : 'qrCreate')
        sessionRef.current = qr.cookie || ''
        setImage(qr.image || '')
        setStatus('waiting')
      }
    } catch (e) {
      setStatus('error')
      setMessage(e.message || '二维码获取失败')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (open) createQR()
  }, [open, platform, mode])

  useEffect(() => {
    if (!open || status !== 'waiting') return
    timerRef.current = setInterval(async () => {
      try {
        if (platform === 'netease') {
          const data = await cloudRequest('netease', mode === 'admin' ? 'adminQrCheck' : 'qrCheck', {
            key: sessionRef.current,
          })
          if (data.code === 802) {
            setMessage('已扫码，请在手机上确认')
          } else if (data.code === 800) {
            setMessage('请用网易云音乐 App 扫码')
          } else if (data.code === 803) {
            setStatus('success')
            setMessage('登录成功')
            onSuccess(mode === 'admin' ? data : data.cookie || '')
          } else if (data.code === 801) {
            setStatus('expired')
            setMessage('二维码已过期，点击刷新')
          }
        } else {
          const data = await cloudRequest('qq', mode === 'admin' ? 'adminQrPoll' : 'qrPoll', {
            cookie: sessionRef.current,
          })
          if (data.state === 'waiting') {
            setMessage('请用手机 QQ 扫码')
          } else if (data.state === 'success') {
            setStatus('success')
            setMessage('登录成功')
            onSuccess(mode === 'admin' ? data : data.cookie || '')
          } else if (data.state === 'expired') {
            setStatus('expired')
            setMessage('二维码已过期，点击刷新')
          } else if (data.state === 'canceled') {
            setStatus('waiting')
            setMessage('已取消，请重新扫码')
          } else if (data.state === 'failed') {
            setMessage('登录失败，请重试')
          }
        }
      } catch {
        /* poll errors are transient */
      }
    }, 2000)
    return () => clearInterval(timerRef.current)
  }, [open, platform, mode, status, onSuccess])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-4 top-1/2 z-[70] mx-auto w-full max-w-xs -translate-y-1/2 rounded-[1.6rem] p-6 text-center"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            role="dialog"
            aria-label="扫码登录"
          >
            <button
              onClick={onClose}
              aria-label="关闭扫码登录"
              className="absolute right-3 top-3 rounded-full bg-white/8 p-2 text-mist-300 transition hover:bg-white/15 active:scale-90"
            >
              <X size={16} weight="bold" />
            </button>
            <h2 className="text-base font-bold text-white">
              {mode === 'admin' ? '绑定共享会员' : `扫码登录 ${PLATFORM_NAME[platform]}`}
            </h2>
            <p className="mt-1 text-xs text-mist-500">
              {mode === 'admin' ? '绑定后全站用户可用该会员听歌，账号凭证不会公开' : '登录后即可用你的会员听歌'}
            </p>

            <div className="mx-auto mt-5 flex h-52 w-52 items-center justify-center rounded-2xl bg-white p-2">
              {image ? (
                <img src={image} alt="登录二维码" className="h-full w-full object-contain" />
              ) : (
                <Spinner size={28} className="animate-spin text-violet-400" />
              )}
            </div>

            <p className="mt-4 text-sm text-mist-400">
              {message || (busy ? '正在生成二维码…' : '等待扫码')}
            </p>

            {status === 'expired' || status === 'error' ? (
              <button
                onClick={createQR}
                className="btn-glow mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
              >
                <ArrowClockwise size={14} />
                刷新二维码
              </button>
            ) : (
              <button onClick={onClose} className="mt-3 text-xs text-mist-500 transition hover:text-white">
                暂不登录
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
