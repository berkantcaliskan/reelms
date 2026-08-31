import React, { useState, useEffect, useRef } from 'react'

export const VOICE_SPEEDS = [1, 1.5, 2]
export const VOICE_WAVE_BARS = 38
let _voiceAudioCtx = null

export function getVoiceAudioCtx() {
  const Ctx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null
  if (!Ctx) return null
  if (!_voiceAudioCtx || _voiceAudioCtx.state === 'closed') _voiceAudioCtx = new Ctx()
  return _voiceAudioCtx
}

export function VoiceMessage({ src }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [peaks, setPeaks] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!src) return undefined
    ;(async () => {
      try {
        const res = await fetch(src)
        const buf = await res.arrayBuffer()
        const ctx = getVoiceAudioCtx()
        if (!ctx) throw new Error('no audioctx')
        const decoded = await ctx.decodeAudioData(buf.slice(0))
        const raw = decoded.getChannelData(0)
        const block = Math.floor(raw.length / VOICE_WAVE_BARS) || 1
        const out = []
        for (let i = 0; i < VOICE_WAVE_BARS; i++) {
          let sum = 0
          for (let j = 0; j < block; j++) sum += Math.abs(raw[i * block + j] || 0)
          out.push(sum / block)
        }
        const max = Math.max(...out) || 1
        if (!cancelled) setPeaks(out.map(v => Math.max(0.12, v / max)))
      } catch {
        if (!cancelled) setPeaks(Array.from({ length: VOICE_WAVE_BARS }, (_, i) => 0.25 + 0.55 * Math.abs(Math.sin(i * 1.3 + 0.6))))
      }
    })()
    return () => { cancelled = true }
  }, [src])

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.playbackRate = VOICE_SPEEDS[speedIdx]; a.play().catch(() => {}) } else a.pause()
  }

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % VOICE_SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = VOICE_SPEEDS[next]
  }

  const seek = (e) => {
    const a = audioRef.current
    const dur = a?.duration || duration
    if (!a || !dur || !isFinite(dur)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    a.currentTime = ratio * dur
    setProgress(ratio)
  }

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const bars = peaks || Array.from({ length: VOICE_WAVE_BARS }, () => 0.3)
  const shownTime = (playing || progress > 0) ? progress * duration : duration

  return (
    <div className="voice-msg">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={e => {
          const a = e.currentTarget
          // MediaRecorder webm blobs often report Infinity until forced to seek.
          if (a.duration === Infinity || Number.isNaN(a.duration)) { try { a.currentTime = 1e7 } catch {} }
          else if (isFinite(a.duration)) setDuration(a.duration)
        }}
        onDurationChange={e => {
          const a = e.currentTarget
          if (isFinite(a.duration) && a.duration > 0) {
            setDuration(a.duration)
            if (a.currentTime > a.duration) { try { a.currentTime = 0 } catch {} }
          }
        }}
        onTimeUpdate={e => { const a = e.currentTarget; if (isFinite(a.duration) && a.duration > 0) setProgress(a.currentTime / a.duration) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
      <button className="voice-msg-play" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
        {playing
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5v13a1 1 0 0 0 1.52.85l10.5-6.5a1 1 0 0 0 0-1.7L8.52 4.65A1 1 0 0 0 7 5.5z"/></svg>}
      </button>
      <div className="voice-msg-wave" onClick={seek}>
        {bars.map((h, i) => (
          <span
            key={i}
            className={`voice-bar${(i + 0.5) / bars.length <= progress ? ' voice-bar--played' : ''}`}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        ))}
      </div>
      <div className="voice-msg-meta">
        <span className="voice-msg-time">{fmt(shownTime)}</span>
        <button className="voice-msg-speed" onClick={cycleSpeed} title="Playback speed">{VOICE_SPEEDS[speedIdx]}x</button>
      </div>
    </div>
  )
}

export default VoiceMessage
