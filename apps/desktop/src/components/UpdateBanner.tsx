import { useEffect, useState } from 'react'

export function UpdateBanner() {
  const [available, setAvailable] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    const offAvailable = window.reelms?.onUpdateAvailable(() => setAvailable(true))
    const offDownloaded = window.reelms?.onUpdateDownloaded(() => {
      setAvailable(false)
      setDownloaded(true)
    })
    return () => {
      offAvailable?.()
      offDownloaded?.()
    }
  }, [])

  if (!available && !downloaded) return null

  return (
    <div className="update-banner">
      {downloaded ? (
        <>
          <span>Yeni Reelms sürümü indirildi.</span>
          <button onClick={() => window.reelms?.installUpdate()}>Yeniden başlat ve kur</button>
        </>
      ) : (
        <span>Yeni güncelleme bulundu, arka planda indiriliyor.</span>
      )}
    </div>
  )
}

export function WindowControls() {
  const [isMax, setIsMax] = useState(false)
  const isDesktop = typeof window !== 'undefined' && Boolean(
    (window as any).reelms?.isDesktop ||
    (window as any).electronAPI?.isDesktop ||
    (window as any).reelms?.minimize
  )

  useEffect(() => {
    if (!isDesktop) return
    document.body.classList.add('is-desktop-app')
    const reelms = (window as any).reelms || (window as any).electronAPI
    reelms?.isMaximized?.().then?.(setIsMax)
    const off = reelms?.onMaximizeChange?.((val: boolean) => setIsMax(val))
    return () => {
      off?.()
      document.body.classList.remove('is-desktop-app')
    }
  }, [isDesktop])

  if (!isDesktop) return null

  const reelms = (window as any).reelms || (window as any).electronAPI

  return (
    <div className="desktop-window-controls">
      <button
        type="button"
        className="win-ctrl-btn win-ctrl-minimize"
        onClick={() => reelms?.minimize?.()}
        title="Küçült"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button
        type="button"
        className="win-ctrl-btn win-ctrl-maximize"
        onClick={() => reelms?.toggleMaximize?.()}
        title={isMax ? "Önceki Boyut" : "Ekranı Kapla"}
      >
        {isMax ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2.5" y="0.5" width="7" height="7" rx="0.5" />
            <path d="M0.5 2.5v7h7v-2" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="win-ctrl-btn win-ctrl-close"
        onClick={() => reelms?.close?.()}
        title="Kapat"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <line x1="1" y1="1" x2="9" y2="9" />
          <line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>
    </div>
  )
}
