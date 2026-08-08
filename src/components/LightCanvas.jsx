import { useEffect, useRef } from 'react'
import { getFrequencyData } from '../lib/visualizer'

const TAU = Math.PI * 2

function rand(min, max) {
  return min + Math.random() * (max - min)
}

// QQ 音乐 Wave 动感波光：低频如深海涌动的大光波 + 高频如星河闪烁的粒子 + 动感闪光
// 参考官方定义还原，不使用自创元素（旋转光轮 / 彩虹频谱条 / 冲击波环均已移除）
export default function LightCanvas({ analyser, playing, mode = 'dynamic' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const beatRef = useRef({ prev: 0, last: 0, flash: 0 })
  const ripplesRef = useRef([])

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

    // 深色底上的氛围光（克制、暗调，让光波成为主角）
    const ambients = [
      { x: 0.2, y: 0.25, r: 0.52, hue: 258, drift: 1 },
      { x: 0.8, y: 0.55, r: 0.55, hue: 196, drift: -0.8 },
      { x: 0.5, y: 1.0, r: 0.5, hue: 300, drift: 0.6 },
    ]

    // 星河粒子：高频越强越亮越飘
    const starCount = Math.max(70, Math.floor(w / 11))
    const stars = Array.from({ length: starCount }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.6,
      vy: 0.0002 + Math.random() * 0.0007,
      vx: (Math.random() - 0.5) * 0.00015,
      a: 0.15 + Math.random() * 0.5,
      tw: Math.random() * TAU,
      hue: 220 + Math.random() * 90,
    }))

    // 雨滴互动：点击屏幕溅出细碎光点（动感波光皮肤同款交互）
    function spawnRipple(e) {
      if (mode !== 'dynamic') return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const ripple = {
        x,
        y,
        t: 0,
        hue: 240 + Math.random() * 80,
        drops: Array.from({ length: 10 }).map(() => ({
          ang: Math.random() * TAU,
          dist: 10 + Math.random() * 34,
          size: 0.6 + Math.random() * 1.8,
          spd: 0.5 + Math.random() * 0.8,
        })),
      }
      ripplesRef.current.push(ripple)
      if (ripplesRef.current.length > 6) ripplesRef.current.shift()
    }
    window.addEventListener('pointerdown', spawnRipple)

    function readLevels() {
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
        level = Math.max(level, 0.06)
        bass = Math.max(bass, 0.05)
        treble = 0
      }
      return { level, bass, treble, data }
    }

    function frame(t) {
      const time = t / 1000
      const now = performance.now()

      // 半透明残影，让光波/粒子有流动拖尾
      c.fillStyle = 'rgba(5,6,10,0.3)'
      c.fillRect(0, 0, w, h)

      const { level, bass, treble, data } = readLevels()

      // 节拍检测（驱动动感闪光）
      const bst = beatRef.current
      const isBeat = bass > 0.3 && bass > bst.prev * 1.16 && now - bst.last > 240
      if (isBeat) {
        bst.last = now
        bst.flash = 1
      }
      const beatIntensity = Math.max(0, 1 - (now - bst.last) / 420)
      bst.prev = bst.prev * 0.55 + bass * 0.45
      bst.flash *= 0.92

      const cx = w / 2
      const cy = h * 0.52

      c.save()
      c.globalCompositeOperation = 'lighter'

      const calm = mode === 'galaxy' || !playing
      if (calm) {
        // MindRadio 同款银河暗场：星云微光 + 缓慢漂浮的细碎星尘
        for (const b of ambients) {
          const bx = (b.x + Math.sin(time * 0.04 * b.drift + b.hue) * 0.05) * w
          const by = (b.y + Math.cos(time * 0.03 * b.drift) * 0.04) * h
          const br = Math.max(w, h) * b.r
          const grad = c.createRadialGradient(bx, by, 0, bx, by, br)
          grad.addColorStop(0, `hsla(${b.hue}, 65%, 50%, 0.06)`)
          grad.addColorStop(1, 'hsla(0,0%,0%,0)')
          c.fillStyle = grad
          c.fillRect(0, 0, w, h)
        }
        // 银河斜带：淡紫青斜向光带，模拟银河
        const band = c.createLinearGradient(0, h * 0.72, w, h * 0.28)
        band.addColorStop(0, 'rgba(139,92,246,0)')
        band.addColorStop(0.45, 'rgba(139,92,246,0.055)')
        band.addColorStop(0.55, 'rgba(103,232,249,0.055)')
        band.addColorStop(1, 'rgba(139,92,246,0)')
        c.fillStyle = band
        c.fillRect(0, 0, w, h)
        c.save()
        for (const p of stars) {
          p.y -= p.vy * 0.12
          p.x += p.vx * 0.35 + Math.sin(time * 0.18 + p.tw) * 0.00008
          p.tw += 0.004
          if (p.y < -0.02) {
            p.y = 1.02
            p.x = Math.random()
          }
          if (p.x < -0.02) p.x = 1.02
          if (p.x > 1.02) p.x = -0.02
          const twinkle = 0.4 + 0.6 * Math.sin(time * 0.8 + p.tw * 2.2)
          c.globalAlpha = Math.min(1, p.a * 0.95 * twinkle)
          c.shadowColor = `hsla(${p.hue}, 90%, 80%, 1)`
          c.shadowBlur = 6 + p.r * 4
          c.fillStyle = `hsla(${p.hue}, 95%, 88%, 1)`
          c.beginPath()
          c.arc(p.x * w, p.y * h, p.r * (1.1 + twinkle * 0.8), 0, TAU)
          c.fill()
        }
        c.restore()
        c.globalAlpha = 1
        c.shadowBlur = 0
      } else {
        // 暗色氛围光（QQ Wave 背景是深色沉浸底，光效集中在波光区）
        for (const b of ambients) {
          const bx = (b.x + Math.sin(time * 0.07 * b.drift + b.hue) * 0.08) * w
          const by = (b.y + Math.cos(time * 0.05 * b.drift) * 0.06) * h
          const br = Math.max(w, h) * b.r
          const grad = c.createRadialGradient(bx, by, 0, bx, by, br)
          grad.addColorStop(0, `hsla(${b.hue}, 70%, 52%, ${0.05 + level * 0.06})`)
          grad.addColorStop(1, 'hsla(0,0%,0%,0)')
          c.fillStyle = grad
          c.fillRect(0, 0, w, h)
        }

        if (mode === 'dynamic') {
        // ========== WAVE 动感波光 ==========
        // 1) 深海涌动：3 层横向流动光波，低音驱动大振幅，QQ 同款紫蓝青配色
        const layers = 3
        const waveTop = h * 0.36
        const waveSpan = h * 0.46
        const segments = Math.max(96, Math.floor(w / 6))
        const baseHues = [258, 214, 186] // 紫 → 蓝 → 青
        for (let L = 0; L < layers; L += 1) {
          const baseY = waveTop + (L / (layers - 1)) * waveSpan
          const speed = 0.85 + L * 0.22
          const phase = L * 1.9
          const amp = 12 + L * 9 + bass * (64 + L * 14) + beatIntensity * 20
          const hue = (baseHues[L] + Math.sin(time * 0.22 + L * 1.4) * 8) % 360
          const alpha = Math.min(0.72, 0.1 + level * 0.4 + beatIntensity * 0.12)
          const pts = new Float32Array(segments + 1)
          for (let i = 0; i <= segments; i += 1) {
            const x = (i / segments) * w
            const idx = Math.min(95, Math.floor((i / segments) * 96))
            const v = data ? data[idx] / 255 : level
            pts[i] =
              baseY +
              Math.sin(x * 0.0085 - time * speed + phase) * (amp * (0.55 + v * 0.7)) +
              Math.sin(x * 0.0036 + time * (speed * 0.6) + phase * 1.7) * (amp * 0.42)
          }

          // 波光渐变填充（波峰亮、向下渐隐成深水）
          c.beginPath()
          c.moveTo(0, pts[0])
          for (let i = 0; i <= segments; i += 1) c.lineTo((i / segments) * w, pts[i])
          c.lineTo(w, h)
          c.lineTo(0, h)
          c.closePath()
          const grad = c.createLinearGradient(0, baseY - amp, 0, baseY + amp * 3)
          grad.addColorStop(0, `hsla(${hue}, 88%, 66%, ${alpha})`)
          grad.addColorStop(0.4, `hsla(${(hue + 24) % 360}, 92%, 58%, ${alpha * 0.35})`)
          grad.addColorStop(1, 'hsla(0,0%,0%,0)')
          c.fillStyle = grad
          c.fill()

          // 波峰亮线（QQ 波光的"发光浪尖"）
          c.globalAlpha = alpha
          c.strokeStyle = `hsla(${(hue + 8) % 360}, 96%, 78%, 1)`
          c.lineWidth = 1.8 + level * 2 + beatIntensity * 1.8
          c.shadowColor = `hsla(${hue}, 95%, 62%, 1)`
          c.shadowBlur = 16 + level * 16
          c.beginPath()
          c.moveTo(0, pts[0])
          for (let i = 0; i <= segments; i += 1) c.lineTo((i / segments) * w, pts[i])
          c.stroke()
          c.shadowBlur = 0
          c.globalAlpha = 1
        }

        // 2) 星河闪烁：高频驱动的星光粒子
        c.save()
        for (const p of stars) {
          p.y -= p.vy * (0.35 + level * 2.6 + beatIntensity * 1 + treble * 3)
          p.x += p.vx + Math.sin(time * 0.45 + p.tw) * 0.0002
          p.tw += 0.012
          if (p.y < -0.02) {
            p.y = 1.02
            p.x = Math.random()
          }
          if (p.x < -0.02) p.x = 1.02
          if (p.x > 1.02) p.x = -0.02
          const twinkle = 0.5 + 0.5 * Math.sin(time * 2.2 + p.tw * 3)
          c.globalAlpha = Math.min(1, p.a * (0.25 + level * 1.8 + treble * 3.2) * twinkle)
          c.shadowColor = `hsla(${p.hue}, 95%, 80%, 1)`
          c.shadowBlur = 6 + p.r * 3 + treble * 12
          c.fillStyle = `hsla(${p.hue}, 100%, 88%, 1)`
          c.beginPath()
          c.arc(p.x * w, p.y * h, p.r * (1 + level * 1.5 + beatIntensity * 0.7 + treble * 2), 0, TAU)
          c.fill()
        }
        c.restore()
        c.globalAlpha = 1
        c.shadowBlur = 0

        // 3) 动感闪光：强节拍时整屏柔光脉冲
        if (beatIntensity > 0.05) {
          const flash = Math.max(bst.flash, beatIntensity * 0.6) * 0.09
          const fg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.2, cx, cy, Math.max(w, h) * 0.7)
          fg.addColorStop(0, `rgba(180,190,255,${flash})`)
          fg.addColorStop(0.55, `rgba(139,92,246,${flash * 0.55})`)
          fg.addColorStop(1, 'rgba(0,0,0,0)')
          c.fillStyle = fg
          c.fillRect(0, 0, w, h)
        }

        // 4) 雨滴互动：点击溅起的细碎光点
        const ripples = ripplesRef.current
        for (let ri = ripples.length - 1; ri >= 0; ri -= 1) {
          const rp = ripples[ri]
          rp.t += 0.045
          const life = Math.max(0, 1 - rp.t / 1.15)
          for (const d of rp.drops) {
            const dist = d.dist + d.spd * rp.t * 90
            const x = rp.x + Math.cos(d.ang) * dist
            const y = rp.y + Math.sin(d.ang) * dist * 0.45
            c.globalAlpha = life * 0.8
            c.shadowColor = `hsla(${rp.hue}, 95%, 75%, 1)`
            c.shadowBlur = 8
            c.fillStyle = `hsla(${rp.hue}, 100%, 85%, 1)`
            c.beginPath()
            c.arc(x, y, d.size * (0.5 + life), 0, TAU)
            c.fill()
          }
          if (life <= 0) ripples.splice(ri, 1)
        }
        c.globalAlpha = 1
        c.shadowBlur = 0
      } else if (mode === 'aurora') {
        // 极光：流动的极光飘带
        for (let i = 0; i < 5; i += 1) {
          const baseY = h * (0.25 + i * 0.13)
          const amp = 22 + level * 80
          const hue = (200 + i * 26 + Math.sin(time * 0.2 + i) * 20) % 360
          const alpha = Math.min(0.7, 0.1 + level * 0.2)
          c.beginPath()
          c.moveTo(0, baseY + Math.sin(time * 0.8 + i * 1.7) * amp)
          for (let x = 0; x <= w; x += 12) {
            const y = baseY + Math.sin(x * 0.008 + time * 0.8 + i * 1.7) * amp
            c.lineTo(x, y)
          }
          c.lineTo(w, h)
          c.lineTo(0, h)
          c.closePath()
          const grad = c.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2.4)
          grad.addColorStop(0, `hsla(${hue}, 90%, 64%, ${alpha})`)
          grad.addColorStop(1, 'hsla(0,0%,0%,0)')
          c.fillStyle = grad
          c.fill()
          c.globalAlpha = alpha
          c.strokeStyle = `hsla(${hue}, 90%, 74%, 1)`
          c.lineWidth = 1.5
          c.shadowColor = `hsla(${hue}, 90%, 62%, 0.9)`
          c.shadowBlur = 12
          c.beginPath()
          c.moveTo(0, baseY + Math.sin(time * 0.8 + i * 1.7) * amp)
          for (let x = 0; x <= w; x += 12) {
            c.lineTo(x, baseY + Math.sin(x * 0.008 + time * 0.8 + i * 1.7) * amp)
          }
          c.stroke()
          c.shadowBlur = 0
          c.globalAlpha = 1
        }
      } else if (mode === 'pulse') {
        // 脉冲：节拍扩散的光环
        const n = 40
        const baseR = Math.min(w, h) * 0.32
        c.save()
        c.translate(cx, cy)
        for (let i = 0; i < n; i += 1) {
          const idx = Math.floor((i / n) * 96)
          const v = data ? data[idx] / 255 : level
          const ang = (i / n) * TAU + time * 0.4
          const rr = baseR + v * 60 + beatIntensity * 18
          const hue = (258 + (i / n) * 80 + time * 10) % 360
          c.globalAlpha = 0.45 + v * 0.5
          c.fillStyle = `hsla(${hue}, 92%, 66%, 1)`
          c.shadowColor = `hsla(${hue}, 92%, 60%, 0.9)`
          c.shadowBlur = 10 + v * 14
          c.beginPath()
          c.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, 2 + v * 4, 0, TAU)
          c.fill()
        }
        c.restore()
        c.globalAlpha = 1
        c.shadowBlur = 0
      }
      }

      // 四周暗角，聚焦波光
      const vg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.4, cx, cy, Math.max(w, h) * 0.82)
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
      window.removeEventListener('pointerdown', spawnRipple)
    }
  }, [analyser, playing, mode])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden="true" />
}
