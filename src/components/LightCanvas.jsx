import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../lib/visualizer'

const TAU = Math.PI * 2

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
    const count = Math.max(60, Math.floor(w / 12))
    const parts = Array.from({ length: count }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 2.0,
      vy: 0.00025 + Math.random() * 0.0009,
      vx: (Math.random() - 0.5) * 0.0002,
      a: 0.12 + Math.random() * 0.42,
      tw: Math.random() * TAU,
      hue: 250 + Math.random() * 110,
    }))

    function readLevels() {
      let level = 0
      let bass = 0
      let mid = 0
      let treble = 0
      const data = analyser ? getFrequencyData(analyser) : null
      if (data) {
        let sum = 0
        for (let i = 0; i < 64; i += 1) sum += data[i]
        level = sum / (64 * 255)
        let bsum = 0
        for (let i = 0; i < 8; i += 1) bsum += data[i]
        bass = bsum / (8 * 255)
        let msum = 0
        for (let i = 8; i < 48; i += 1) msum += data[i]
        mid = msum / (40 * 255)
        let tsum = 0
        for (let i = 48; i < 96; i += 1) tsum += data[i]
        treble = tsum / (48 * 255)
      }
      if (!playing) {
        level = Math.max(level, 0.06)
        bass = Math.max(bass, 0.05)
        mid = Math.max(mid, 0.04)
        treble = 0
      }
      return { level, bass, mid, treble, data }
    }

    function frame(t) {
      const time = t / 1000
      const now = performance.now()

      // 半透明残影让光线有流动拖尾
      c.fillStyle = 'rgba(5,6,10,0.26)'
      c.fillRect(0, 0, w, h)

      const { level, bass, mid, treble, data } = readLevels()

      const bst = beatRef.current
      const isBeat = bass > 0.3 && bass > bst.prev * 1.16 && now - bst.last > 240
      if (isBeat) {
        bst.last = now
        bst.waves.push({ t: 0, r: Math.min(w, h) * 0.05, a: 0.9 })
        if (bst.waves.length > 8) bst.waves.shift()
      }
      const beatIntensity = Math.max(0, 1 - (now - bst.last) / 420)
      bst.prev = bst.prev * 0.55 + bass * 0.45
      bst.waves = bst.waves.filter((wave) => {
        wave.t += 0.018 + beatIntensity * 0.022
        wave.r += (Math.min(w, h) * 0.045 + level * Math.min(w, h) * 0.035) * wave.t
        wave.a *= 0.952
        return wave.a > 0.02
      })

      const cx = w / 2
      const cy = h * (mode === 'dynamic' ? 0.56 : 0.52)

      c.save()
      c.globalCompositeOperation = 'lighter'

      // 环境光晕（所有模式共用，动态模式下压低让波光更突出）
      const auroraBoost = mode === 'aurora' ? 1.8 : mode === 'pulse' ? 0.7 : 0.55
      for (const b of blobs) {
        const bx = (b.x + Math.sin(time * 0.08 * b.drift + b.hue) * 0.09) * w
        const by = (b.y + Math.cos(time * 0.06 * b.drift) * 0.07) * h
        const br = Math.max(w, h) * b.r * (0.8 + level * 0.9) * auroraBoost
        const grad = c.createRadialGradient(bx, by, 0, bx, by, br)
        const hue = (b.hue + Math.sin(time * 0.12 + b.drift) * 18) % 360
        grad.addColorStop(0, `hsla(${hue}, 88%, 64%, ${(0.08 + level * 0.1) * auroraBoost})`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        c.fillStyle = grad
        c.fillRect(0, 0, w, h)
      }

      // 中央辉光
      const pulse = 0.08 + level * 0.3 + (mode === 'pulse' ? beatIntensity * 0.3 : 0)
      const glowR = Math.min(w, h) * (0.34 + beatIntensity * 0.3)
      const g2 = c.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      g2.addColorStop(0, `rgba(139,92,246,${pulse})`)
      g2.addColorStop(0.45, `rgba(34,211,238,${pulse * 0.5})`)
      g2.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g2
      c.fillRect(0, 0, w, h)

      if (mode === 'dynamic') {
        // === 旋转光轮：QQ 音乐式光束从中心向外扫 ===
        if (playing) {
          c.save()
          c.translate(cx, cy)
          c.rotate(time * 0.42)
          const rays = 18
          for (let i = 0; i < rays; i += 1) {
            c.rotate(TAU / rays)
            const len = Math.max(w, h) * (0.55 + level * 0.35)
            const hue = (265 + i * 10 + time * 18) % 360
            const grad = c.createLinearGradient(0, 0, len, 0)
            grad.addColorStop(0, `hsla(${hue}, 95%, 62%, ${0.05 + level * 0.12 + beatIntensity * 0.08})`)
            grad.addColorStop(1, 'hsla(0,0%,0%,0)')
            c.fillStyle = grad
            c.beginPath()
            c.moveTo(0, -2 - level * 3)
            c.lineTo(len, 0)
            c.lineTo(0, 2 + level * 3)
            c.closePath()
            c.fill()
          }
          c.restore()
        }

        // === 填充式流动光波：低音驱动大振幅 + 渐变填充 + 亮色波峰 ===
        const layers = 5
        const waveTop = h * 0.3
        const waveSpan = h * 0.56
        const segments = Math.max(52, Math.floor(w / 9))
        const hueFlow = time * 22
        for (let L = 0; L < layers; L += 1) {
          const baseY = waveTop + (L / (layers - 1)) * waveSpan
          const speed = 0.9 + L * 0.34
          const phase = L * 1.7
          const ampBase = 16 + L * 8
          const amp = ampBase + bass * (72 + L * 18) + beatIntensity * 24 + treble * 14
          const hue = (265 + L * 24 + hueFlow + Math.sin(time * 0.3 + L) * 16) % 360
          const alpha = Math.min(0.85, 0.1 + level * 0.5 + beatIntensity * 0.16)
          const pts = new Float32Array(segments + 1)
          for (let i = 0; i <= segments; i += 1) {
            const x = (i / segments) * w
            const idx = Math.min(95, Math.floor((i / segments) * 96))
            const v = data ? data[idx] / 255 : level
            pts[i] =
              baseY +
              Math.sin(x * 0.011 + time * speed + phase) * (amp * (0.62 + v * 0.68)) +
              Math.sin(x * 0.0045 + time * (speed * 0.55) - phase) * (amp * 0.38)
          }

          // 渐变填充（波线以下整体染色，形成流光带）
          c.beginPath()
          c.moveTo(0, pts[0])
          for (let i = 0; i <= segments; i += 1) c.lineTo((i / segments) * w, pts[i])
          c.lineTo(w, h)
          c.lineTo(0, h)
          c.closePath()
          const grad = c.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2.6)
          grad.addColorStop(0, `hsla(${hue}, 92%, 66%, ${alpha})`)
          grad.addColorStop(0.42, `hsla(${(hue + 28) % 360}, 95%, 56%, ${alpha * 0.4})`)
          grad.addColorStop(1, 'hsla(0,0%,0%,0)')
          c.fillStyle = grad
          c.fill()

          // 波峰亮线
          c.globalAlpha = alpha
          c.strokeStyle = `hsla(${hue}, 95%, 76%, 1)`
          c.lineWidth = 2 + level * 2.6 + beatIntensity * 2.2
          c.shadowColor = `hsla(${hue}, 95%, 64%, 1)`
          c.shadowBlur = 18 + level * 18
          c.beginPath()
          c.moveTo(0, pts[0])
          for (let i = 0; i <= segments; i += 1) c.lineTo((i / segments) * w, pts[i])
          c.stroke()
          c.shadowBlur = 0
          c.globalAlpha = 1
        }

        // === 炫彩频谱条（底部，随节奏跳动） ===
        if (data && playing) {
          const barCount = Math.min(88, Math.floor(w / 10))
          const gap = 2.5
          const bw = (w - gap * (barCount - 1)) / barCount
          const maxH = h * 0.34
          const hue0 = (time * 42) % 360
          for (let i = 0; i < barCount; i += 1) {
            const idx = Math.floor((i / barCount) * 96)
            const v = data[idx] / 255
            const bh = Math.max(2, v * maxH * (1 + beatIntensity * 0.42))
            const x = i * (bw + gap)
            const y = h - bh
            const hue = (265 + (i / barCount) * 120 + hue0) % 360
            c.fillStyle = `hsla(${hue}, 95%, 64%, 0.95)`
            c.shadowColor = `hsla(${hue}, 95%, 60%, 0.9)`
            c.shadowBlur = 12 + v * 24
            c.beginPath()
            if (typeof c.roundRect === 'function') c.roundRect(x, y, bw, bh, 3)
            else c.rect(x, y, bw, bh)
            c.fill()
          }
          c.shadowBlur = 0
        }

        // === 节拍冲击波 ===
        for (const wave of bst.waves) {
          c.globalAlpha = wave.a * 0.9
          c.strokeStyle = `hsla(${(265 + wave.t * 60) % 360}, 92%, 70%, 1)`
          c.lineWidth = 2 + wave.a * 4
          c.shadowColor = `hsla(${(265 + wave.t * 60) % 360}, 92%, 62%, 1)`
          c.shadowBlur = 22
          c.beginPath()
          c.arc(cx, cy, wave.r, 0, TAU)
          c.stroke()
          c.shadowBlur = 0
        }
        c.globalAlpha = 1
      } else if (mode === 'aurora') {
        // === 极光：填充式飘带 + 描边 ===
        for (let i = 0; i < 5; i += 1) {
          const baseY = h * (0.25 + i * 0.13)
          const amp = 24 + level * 90 + mid * 60
          const hue = (200 + i * 26 + Math.sin(time * 0.2 + i) * 20) % 360
          const alpha = Math.min(0.8, 0.12 + level * 0.22)
          const pts = new Float32Array(Math.floor(w / 12) + 1)
          let pi = 0
          for (let x = 0; x <= w; x += 12, pi += 1) {
            pts[pi] = baseY + Math.sin(x * 0.008 + time * 0.8 + i * 1.7) * amp
          }
          c.beginPath()
          c.moveTo(0, pts[0])
          for (let j = 0; j <= pi; j += 1) c.lineTo((j / pi) * w, pts[j])
          c.lineTo(w, h)
          c.lineTo(0, h)
          c.closePath()
          const grad = c.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2.4)
          grad.addColorStop(0, `hsla(${hue}, 90%, 66%, ${alpha})`)
          grad.addColorStop(1, 'hsla(0,0%,0%,0)')
          c.fillStyle = grad
          c.fill()
          c.globalAlpha = alpha
          c.strokeStyle = `hsla(${hue}, 90%, 74%, 1)`
          c.lineWidth = 2
          c.shadowColor = `hsla(${hue}, 90%, 62%, 0.9)`
          c.shadowBlur = 14
          c.beginPath()
          c.moveTo(0, pts[0])
          for (let j = 0; j <= pi; j += 1) c.lineTo((j / pi) * w, pts[j])
          c.stroke()
          c.shadowBlur = 0
          c.globalAlpha = 1
        }

        // 极光节拍冲击波
        for (const wave of bst.waves) {
          c.globalAlpha = wave.a * 0.6
          c.strokeStyle = `hsla(${(200 + wave.t * 50) % 360}, 90%, 70%, 1)`
          c.lineWidth = 2
          c.shadowColor = `hsla(${(200 + wave.t * 50) % 360}, 90%, 62%, 1)`
          c.shadowBlur = 14
          c.beginPath()
          c.arc(cx, cy, wave.r, 0, TAU)
          c.stroke()
          c.shadowBlur = 0
        }
        c.globalAlpha = 1
      } else if (mode === 'pulse') {
        // === 脉冲：随节拍扩散的频谱光点环 ===
        if (data && playing) {
          const n = 44
          const baseR = Math.min(w, h) * 0.32
          c.save()
          c.translate(cx, cy)
          for (let i = 0; i < n; i += 1) {
            const idx = Math.floor((i / n) * 96)
            const v = data[idx] / 255
            const ang = (i / n) * TAU + time * 0.4
            const rr = baseR + v * 64 + beatIntensity * 18
            const hue = (265 + (i / n) * 120 + time * 14) % 360
            c.globalAlpha = 0.5 + v * 0.5
            c.fillStyle = `hsla(${hue}, 92%, 68%, 1)`
            c.shadowColor = `hsla(${hue}, 92%, 60%, 0.95)`
            c.shadowBlur = 12 + v * 16
            c.beginPath()
            c.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, 2.2 + v * 4.5, 0, TAU)
            c.fill()
          }
          c.restore()
          c.globalAlpha = 1
          c.shadowBlur = 0
        }

        // 脉冲冲击波
        for (const wave of bst.waves) {
          c.globalAlpha = wave.a * 0.9
          c.strokeStyle = `hsla(${(265 + wave.t * 60) % 360}, 92%, 70%, 1)`
          c.lineWidth = 3 + wave.a * 5
          c.shadowColor = `hsla(${(265 + wave.t * 60) % 360}, 92%, 62%, 1)`
          c.shadowBlur = 22
          c.beginPath()
          c.arc(cx, cy, wave.r, 0, TAU)
          c.stroke()
          c.shadowBlur = 0
        }
        c.globalAlpha = 1
      }

      // === 星光粒子：高频越强越亮越飘 ===
      const sparkle = mode === 'dynamic' ? treble : mid * 0.7
      c.save()
      for (const p of parts) {
        p.y -= p.vy * (0.4 + level * 3 + beatIntensity * 1.4 + sparkle * 2.4)
        p.x += p.vx + Math.sin(time * 0.5 + p.tw) * 0.00024
        p.tw += 0.01
        if (p.y < -0.02) {
          p.y = 1.02
          p.x = Math.random()
        }
        if (p.x < -0.02) p.x = 1.02
        if (p.x > 1.02) p.x = -0.02
        const twinkle = 0.55 + 0.45 * Math.sin(time * 2.4 + p.tw * 3.2)
        c.globalAlpha = Math.min(1, p.a * (0.3 + level * 2.1 + sparkle * 3) * twinkle)
        c.shadowColor = `hsla(${p.hue}, 90%, 78%, 0.95)`
        c.shadowBlur = 8 + p.r * 4 + treble * 14
        c.fillStyle = `hsla(${p.hue}, 92%, 84%, 1)`
        c.beginPath()
        c.arc(p.x * w, p.y * h, p.r * (1 + level * 1.8 + beatIntensity * 0.8 + sparkle * 1.8), 0, TAU)
        c.fill()
      }
      c.restore()
      c.globalAlpha = 1
      c.shadowBlur = 0

      // 四周暗角，聚焦中心
      const vg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.38, cx, cy, Math.max(w, h) * 0.82)
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(2,3,6,0.5)')
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
