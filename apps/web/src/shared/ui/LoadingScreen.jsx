export function LoadingScreen({ label = 'Loading Reelms…' }) {
  return (
    <div className="reelms-app-loading reelms-loading-screen">
      <div className="reelms-loading-mark">R</div>
      <span>{label}</span>
    </div>
  )
}
