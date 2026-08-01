import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../lib/visualizer'

export default function LightCanvas({ analyser, playing }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const blobs = [
      { x: 0.2, y: 0.25, r: 0.42, hue: 265, drift: 1 },
      { x: 0.8, y: 0.6, r: 0.5, hue: 190, drift: -0.8 },
      { x: 0.5, y: 0.95, r: 0.45, hue: 320, drift: 0.6 },
    ]
    const count = Math.max(28, Math.floor(w / 22))
    const parts = Array.from({ length: count }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.8,
      vy: 0.0002 + Math.random() * 0.0007,
      vx: (Math.random() - 0.5) * 0.00015,
      a: 0.08 + Math.random() * 0.35,
      tw: Math.random() * Math.PI * 2,
    }))

    function frame(t) {
      const time = t / 1000
      c.fillStyle = 'rgba(5,6,10,0.3)'
      c.fillRect(0, 0, w, h)

      let level = 0
      const data = analyser ? getFrequencyData(analyser) : null
      if (data) {
        let sum = 0
        for (let i = 0; i < 32; i += 1) sum += data[i]
        level = sum / (32 * 255)
      }

      c.save()
      c.globalCompositeOperation = 'lighter'
      for (const b of blobs) {
        const bx = (b.x + Math.sin(time * 0.08 * b.drift + b.hue) * 0.08) * w
        const by = (b.y + Math.cos(time * 0.06 * b.drift) * 0.06) * h
        const br = Math.max(w, h) * b.r * (0.85 + level * 0.5)
        const grad = c.createRadialGradient(bx, by, 0, bx, by, br)
        grad.addColorStop(0, `hsla(${b.hue}, 85%, 62%, ${0.1 + level * 0.08})`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        c.fillStyle = grad
        c.fillRect(0, 0, w, h)
      }
      c.restore()

      const cx = w / 2
      const cy = h * 0.58
      const pulse = 0.1 + level * 0.38
      const g2 = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.38)
      g2.addColorStop(0, `rgba(139,92,246,${pulse})`)
      g2.addColorStop(0.5, `rgba(34,211,238,${pulse * 0.4})`)
      g2.addColorStop(1, 'rgba(0,0,0,0)')
      c.save()
      c.globalCompositeOperation = 'lighter'
      c.fillStyle = g2
      c.fillRect(0, 0, w, h)
      c.restore()

      if (data && playing && analyser) {
        const barCount = Math.min(72, Math.floor(w / 18))
        const gap = 4
        const bw = (w - gap * (barCount - 1)) / barCount
        const maxH = h * 0.34
        c.save()
        c.globalCompositeOperation = 'lighter'
        for (let i = 0; i < barCount; i += 1) {
          const idx = Math.floor((i / barCount) * 96)
          const v = data[idx] / 255
          const bh = Math.max(2, v * maxH)
          const x = i * (bw + gap)
          const y = h - bh
          const hue = 265 + (i / barCount) * 90
          c.fillStyle = `hsla(${hue}, 90%, 65%, 0.9)`
          c.shadowColor = `hsla(${hue}, 90%, 60%, 0.9)`
          c.shadowBlur = 10 + v * 18
          c.beginPath()
          if (typeof c.roundRect === 'function') c.roundRect(x, y, bw, bh, 3)
          else c.rect(x, y, bw, bh)
          c.fill()
        }
        c.restore()
      }

      c.save()
      for (const p of parts) {
        p.y -= p.vy * (0.5 + level * 3)
        p.x += p.vx + Math.sin(time * 0.5 + p.tw) * 0.0002
        p.tw += 0.008
        if (p.y < -0.02) {
          p.y = 1.02
          p.x = Math.random()
        }
        if (p.x < -0.02) p.x = 1.02
        if (p.x > 1.02) p.x = -0.02
        c.globalAlpha = Math.min(1, p.a * (0.4 + level * 2))
        c.shadowColor = 'rgba(167,139,250,0.9)'
        c.shadowBlur = 8
        c.fillStyle = `hsla(${260 + level * 40}, 90%, 80%, 1)`
        c.beginPath()
        c.arc(p.x * w, p.y * h, p.r * (1 + level * 2), 0, Math.PI * 2)
        c.fill()
      }
      c.restore()

      if (!reduced) rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [analyser, playing])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden="true" />
}
