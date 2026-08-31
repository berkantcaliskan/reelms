import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useT } from '../../../../i18n'

export function ProfileMediaCropModal({ file, kind = 'photo', onApply, onCancel, onChangeFile }) {
  const t = useT()
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const [imgElement, setImgElement] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!file) return
    let active = true
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!active) return
      setImgElement(img)
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
    img.src = url
    return () => {
      active = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  const isPhoto = kind === 'photo'
  const viewWidth = isPhoto ? 260 : 360
  const viewHeight = isPhoto ? 260 : 135

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgElement) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 2
    canvas.width = viewWidth * dpr
    canvas.height = viewHeight * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, viewWidth, viewHeight)

    const baseScale = Math.max(viewWidth / imgElement.width, viewHeight / imgElement.height)
    const currentScale = baseScale * scale
    const drawWidth = imgElement.width * currentScale
    const drawHeight = imgElement.height * currentScale

    const centerX = (viewWidth - drawWidth) / 2 + offset.x
    const centerY = (viewHeight - drawHeight) / 2 + offset.y

    ctx.drawImage(imgElement, centerX, centerY, drawWidth, drawHeight)
  }, [imgElement, scale, offset, viewWidth, viewHeight])

  const handleMouseDown = (e) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    })
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      dragStartRef.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y }
    }
  }

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return
    setOffset({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    })
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY * -0.002
    setScale(s => Math.min(3, Math.max(1, +(s + delta).toFixed(2))))
  }

  const handleApply = async () => {
    if (!imgElement || isProcessing) return
    setIsProcessing(true)
    try {
      const targetWidth = isPhoto ? 640 : 1280
      const targetHeight = isPhoto ? 640 : 480

      const outCanvas = document.createElement('canvas')
      outCanvas.width = targetWidth
      outCanvas.height = targetHeight
      const ctx = outCanvas.getContext('2d')
      if (!ctx) return

      const ratio = targetWidth / viewWidth
      const baseScale = Math.max(viewWidth / imgElement.width, viewHeight / imgElement.height)
      const currentScale = baseScale * scale * ratio
      const drawWidth = imgElement.width * currentScale
      const drawHeight = imgElement.height * currentScale

      const centerX = (targetWidth - drawWidth) / 2 + offset.x * ratio
      const centerY = (targetHeight - drawHeight) / 2 + offset.y * ratio

      ctx.drawImage(imgElement, centerX, centerY, drawWidth, drawHeight)

      const blob = await new Promise(res => outCanvas.toBlob(res, 'image/webp', isPhoto ? 0.9 : 0.86))
      if (!blob) throw new Error('Canvas export failed')

      const safeName = String(file.name || `${kind}.webp`).replace(/\.[^.]+$/, '')
      const croppedFile = new File([blob], `${safeName || kind}-${Date.now()}.webp`, { type: 'image/webp' })
      onApply?.(croppedFile)
    } catch (err) {
      console.warn('Crop apply failed:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return ReactDOM.createPortal(
    <div className="profile-crop-overlay" onClick={onCancel}>
      <div className="profile-crop-modal" onClick={e => e.stopPropagation()}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={e => {
            const nextFile = e.target.files?.[0]
            if (nextFile) onChangeFile?.(nextFile)
            e.target.value = ''
          }}
        />

        <div className="profile-crop-header">
          <span className="profile-crop-title">
            {isPhoto ? (t('edit_profile_photo') || 'Profil Fotoğrafını Düzenle') : (t('edit_cover_photo') || 'Kapak Fotoğrafını Düzenle')}
          </span>
          <p className="profile-crop-hint">
            {isPhoto ? 'Fotoğrafı sürükleyerek veya yakınlaştırarak yuvarlak alana hizalayın.' : 'Kapağı sürükleyerek veya yakınlaştırarak alana hizalayın.'}
          </p>
        </div>

        <div className={`profile-crop-viewport-wrap profile-crop-viewport-wrap--${kind}`}>
          <div
            className={`profile-crop-viewport profile-crop-viewport--${kind}`}
            style={{ width: viewWidth, height: viewHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              style={{ width: viewWidth, height: viewHeight }}
              className="profile-crop-canvas"
            />
            <div className={`profile-crop-mask profile-crop-mask--${kind}`} />
          </div>
        </div>

        <div className="profile-crop-zoom-bar">
          <button
            type="button"
            className="profile-crop-zoom-btn"
            onClick={() => setScale(s => Math.max(1, +(s - 0.1).toFixed(2)))}
            title="Uzaklaştır"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/></svg>
          </button>
          <input
            type="range"
            className="profile-crop-slider"
            min="1"
            max="3"
            step="0.02"
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
          />
          <button
            type="button"
            className="profile-crop-zoom-btn"
            onClick={() => setScale(s => Math.min(3, +(s + 0.1).toFixed(2)))}
            title="Yakınlaştır"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M8 11h6M11 8v6"/></svg>
          </button>
        </div>

        <div className="profile-crop-actions">
          <button type="button" className="profile-crop-btn profile-crop-btn--cancel" onClick={onCancel}>
            {t('cancel') || 'Vazgeç'}
          </button>
          <button type="button" className="profile-crop-btn profile-crop-btn--change" onClick={() => fileInputRef.current?.click()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>{t('change') || 'Değiştir'}</span>
          </button>
          <button type="button" className="profile-crop-btn profile-crop-btn--apply" disabled={isProcessing} onClick={handleApply}>
            {isProcessing ? (t('saving') || 'Kaydediliyor…') : (t('apply') || 'Tamamla')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ProfileMediaCropModal
