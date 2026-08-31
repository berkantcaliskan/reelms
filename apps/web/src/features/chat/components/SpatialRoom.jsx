import React from 'react'

export function SpatialRoom({ voicePositions = {}, voiceParticipants = [], myUid, myUser, onMyMove }) {
  const ROOM_W = 280
  const ROOM_H = 200
  const AVATAR_D = 40
  const HALF = AVATAR_D / 2

  const startDrag = (e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const onMove = (ev) => {
      const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / ROOM_W))
      const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / ROOM_H))
      onMyMove?.(x, y)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const myPos = voicePositions[myUid] || { x: 0.5, y: 0.5 }

  return (
    <div className="spatial-room">
      <div className="spatial-room-label">Spatial Room — drag to move</div>
      <div className="spatial-room-canvas" style={{ position: 'relative', width: ROOM_W, height: ROOM_H }}>
        {(voiceParticipants || []).filter(p => p.userId !== myUid).map(p => {
          const pos = voicePositions[p.userId] || { x: 0.5, y: 0.5 }
          return (
            <div
              key={p.userId}
              className="spatial-avatar spatial-avatar-other"
              style={{ left: pos.x * ROOM_W - HALF, top: pos.y * ROOM_H - HALF }}
            >
              {p.userPhoto
                ? <img src={p.userPhoto} alt="" className="spatial-avatar-img" />
                : <div className="spatial-avatar-initials">{(p.userName || '?')[0].toUpperCase()}</div>}
              <span className="spatial-avatar-name">{p.userName}</span>
            </div>
          )
        })}
        <div
          className="spatial-avatar spatial-avatar-me"
          style={{ left: myPos.x * ROOM_W - HALF, top: myPos.y * ROOM_H - HALF, cursor: 'grab' }}
          onMouseDown={startDrag}
        >
          {myUser?.photo
            ? <img src={myUser.photo} alt="" className="spatial-avatar-img" />
            : <div className="spatial-avatar-initials">{(myUser?.name || '?')[0].toUpperCase()}</div>}
          <span className="spatial-avatar-name">You</span>
        </div>
      </div>
    </div>
  )
}

export default SpatialRoom
