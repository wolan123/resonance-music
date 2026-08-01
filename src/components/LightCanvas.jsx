import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../lib/visualizer'

export default function LightCanvas({ analyser, playing, mode = 'dynamic' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const beatRef = useRef({ prev: 0, last: 0 })

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
      { x: 0.18, y: 0.22, r: 0.45, hue: 265, drift: 1 },
      { x: 0.82, y: 0.58, r: 0.5, hue: 190, drift: -0.8 },
      { x: 0.5, y: 0.98, r: 0.48, hue: 325, drift: 0.6 },
    ]
    const count = Math.max(28, Math.floor(w / 22))
    const parts = Array.from({ length: count }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.9,
      vy: 0.0002 + Math.random() * 0.0007,
      vx: (Math.random() - 0.5) * 0.00015,
      a: 0.08 + Math.random() * 0.35,
      tw: Math.random() * Math.PI * 2,
    }))

    function frame(t) {
      const time = t / 1000
      const now = performance.now()
      c.fillStyle = 'rgba(5,6,10,0.3)'
      c.fillRect(0, 0, w, h)

      let level = 0
      let bass = 0
      const data = analyser ? getFrequencyData(analyser) : null
      if (data) {
        let sum = 0
        for (let i = 0; i < 32; i += 1) sum += data[i]
        level = sum / (32 * 255)
        let bsum = 0
        for (let i = 0; i < 8; i += 1) bsum += data[i]
        bass = bsum / (8 * 255)
      }

      const beatRefNow = beatRef.current
      const isBeat = bass > 0.34 && bass > beatRefNow.prev * 1.16 && now - beatRefNow.last > 280
      if (isBeat) beatRefNow.last = now
      const beatIntensity = Math.max(0, 1 - (now - beatRefNow.last) / 380)
      beatRefNow.prev = beatRefNow.prev * 0.55 + bass * 0.45

      // base aurora
      c.save()
      c.globalCompositeOperation = 'lighter'
      const auroraBoost = mode === 'aurora' ? 1.6 : 0.8
      for (const b of blobs) {
        const bx = (b.x + Math.sin(time * 0.08 * b.drift + b.hue) * 0.08) * w
        const by = (b.y + Math.cos(time * 0.06 * b.drift) * 0.06) * h
        const br = Math.max(w, h) * b.r * (0.85 + level * 0.6) * auroraBoost
        const grad = c.createRadialGradient(bx, by, 0, bx, by, br)
        grad.addColorStop(0, `hsla(${b.hue}, 85%, 62%, ${(0.09 + level * 0.09) * auroraBoost})`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        c.fillStyle = grad
        c.fillRect(0, 0, w, h)
      }

      // center glow (pulse mode stronger)
      const cx = w / 2
      const cy = h * 0.55
      const pulse = 0.08 + level * 0.3 + (mode === 'pulse' ? beatIntensity * 0.25 : 0)
      const g2 = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * (0.3 + beatIntensity * 0.25))
      g2.addColorStop(0, `rgba(139,92,246,${pulse})`)
      g2.addColorStop(0.5, `rgba(34,211,238,${pulse * 0.45})`)
      g2.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g2
      c.fillRect(0, 0, w, h)

      // pulse mode: beat rings
      if (mode === 'pulse' && beatIntensity > 0.02) {
        for (let i = 0; i < 3; i += 1) {
          const phase = (beatIntensity + i / 3) % 1
          const radius = phase * Math.min(w, h) * 0.55
          c.globalAlpha = (1 - phase) * 0.7
          c.strokeStyle = `hsla(${265 + i * 40}, 90%, 68%, 1)`
          c.lineWidth = 2 + beatIntensity * 3
          c.beginPath()
          c.arc(cx, cy, radius, 0, Math.PI * 2)
          c.stroke()
        }
        c.globalAlpha = 1
      }
      c.restore()

      // spectrum bars
      if (data && playing && analyser && mode !== 'pulse') {
        const barCount = Math.min(80, Math.floor(w / (mode === 'dynamic' ? 12 : 18)))
        const gap = mode === 'dynamic' ? 3 : 5
        const bw = (w - gap * (barCount - 1)) / barCount
        const maxH = h * (mode === 'dynamic' ? 0.4 : 0.28)
        c.save()
        c.globalCompositeOperation = 'lighter'
        const wheelOffset = mode === 'dynamic' ? (time * 30) % 360 : 0
        for (let i = 0; i < barCount; i += 1) {
          const idx = Math.floor((i / barCount) * 96)
          const v = data[idx] / 255
          const bh = Math.max(2, v * maxH * (1 + beatIntensity * 0.3))
          const x = i * (bw + gap)
          const y = h - bh
          const hue =
            mode === 'dynamic' ? (265 + (i / barCount) * 100 + wheelOffset) % 360 : 265 + (i / barCount) * 90
          c.fillStyle = `hsla(${hue}, 92%, 65%, 0.95)`
          c.shadowColor = `hsla(${hue}, 92%, 60%, 0.9)`
          c.shadowBlur = 10 + v * 20
          c.beginPath()
          if (typeof c.roundRect === 'function') c.roundRect(x, y, bw, bh, 3)
          else c.rect(x, y, bw, bh)
          c.fill()
        }
        c.restore()
      }

      // dynamic: rotating light wheel at bottom center
      if (mode === 'dynamic' && playing) {
        const wheelX = w / 2
        const wheelY = h - 24
        c.save()
        c.globalCompositeOperation = 'lighter'
        c.translate(wheelX, wheelY)
        c.rotate(time * 0.9)
        const spokes = 12
        for (let i = 0; i < spokes; i += 1) {
          c.rotate((Math.PI * 2) / spokes)
          c.globalAlpha = 0.16 + level * 0.3
          c.fillStyle = i % 2 === 0 ? '#8b5cf6' : '#22d3ee'
          c.shadowColor = '#8b5cf6'
          c.shadowBlur = 18
          c.beginPath()
          c.moveTo(0, 0)
          c.lineTo(24 + level * 90, -5)
          c.lineTo(24 + level * 90, 5)
          c.closePath()
          c.fill()
        }
        c.restore()
        c.globalAlpha = 1
      }

      // particles
      c.save()
      for (const p of parts) {
        p.y -= p.vy * (0.5 + level * 3 + beatIntensity)
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
        c.arc(p.x * w, p.y * h, p.r * (1 + level * 2 + beatIntensity * 0.8), 0, Math.PI * 2)
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
  }, [analyser, playing, mode])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden="true" />
}
