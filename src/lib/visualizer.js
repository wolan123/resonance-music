let ctx = null
let source = null
let analyser = null
let boundAudio = null

export function getAnalyser(audioEl) {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (!analyser) {
      analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.82
    }
    if (!source || boundAudio !== audioEl) {
      if (source) {
        try {
          source.disconnect(analyser)
        } catch {
          /* ignore */
        }
      }
      source = ctx.createMediaElementSource(audioEl)
      source.connect(analyser)
      analyser.connect(ctx.destination)
      boundAudio = audioEl
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return analyser
  } catch {
    return null
  }
}

export function getFrequencyData(a) {
  const arr = new Uint8Array(a.frequencyBinCount)
  a.getByteFrequencyData(arr)
  return arr
}
