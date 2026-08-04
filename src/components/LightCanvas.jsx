import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../lib/visualizer'

function rand(min, max) {
  return min + Math.random() * (max - min)
}

export default function LightCanvas({ analyser, playing, mode = 'dynamic' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const beatRef = useRef({ prev: 0, last: 0, waves: [] })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
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
      { x: 0.18, y: 0.22, r: 0.5, hue: 265, drift: 1 },
      { x: 0.82, y: 0.58, r: 0.55, hue: 190, drift: -0.8 },
      { x: 0.5, y: 0.98, r: 0.52, hue: 325, drift: 0.6 },
      { x: 0.3, y: 0.75, r: 0.4, hue: 215, drift: 0.45 },
    ]
    const count = Math.max(42, Math.floor(w / 15))
    const parts = Array.from({ length: count }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      vy: 0.0002 + Math.random() * 0.0008,
      vx: (Math.random() - 0.5) * 0.00018,
      a: 0.1 + Math.random() * 0.4,
      tw: Math.random() * Math.PI * 2,
      hue: 250 + Math.random() * 110,
    }))

    function frame(t) {
      const time = t / 1000
      const now = performance.now()
      c.fillStyle = 'rgba(5,6,10,0.28)'
      c.fillRect(0, 0, w, h)

      let level = 0
      let bass = 0
      let treble = 0
      const data = analyser ? getFrequencyData(analyser) : null
      if (data) {
        let sum = 0
        for (let i = 0; i < 64; i += 1) sum += data[i]
        level = sum / (64 * 255)
        let bsum = 0
        for (let i = 0; i < 8; i += 1) bsum += data[i]
        bass = bsum / (8 * 255)
        let tsum = 0
        for (let i = 48; i < 96; i += 1) tsum += data[i]
        treble = tsum / (48 * 255)
      }
      if (!playing) {
        level = Math.max(level, 0.05)
        bass = 0
        treble = 0
      }

      const bst = beatRef.current
      const isBeat = bass > 0.32 && bass > bst.prev * 1.18 && now - bst.last > 260
      if (isBeat) {
        bst.last = now
        bst.waves.push({ t: 0, r: Math.min(w, h) * 0.06, a: 0.85 })
        if (bst.waves.length > 8) bst.waves.shift()
      }
      const beatIntensity = Math.max(0, 1 - (now - bst.last) / 420)
      bst.prev = bst.prev * 0.55 + bass * 0.45
      bst.waves = bst.waves.filter((wave) => {
        wave.t += 0.018 + beatIntensity * 0.02
        wave.r += (Math.min(w, h) * 0.045 + level * Math.min(w, h) * 0.03) * wave.t
        wave.a *= 0.955
        return wave.a > 0.02
      })

      const cx = w / 2
      const cy = h * (mode === 'dynamic' ? 0.56 : 0.52)

      c.save()
      c.globalCompositeOperation = 'lighter'

      // aurora blobs
      const auroraBoost = mode === 'aurora' ? 1.8 : mode === 'pulse' ? 0.7 : 0.9
      for (const b of blobs) {
        const bx = (b.x + Math.sin(time * 0.08 * b.drift + b.hue) * 0.09) * w
        const by = (b.y + Math.cos(time * 0.06 * b.drift) * 0.07) * h
        const br = Math.max(w, h) * b.r * (0.8 + level * 0.9) * auroraBoost
        const grad = c.createRadialGradient(bx, by, 0, bx, by, br)
        const hue = (b.hue + Math.sin(time * 0.12 + b.drift) * 18) % 360
        grad.addColorStop(0, `hsla(${hue}, 88%, 64%, ${(0.1 + level * 0.12) * auroraBoost})`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        c.fillStyle = grad
        c.fillRect(0, 0, w, h)
      }

      // center glow
      const pulse = 0.09 + level * 0.34 + (mode === 'pulse' ? beatIntensity * 0.3 : 0)
      const glowR = Math.min(w, h) * (0.34 + beatIntensity * 0.3)
      const g2 = c.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      g2.addColorStop(0, `rgba(139,92,246,${pulse})`)
      g2.addColorStop(0.45, `rgba(34,211,238,${pulse * 0.5})`)
      g2.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g2
      c.fillRect(0, 0, w, h)

      // shockwaves (pulse & dynamic)
      if (mode !== 'aurora') {
        for (const wave of bst.waves) {
          c.globalAlpha = wave.a * 0.9
          c.strokeStyle = `hsla(${(265 + wave.t * 60) % 360}, 92%, 68%, 1)`
          c.lineWidth = 2 + wave.a * 4
          c.shadowColor = `hsla(${(265 + wave.t * 60) % 360}, 92%, 62%, 1)`
          c.shadowBlur = 18
          c.beginPath()
          c.arc(cx, cy, wave.r, 0, Math.PI * 2)
          c.stroke()
          c.shadowBlur = 0
        }
        c.globalAlpha = 1
      }

      // rotating radial beams (dynamic)
      if (mode === 'dynamic' && playing) {
        c.save()
        c.translate(cx, cy)
        c.rotate(time * 0.55)
        const beams = 16
        for (let i = 0; i < beams; i += 1) {
          c.rotate((Math.PI * 2) / beams)
          const len = (60 + level * 240) * (0.7 + 0.3 * Math.sin(time * 2 + i))
          const hue = (265 + i * 8 + time * 24) % 360
          c.globalAlpha = 0.1 + level * 0.28
          const grad = c.createLinearGradient(0, 0, len, 0)
          grad.addColorStop(0, `hsla(${hue}, 95%, 66%, 0.9)`)
          grad.addColorStop(1, 'hsla(0,0%,0%,0)')
          c.fillStyle = grad
          c.shadowColor = `hsla(${hue}, 95%, 62%, 0.8)`
          c.shadowBlur = 14
          c.beginPath()
          c.moveTo(0, -4 - level * 4)
          c.lineTo(len, 0)
          c.lineTo(0, 4 + level * 4)
          c.closePath()
          c.fill()
        }
        c.restore()
        c.globalAlpha = 1
        c.shadowBlur = 0
      }

      // circular spectrum ring (dynamic / aurora)
      if (data && playing && (mode === 'dynamic' || mode === 'aurora')) {
        const ringR = Math.min(w, h) * (mode === 'dynamic' ? 0.4 : 0.46)
        const n = mode === 'dynamic' ? 72 : 56
        c.save()
        c.translate(cx, cy)
        c.rotate(mode === 'aurora' ? time * 0.12 : -time * 0.3)
        for (let i = 0; i < n; i += 1) {
          const idx = Math.floor((i / n) * 96)
          const v = data[idx] / 255
          const ang = (i / n) * Math.PI * 2
          const rr = ringR + v * (mode === 'dynamic' ? 34 : 46) + beatIntensity * 10
          const hue = (260 + (i / n) * 100 + time * 18) % 360
          c.globalAlpha = 0.35 + v * 0.6
          c.strokeStyle = `hsla(${hue}, 92%, 66%, 1)`
          c.lineWidth = 2 + v * 3
          c.shadowColor = `hsla(${hue}, 92%, 60%, 0.8)`
          c.shadowBlur = 8
          c.beginPath()
          c.arc(0, 0, rr, ang, ang + Math.PI / n + 0.03)
          c.stroke()
        }
        c.restore()
        c.globalAlpha = 1
        c.shadowBlur = 0
      }

      // spectrum bars (dynamic)
      if (data && playing && mode === 'dynamic') {
        const barCount = Math.min(84, Math.floor(w / 11))
        const gap = 3
        const bw = (w - gap * (barCount - 1)) / barCount
        const maxH = h * 0.38
        const wheelOffset = (time * 34) % 360
        for (let i = 0; i < barCount; i += 1) {
          const idx = Math.floor((i / barCount) * 96)
          const v = data[idx] / 255
          const bh = Math.max(2, v * maxH * (1 + beatIntensity * 0.35))
          const x = i * (bw + gap)
          const y = h - bh
          const hue = (265 + (i / barCount) * 100 + wheelOffset) % 360
          c.fillStyle = `hsla(${hue}, 92%, 65%, 0.95)`
          c.shadowColor = `hsla(${hue}, 92%, 60%, 0.9)`
          c.shadowBlur = 10 + v * 22
          c.beginPath()
          if (typeof c.roundRect === 'function') c.roundRect(x, y, bw, bh, 3)
          else c.rect(x, y, bw, bh)
          c.fill()
        }
        c.shadowBlur = 0
      }

      // aurora: flowing light ribbons
      if (mode === 'aurora') {
        c.save()
        for (let i = 0; i < 5; i += 1) {
          const baseY = h * (0.3 + i * 0.12)
          const amp = 26 + level * 90
          const hue = (200 + i * 26 + Math.sin(time * 0.2 + i) * 20) % 360
          c.globalAlpha = 0.14 + level * 0.2
          c.strokeStyle = `hsla(${hue}, 90%, 66%, 1)`
          c.lineWidth = 2
          c.shadowColor = `hsla(${hue}, 90%, 60%, 0.7)`
          c.shadowBlur = 12
          c.beginPath()
          for (let x = 0; x <= w; x += 12) {
            const y = baseY + Math.sin(x * 0.008 + time * 0.8 + i * 1.7) * amp
            if (x === 0) c.moveTo(x, y)
            else c.lineTo(x, y)
          }
          c.stroke()
        }
        c.restore()
        c.globalAlpha = 1
        c.shadowBlur = 0
      }

      // pulse: spectrum dots on rings
      if (data && playing && mode === 'pulse') {
        const n = 36
        const baseR = Math.min(w, h) * 0.34
        c.save()
        c.translate(cx, cy)
        for (let i = 0; i < n; i += 1) {
          const idx = Math.floor((i / n) * 96)
          const v = data[idx] / 255
          const ang = (i / n) * Math.PI * 2 + time * 0.4
          const rr = baseR + v * 60 + beatIntensity * 16
          const hue = (265 + (i / n) * 120) % 360
          c.globalAlpha = 0.5 + v * 0.5
          c.fillStyle = `hsla(${hue}, 92%, 66%, 1)`
          c.shadowColor = `hsla(${hue}, 92%, 60%, 0.9)`
          c.shadowBlur = 10 + v * 14
          c.beginPath()
          c.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, 2 + v * 4, 0, Math.PI * 2)
          c.fill()
        }
        c.restore()
        c.globalAlpha = 1
        c.shadowBlur = 0
      }

      // particles with glow & trails
      c.save()
      for (const p of parts) {
        p.y -= p.vy * (0.5 + level * 3.5 + beatIntensity * 1.2)
        p.x += p.vx + Math.sin(time * 0.5 + p.tw) * 0.00024
        p.tw += 0.009
        if (p.y < -0.02) {
          p.y = 1.02
          p.x = Math.random()
        }
        if (p.x < -0.02) p.x = 1.02
        if (p.x > 1.02) p.x = -0.02
        c.globalAlpha = Math.min(1, p.a * (0.4 + level * 2.4))
        c.shadowColor = `hsla(${p.hue}, 90%, 76%, 0.95)`
        c.shadowBlur = 10
        c.fillStyle = `hsla(${p.hue}, 92%, 82%, 1)`
        c.beginPath()
        c.arc(p.x * w, p.y * h, p.r * (1 + level * 2.2 + beatIntensity * 0.9), 0, Math.PI * 2)
        c.fill()
      }
      c.restore()
      c.globalAlpha = 1
      c.shadowBlur = 0

      // corner vignette
      const vg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.8)
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(2,3,6,0.55)')
      c.fillStyle = vg
      c.fillRect(0, 0, w, h)

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
