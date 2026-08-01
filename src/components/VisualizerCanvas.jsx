import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../lib/visualizer'

function drawSparkle(c, x, y, r) {
  c.beginPath()
  c.moveTo(x, y - r)
  c.quadraticCurveTo(x, y, x + r, y)
  c.quadraticCurveTo(x, y, x, y + r)
  c.quadraticCurveTo(x, y, x - r, y)
  c.quadraticCurveTo(x, y, x, y - r)
  c.fill()
}

function rr(c, x, y, w, h, r) {
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r)
  } else {
    c.rect(x, y, w, h)
  }
}

export default function VisualizerCanvas({ analyser, playing }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const particles = Array.from({ length: 36 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 2.4,
      vy: 0.12 + Math.random() * 0.45,
      vx: (Math.random() - 0.5) * 0.22,
      alpha: 0.18 + Math.random() * 0.45,
      tw: Math.random() * Math.PI * 2,
    }))

    function frame() {
      c.clearRect(0, 0, width, height)
      const data = analyser ? getFrequencyData(analyser) : null
      let level = 0
      if (data) {
        let sum = 0
        for (let i = 0; i < 32; i += 1) sum += data[i]
        level = sum / (32 * 255)
      }
      const t = performance.now() / 1000

      // bass-reactive glow
      const glow = 0.05 + level * 0.32
      const g = c.createRadialGradient(width / 2, height + 100, 10, width / 2, height + 100, Math.max(width * 0.45, 260))
      g.addColorStop(0, `rgba(229,72,77,${glow})`)
      g.addColorStop(0.55, `rgba(255,197,61,${glow * 0.5})`)
      g.addColorStop(1, 'rgba(255,197,61,0)')
      c.fillStyle = g
      c.fillRect(0, 0, width, height)

      // frequency bars with glow
      if (data && playing && analyser) {
        const barCount = Math.min(48, Math.floor(width / 16))
        const gap = 5
        const bw = (width - gap * (barCount - 1)) / barCount
        const maxH = height * 0.2
        c.save()
        for (let i = 0; i < barCount; i += 1) {
          const idx = Math.floor((i / barCount) * 96)
          const v = data[idx] / 255
          const h = Math.max(2, v * maxH)
          const x = i * (bw + gap)
          const y = height - h
          const grad = c.createLinearGradient(0, y, 0, height)
          grad.addColorStop(0, '#f56f74')
          grad.addColorStop(0.55, '#e5484d')
          grad.addColorStop(1, '#ffc53d')
          c.shadowColor = 'rgba(229,72,77,0.8)'
          c.shadowBlur = 8 + v * 16
          c.fillStyle = grad
          c.beginPath()
          rr(c, x, y, bw, h, 4)
          c.fill()
        }
        c.restore()
      }

      // floating sparkles
      for (const p of particles) {
        p.y -= p.vy * (0.6 + level * 2.2)
        p.x += p.vx + Math.sin(t * 1.3 + p.tw) * 0.22
        p.tw += 0.02
        if (p.y < -12) {
          p.y = height + 12
          p.x = Math.random() * width
        }
        if (p.x < -12) p.x = width + 12
        if (p.x > width + 12) p.x = -12
        c.save()
        c.globalAlpha = Math.min(1, p.alpha * (0.5 + level * 1.6))
        c.shadowColor = '#ffc53d'
        c.shadowBlur = 8
        c.fillStyle = '#ffd977'
        drawSparkle(c, p.x, p.y, p.r * (1 + level))
        c.restore()
      }

      if (!reduced) rafRef.current = requestAnimationFrame(frame)
    }

    frame()
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [analyser, playing])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  )
}
