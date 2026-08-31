import React, { useState, useEffect } from 'react'
import { useT } from '../../../../i18n'
import { userGetDoc, scheduleUserPersist } from '../../../../reelmsAwsClient'
import { EnvToggle, EnvSelect, EnvInlineSlider } from './SettingsControls'

export function EnvironmentPanel({ uid }) {
  const t = useT()
  const [env, setEnv] = useState({})

  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    let cancel = false
    const timer = setTimeout(() => {
      if (cancel) return
      userGetDoc('environment').then((d) => {
        if (cancel) return
        setEnv(d && typeof d === 'object' ? d : {})
      }).catch(() => {})
    }, 1200)
    return () => { cancel = true; clearTimeout(timer) }
  }, [uid])

  const set = (key, value) => {
    setEnv(prev => {
      const next = { ...prev, [key]: value }
      scheduleUserPersist('environment', next)
      return next
    })
  }

  const v = (key, def) => env[key] ?? def
  const isSpatialAudio = !!v('spatialAudio', false)

  return (
    <div className="accs-panel">

      {/* ── Audio ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('audio_section')}</div>

        <div className="accs-visibility-row">
          <div>
            <span className="cust-toggle-label">{t('microphone_label')}</span>
            <p className="accs-note">{t('microphone_desc')}</p>
          </div>
          <EnvSelect k="micDevice" def="default" options={[
            { value: 'default', label: t('default_microphone') },
            { value: 'system', label: t('system_microphone') },
          ]} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('speaker_label')}</span>
            <p className="accs-note">{t('speaker_desc')}</p>
          </div>
          <EnvSelect k="speakerDevice" def="default" options={[
            { value: 'default', label: t('default_speaker') },
            { value: 'system', label: t('system_speaker') },
          ]} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('input_volume_label')}</span>
          </div>
          <EnvInlineSlider k="inputVolume" def={80} min={0} max={100} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('output_volume_label')}</span>
          </div>
          <EnvInlineSlider k="outputVolume" def={100} min={0} max={100} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('noise_suppression_label')}</span>
            <p className="accs-note">{t('noise_suppression_desc')}</p>
          </div>
          <EnvToggle k="noiseSuppression" def={true} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('echo_cancellation_label')}</span>
            <p className="accs-note">{t('echo_cancellation_desc')}</p>
          </div>
          <EnvToggle k="echoCancellation" def={true} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('spatial_audio')}</span>
            <p className="accs-note">{t('spatial_audio_desc')}</p>
          </div>
          <EnvToggle k="spatialAudio" def={false} v={v} set={set} />
        </div>

        <div className={`env-expandable-row${isSpatialAudio ? ' env-expandable-row--open' : ''}`}>
          <div className="accs-visibility-row" style={{ paddingTop: 10 }}>
            <div>
              <span className="cust-toggle-label">{t('spatial_depth_label')}</span>
            </div>
            <EnvInlineSlider k="spatialDepth" def={50} min={0} max={100} disabled={!isSpatialAudio} v={v} set={set} />
          </div>
        </div>
      </div>

      {/* ── Video ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('video')}</div>

        <div className="accs-visibility-row">
          <div>
            <span className="cust-toggle-label">{t('camera')}</span>
            <p className="accs-note">{t('camera_desc')}</p>
          </div>
          <EnvSelect k="cameraDevice" def="default" options={[
            { value: 'default', label: t('default_camera') },
            { value: 'system', label: t('system_camera') },
          ]} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('video_quality_label')}</span>
            <p className="accs-note">{t('video_quality_desc')}</p>
          </div>
          <EnvSelect k="videoQuality" def="auto" options={[
            { value: 'auto', label: t('video_quality_auto') },
            { value: 'low', label: t('video_quality_low') },
            { value: 'medium', label: t('video_quality_medium') },
            { value: 'high', label: t('video_quality_high') },
          ]} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('mirror_camera_label')}</span>
            <p className="accs-note">{t('mirror_camera_desc')}</p>
          </div>
          <EnvToggle k="mirrorCamera" def={true} v={v} set={set} />
        </div>
      </div>

      {/* ── Screen Sharing ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('screen_sharing_section')}</div>

        <div className="accs-visibility-row">
          <div>
            <span className="cust-toggle-label">{t('frame_rate_label')}</span>
            <p className="accs-note">{t('frame_rate_desc')}</p>
          </div>
          <EnvSelect k="screenFps" def="30" options={[
            { value: '15', label: t('fps_15') },
            { value: '30', label: t('fps_30') },
            { value: '60', label: t('fps_60') },
          ]} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('resolution_label')}</span>
            <p className="accs-note">{t('resolution_desc')}</p>
          </div>
          <EnvSelect k="screenResolution" def="1080p" options={[
            { value: '720p', label: t('res_720p') },
            { value: '1080p', label: t('res_1080p') },
            { value: '4k', label: t('res_4k') },
          ]} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('share_sys_audio')}</span>
            <p className="accs-note">{t('share_sys_audio_desc')}</p>
          </div>
          <EnvToggle k="screenShareAudio" def={false} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('show_cursor')}</span>
            <p className="accs-note">{t('show_cursor_desc')}</p>
          </div>
          <EnvToggle k="screenShowCursor" def={true} v={v} set={set} />
        </div>
      </div>

    </div>
  )
}

export default EnvironmentPanel
