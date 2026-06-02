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
