import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  createLocalVideoTrack,
  createLocalScreenTracks,
  Track,
} from 'livekit-client'

/**
 * Requests an SFU Voice Token from Reelms API.
 * Returns { sfuEnabled: boolean, token?: string, url?: string, room?: string }
 */
export async function fetchVoiceToken(apiBaseUrl, idToken, roomName, canPublish = true) {
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/voice/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        room: roomName,
        canPublish,
      }),
    })

    if (!res.ok) return { sfuEnabled: false }
    const data = await res.json()
    return data
  } catch (err) {
    console.warn('[LiveKit SFU] Failed to fetch voice token, falling back to P2P:', err)
    return { sfuEnabled: false }
  }
}

/**
 * Connects to a LiveKit SFU room with adaptive streaming, active speaker detection,
 * and background audio/video pipeline.
 */
export async function createLivekitSession({
  url,
  token,
  audioConstraints = {},
  onTrackSubscribed,
  onTrackUnsubscribed,
  onActiveSpeakersChanged,
  onParticipantConnected,
  onParticipantDisconnected,
  onDisconnected,
}) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      autoGainControl: audioConstraints.autoGainControl ?? true,
      echoCancellation: audioConstraints.echoCancellation ?? true,
      noiseSuppression: audioConstraints.noiseSuppression ?? true,
    },
  })

  // Register event listeners
  if (onTrackSubscribed) {
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      onTrackSubscribed(track, publication, participant)
    })
  }

  if (onTrackUnsubscribed) {
    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      onTrackUnsubscribed(track, publication, participant)
    })
  }

  if (onActiveSpeakersChanged) {
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      onActiveSpeakersChanged(speakers)
    })
  }

  if (onParticipantConnected) {
    room.on(RoomEvent.ParticipantConnected, (participant) => {
      onParticipantConnected(participant)
    })
  }

  if (onParticipantDisconnected) {
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      onParticipantDisconnected(participant)
    })
  }

  if (onDisconnected) {
    room.on(RoomEvent.Disconnected, () => {
      onDisconnected()
    })
  }

  // Connect to the LiveKit SFU server
  await room.connect(url, token)

  return {
    room,
    disconnect: () => {
      try {
        room.disconnect()
      } catch { /* noop */ }
    },
  }
}
