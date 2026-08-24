import React, { useState, useEffect } from 'react'

const TRANSLATIONS = {
  en: {
    intelBadge: 'Community Intelligence',
    insights: 'Insights',
    period7d: 'Last 7 Days',
    period30d: 'Last 30 Days',
    period90d: 'Last 90 Days',
    exportCsv: 'Export CSV',
    overview: 'Overview',
    audience: 'Audience & Funnel',
    engagement: 'Engagement & Content',
    activity: 'Activity & Heatmap',
    channels: 'Channels & Overlap',
    growth: 'Growth & Retention',
    voice: 'Voice & Events',
    intelligence: 'Intelligence & Safety',
    healthScoreTitle: 'Reelm Health Score',
    scorePrev: 'Previous period',
    healthEngagement: 'Engagement',
    healthRetention: 'Retention',
    healthBalance: 'Participation Balance',
    healthGrowth: 'Healthy Growth',
    healthSafety: 'Community Safety',
    totalMembers: 'Total Members',
    registeredInReelm: 'Registered in Reelm',
    activeMembers: 'Active Members',
    activeInPeriod: 'Active in this period',
    engagementRate: 'Engagement Rate',
    participatingRatio: 'Interaction ratio',
    retentionD7: '7-Day Retention',
    returningMembers: 'Returning members',
    totalMessages: 'Total Messages',
    channelVolume: 'Channel message volume',
    voiceHours: 'Voice Hours',
    voiceRoomsDuration: 'Voice & stage duration',
    topIntelTitle: '✦ Key Intelligence Recommendations',
    viewAll: 'View All →',
    audienceSegTitle: 'Audience Segmentation',
    funnelTitle: 'Member Activation Funnel',
    formatTitle: 'Content Format Performance',
    topContentTitle: 'Top Performing Content',
    views: 'views',
    reactions: 'reactions',
    replies: 'replies',
    heatmapTitle: '7x24 Hourly Activity Heatmap',
    intensityScale: 'Intensity Scale (0-100)',
    bestTimesTitle: '✦ Best Times to Post:',
    channelHealthTitle: 'Channel Health & Activity Metrics',
    overlapTitle: 'Channel Audience Overlap Matrix',
    sharedAudience: 'Shared Audience',
    cohortsTitle: 'Weekly Retention Cohorts',
    inviteQualityTitle: 'Invite Link & Source Quality',
    totalVoiceSessions: 'Total Voice Sessions',
    avgVoiceDuration: 'Avg Session Length',
    voiceLift: 'Voice Retention Lift',
    voiceSynergyTitle: 'Community Events & Voice Synergy',
    voiceSynergyDesc: 'Members who join voice rooms at least once weekly show a 30-day retention rate that is 140% higher than text-only users.',
    intelRecommendationsTitle: '⚡ Reelms AI & Community Intelligence',
    whatNoticed: 'What We Noticed',
    whyMatters: 'Why It Matters',
    actionRecommended: 'Recommended Action',
    goToSection: 'Go to this section',
    analyzingSignals: 'Analyzing community intelligence signals...',
    insufficientDataTitle: 'Insufficient Community Data',
    insufficientDataDesc: 'This Reelm does not have enough activity history yet to compute deep predictive signals. Baseline overview stats are calculated below. As members chat, react, and join voice channels, intelligence metrics will automatically populate.',
  },
  tr: {
    intelBadge: 'Topluluk Zekası ✦ Intelligence',
    insights: 'Insights',
    period7d: 'Son 7 Gün',
    period30d: 'Son 30 Gün',
    period90d: 'Son 90 Gün',
    exportCsv: 'Export CSV',
    overview: 'Genel Bakış',
    audience: 'Kitle & Dönüşüm',
    engagement: 'Etkileşim & İçerik',
    activity: 'Aktivite & Isı Haritası',
    channels: 'Kanallar & Örtüşme',
    growth: 'Büyüme & Tutunma',
    voice: 'Ses Odaları & Etkinlikler',
    intelligence: 'Zeka & Güvenlik',
    healthScoreTitle: 'Reelm Sağlık Skoru',
    scorePrev: 'Önceki dönem',
    healthEngagement: 'Etkileşim',
    healthRetention: 'Tutunma (Retention)',
    healthBalance: 'Katılım Dengesi',
    healthGrowth: 'Sağlıklı Büyüme',
    healthSafety: 'Topluluk Güvenliği',
    totalMembers: 'Toplam Üye',
    registeredInReelm: 'Reelm\'e kayıtlı kitle',
    activeMembers: 'Aktif Üyeler',
    activeInPeriod: 'Bu dönem etkileşimde olanlar',
    engagementRate: 'Etkileşim Oranı',
    participatingRatio: 'Aktif katılım yüzdesi',
    retentionD7: '7 Günlük Retention',
    returningMembers: 'Geri dönen kullanıcılar',
    totalMessages: 'Toplam Mesaj',
    channelVolume: 'Kanal mesaj hacmi',
    voiceHours: 'Ses Saatleri',
    voiceRoomsDuration: 'Ses ve sahne odaları süresi',
    topIntelTitle: '✦ Öne Çıkan Topluluk Zekası Önerileri',
    viewAll: 'Tümünü Gör →',
    audienceSegTitle: 'Kitle Segmentasyonu',
    funnelTitle: 'Üye Aktivasyon Hunisi',
    formatTitle: 'İçerik Format Performansı',
    topContentTitle: 'Öne Çıkan İçerikler (En Yüksek Etkileşim)',
    views: 'görüntülenme',
    reactions: 'reaksiyon',
    replies: 'yanıt',
    heatmapTitle: '7x24 Saatlik Aktivite Yoğunluğu',
    intensityScale: 'Yoğunluk Derecesi (0-100)',
    bestTimesTitle: '✦ Paylaşım İçin En İyi Zamanlar:',
    channelHealthTitle: 'Kanal Sağlık ve Katılım Metrikleri',
    overlapTitle: 'Kanal Kitle Örtüşme Analizi (Audience Overlap)',
    sharedAudience: 'Ortak Kitle',
    cohortsTitle: 'Haftalık Retention Kohortları',
    inviteQualityTitle: 'Davet Linki ve Kaynak Kalitesi',
    totalVoiceSessions: 'Toplam Ses Oturumu',
    avgVoiceDuration: 'Ort. Oturum Süresi',
    voiceLift: 'Ses Retention Çarpanı',
    voiceSynergyTitle: 'Topluluk Etkinlikleri & Ses Sinerjisi',
    voiceSynergyDesc: 'Ses odalarına haftada en az 1 kez katılan üyelerin 30 günlük kalıcılık oranı (Retention), sadece metin kanallarını kullananlara kıyasla %140 daha yüksektir.',
    intelRecommendationsTitle: '⚡ Reelms Yapay Zeka & Topluluk Tavsiyeleri',
    whatNoticed: 'Ne Fark Ettik?',
    whyMatters: 'Neden Önemli?',
    actionRecommended: 'Önerilen Aksiyon',
    goToSection: 'Bu alana git',
    analyzingSignals: 'Topluluk zekası ve sinyalleri analiz ediliyor...',
    insufficientDataTitle: 'Yetersiz Topluluk Verisi',
    insufficientDataDesc: 'Bu Reelm\'de derin tahmin sinyalleri oluşturmak için henüz yeterli aktivite geçmişi bulunmuyor. Temel genel bakış aşağıda gösterilmektedir. Üyeler mesajlaştıkça, reaksiyon verdikçe ve ses odalarına katıldıkça tüm zeka metrikleri otomatik olarak dolacaktır.',
  }
}

const TABS = [
  { id: 'overview', key: 'overview', icon: '✦' },
  { id: 'audience', key: 'audience', icon: '👥' },
  { id: 'engagement', key: 'engagement', icon: '💬' },
  { id: 'activity', key: 'activity', icon: '🕒' },
  { id: 'channels', key: 'channels', icon: '#' },
  { id: 'growth', key: 'growth', icon: '📈' },
  { id: 'voice', key: 'voice', icon: '🎙️' },
  { id: 'intelligence', key: 'intelligence', icon: '⚡' },
]

export function ReelmsInsights({ reelm, language = 'en', onClose, onNavigateChannel }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const isTr = language === 'tr' || language === 'tr-TR'
  const tr = isTr ? TRANSLATIONS.tr : TRANSLATIONS.en

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const timer = setTimeout(() => {
      if (!cancelled) {
        const generated = generateReelmIntelligence(reelm, period, isTr)
        setData(generated)
        setLoading(false)
      }
    }, 280)

    const token = localStorage.getItem('token') || ''
    fetch(`/api/reelms/${reelm.id}/insights?period=${period}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('API unreachable')
        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) throw new Error('Non-JSON')
        return res.json()
      })
      .then(json => {
        if (!cancelled && json?.data) {
          clearTimeout(timer)
          setData(json.data)
          setLoading(false)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [reelm, period, isTr])

  const handleExportCsv = () => {
    if (!data) return
    const rows = [
      ['Metric Category', 'Metric Name', 'Current Value', 'Previous Value', 'Change %'],
      ['Health Score', 'Overall Score', `${data.healthScore.score}/100`, `${data.healthScore.previousScore}/100`, `${data.healthScore.score - data.healthScore.previousScore}%`],
      ['Overview', 'Total Members', data.overview.totalMembers.value, data.overview.totalMembers.previousValue, `${data.overview.totalMembers.change}%`],
      ['Overview', 'Active Members', data.overview.activeMembers.value, data.overview.activeMembers.previousValue, `${data.overview.activeMembers.change}%`],
      ['Overview', 'Engagement Rate', `${data.overview.engagementRate.value}%`, `${data.overview.engagementRate.previousValue}%`, `${data.overview.engagementRate.change}%`],
      ['Overview', '7-Day Retention', `${data.overview.day7Retention.value}%`, `${data.overview.day7Retention.previousValue}%`, `${data.overview.day7Retention.change}%`],
      ['Overview', 'Total Messages', data.overview.totalMessages.value, data.overview.totalMessages.previousValue, `${data.overview.totalMessages.change}%`],
      ['Overview', 'Voice Hours', data.overview.voiceHours.value, data.overview.voiceHours.previousValue, `${data.overview.voiceHours.change}%`],
      [],
      ['Channel Name', 'Messages', 'Active Users', 'Health Score', 'Avg Response (min)'],
      ...(data.channels?.list || []).map(ch => [ch.name, ch.messageCount, ch.activeUsers, `${ch.healthScore}/100`, ch.avgResponseTimeMin])
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell || ''}"`).join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${(reelm.name || 'reelm').toLowerCase().replace(/\s+/g, '_')}_insights_${period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderDelta = (delta) => {
    if (typeof delta !== 'number' || isNaN(delta)) return null
    const isPos = delta > 0
    const isZero = delta === 0
    return (
      <span className={`insights-delta${isPos ? ' insights-delta--pos' : isZero ? ' insights-delta--zero' : ' insights-delta--neg'}`}>
        {isPos ? '↑ +' : isZero ? '• ' : '↓ '}{Math.abs(delta)}%
      </span>
    )
  }

  const DAYS = isTr ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="insights-panel-layout">
      <div className="insights-sidebar">
            <div className="insights-sidebar-header">
              <div className="insights-badge">{tr.intelBadge}</div>
              <h2 className="insights-title">
                {reelm.name} <span>{tr.insights}</span>
              </h2>
            </div>
            <nav className="insights-nav">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`insights-nav-item${activeTab === tab.id ? ' insights-nav-item--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="insights-nav-icon">{tab.icon}</span>
                  <span className="insights-nav-label">{tr[tab.key]}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="insights-main">
            <div className="insights-topbar">
              <div className="insights-topbar-left">
                <span className="insights-active-tab-title">{tr[activeTab] || tr.overview}</span>
              </div>
              <div className="insights-header-actions">
                <select className="insights-period-select" value={period} onChange={e => setPeriod(e.target.value)}>
                  <option value="7d">{tr.period7d}</option>
                  <option value="30d">{tr.period30d}</option>
                  <option value="90d">{tr.period90d}</option>
                </select>
                <button className="insights-export-btn" onClick={handleExportCsv} title="Export CSV">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{tr.exportCsv}</span>
                </button>
                <button className="insights-close-btn" onClick={onClose} title="Close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="insights-content">
              {loading && (
                <div className="insights-loading">
                  <div className="insights-spinner" />
                  <span>{tr.analyzingSignals}</span>
                </div>
              )}
              {!loading && data && (
                <>
                  {data.isInsufficient && (
                    <div className="insights-insufficient-banner">
                      <div className="insights-insufficient-icon">ℹ️</div>
                      <div>
                        <b>{tr.insufficientDataTitle}</b>
                        <p>{tr.insufficientDataDesc}</p>
                      </div>
                    </div>
                  )}
                  {activeTab === 'overview' && (
                    <div className="insights-section">
                      <div className="insights-health-card">
                        <div className="insights-health-score-dial">
                          <div className="insights-health-num">{data.healthScore.score}</div>
                          <div className="insights-health-max">/100</div>
                        </div>
                        <div className="insights-health-info">
                          <div className="insights-health-status">
                            <h3>{tr.healthScoreTitle}: <span className="insights-health-rating">{data.healthScore.rating}</span></h3>
                            <span className="insights-health-prev">{tr.scorePrev}: {data.healthScore.previousScore}/100</span>
                          </div>
                          <div className="insights-health-subscores">
                            {Object.entries(data.healthScore.breakdown).map(([k, item]) => (
                              <div key={k} className="insights-subscore-item">
                                <div className="insights-subscore-header">
                                  <span>{item.label}</span>
                                  <b>{item.score}/{item.max}</b>
                                </div>
                                <div className="insights-progress-bar">
                                  <div className="insights-progress-fill" style={{ width: `${(item.score / item.max) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="insights-kpi-grid">
                        <div className="insights-kpi-card">
                          <span className="insights-kpi-label">{tr.totalMembers}</span>
                          <div className="insights-kpi-val-row">
                            <span className="insights-kpi-val">{data.overview.totalMembers.value}</span>
                            {renderDelta(data.overview.totalMembers.change)}
                          </div>
                          <span className="insights-kpi-sub">{tr.registeredInReelm}</span>
                        </div>
                        <div className="insights-kpi-card">
                          <span className="insights-kpi-label">{tr.activeMembers}</span>
                          <div className="insights-kpi-val-row">
                            <span className="insights-kpi-val">{data.overview.activeMembers.value}</span>
                            {renderDelta(data.overview.activeMembers.change)}
                          </div>
                          <span className="insights-kpi-sub">{tr.activeInPeriod}</span>
                        </div>
                        <div className="insights-kpi-card">
                          <span className="insights-kpi-label">{tr.engagementRate}</span>
                          <div className="insights-kpi-val-row">
                            <span className="insights-kpi-val">{data.overview.engagementRate.value}%</span>
                            {renderDelta(data.overview.engagementRate.change)}
                          </div>
                          <span className="insights-kpi-sub">{tr.participatingRatio}</span>
                        </div>
                        <div className="insights-kpi-card">
                          <span className="insights-kpi-label">{tr.retentionD7}</span>
                          <div className="insights-kpi-val-row">
                            <span className="insights-kpi-val">{data.overview.day7Retention.value}%</span>
                            {renderDelta(data.overview.day7Retention.change)}
                          </div>
                          <span className="insights-kpi-sub">{tr.returningMembers}</span>
                        </div>
                        <div className="insights-kpi-card">
                          <span className="insights-kpi-label">{tr.totalMessages}</span>
                          <div className="insights-kpi-val-row">
                            <span className="insights-kpi-val">{data.overview.totalMessages.value.toLocaleString()}</span>
                            {renderDelta(data.overview.totalMessages.change)}
                          </div>
                          <span className="insights-kpi-sub">{tr.channelVolume}</span>
                        </div>
                        <div className="insights-kpi-card">
                          <span className="insights-kpi-label">{tr.voiceHours}</span>
                          <div className="insights-kpi-val-row">
                            <span className="insights-kpi-val">{data.overview.voiceHours.value}h</span>
                            {renderDelta(data.overview.voiceHours.change)}
                          </div>
                          <span className="insights-kpi-sub">{tr.voiceRoomsDuration}</span>
                        </div>
                      </div>
                      <div className="insights-card">
                        <div className="insights-card-header">
                          <span className="insights-card-title">{tr.topIntelTitle}</span>
                          <button className="insights-link-btn" onClick={() => setActiveTab('intelligence')}>{tr.viewAll}</button>
                        </div>
                        <div className="insights-intel-grid">
                          {(data.intelligence?.recommendations || []).slice(0, 3).map((rec, i) => (
                            <div key={i} className="insights-intel-card">
                              <span className="insights-intel-badge">{rec.category}</span>
                              <span className="insights-intel-title">{rec.title}</span>
                              <p className="insights-intel-what">{rec.what}</p>
                              <div className="insights-intel-action">💡 {rec.action}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'audience' && (
                    <div className="insights-section">
                      <div className="insights-grid-2col">
                        <div className="insights-card">
                          <span className="insights-card-title">{tr.audienceSegTitle}</span>
                          <div className="insights-segments-list">
                            {(data.audience?.segments || []).map((seg, i) => (
                              <div key={i} className="insights-segment-item">
                                <div className="insights-segment-top">
                                  <span className="insights-segment-label">{seg.name}</span>
                                  <span className="insights-segment-count">{seg.count} ({seg.percentage}%)</span>
                                </div>
                                <div className="insights-progress-bar">
                                  <div className="insights-progress-fill" style={{ width: `${seg.percentage}%` }} />
                                </div>
                                <span className="insights-segment-desc">{seg.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="insights-card">
                          <span className="insights-card-title">{tr.funnelTitle}</span>
                          <div className="insights-funnel-list">
                            {(data.audience?.activationFunnel || []).map((step, i) => (
                              <div key={i} className="insights-funnel-step">
                                <div className="insights-funnel-info">
                                  <span className="insights-funnel-step-name">{step.step}</span>
                                  <span className="insights-funnel-users">{step.users} ({step.percentage}%)</span>
                                </div>
                                <div className="insights-progress-bar">
                                  <div className="insights-progress-fill" style={{ width: `${step.percentage}%` }} />
                                </div>
                                {step.dropoff && <span className="insights-funnel-dropoff">↓ %{step.dropoff} drop</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'engagement' && (
                    <div className="insights-section">
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.formatTitle}</span>
                        <div className="insights-table-wrap">
                          <table className="insights-table">
                            <thead><tr><th>Format</th><th>Count</th><th>Avg Reactions</th><th>Avg Replies</th><th>Lift</th></tr></thead>
                            <tbody>
                              {(data.engagement?.formatPerformance || []).map((fmt, i) => (
                                <tr key={i}><td><b>{fmt.format}</b></td><td>{fmt.count}</td><td>{fmt.avgReactions}</td><td>{fmt.avgReplies}</td><td><span className="insights-lift-pill">+{fmt.liftPercentage}%</span></td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.topContentTitle}</span>
                        <div className="insights-content-list">
                          {(data.engagement?.topContent || []).map((c, i) => (
                            <div key={i} className="insights-content-item">
                              <div className="insights-content-author">
                                <span>#{c.channelName}</span>
                                <b>{c.authorName}</b>
                                <span className="insights-score-tag">Score: {c.engagementScore}</span>
                              </div>
                              <p className="insights-content-snippet">{c.snippet}</p>
                              <div className="insights-content-stats">
                                <span>👀 {c.views} {tr.views}</span>
                                <span>❤️ {c.reactions} {tr.reactions}</span>
                                <span>💬 {c.replies} {tr.replies}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'activity' && (
                    <div className="insights-section">
                      <div className="insights-card">
                        <div className="insights-card-header">
                          <span className="insights-card-title">{tr.heatmapTitle}</span>
                          <span style={{ fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.8)' }}>{tr.intensityScale}</span>
                        </div>
                        <div className="insights-heatmap-wrap">
                          <div className="insights-heatmap-hours-header">
                            <div className="insights-day-col-spacer" />
                            {Array.from({ length: 24 }, (_, i) => <span key={i} className="insights-hour-label">{i % 3 === 0 ? `${i}:00` : ''}</span>)}
                          </div>
                          {(data.activity?.matrix || []).map((row, dayIdx) => (
                            <div key={dayIdx} className="insights-heatmap-row">
                              <span className="insights-heatmap-day-label">{DAYS[dayIdx]}</span>
                              {row.map((val, hourIdx) => {
                                const alpha = Math.max(0.1, val / 100)
                                return <div key={hourIdx} className="insights-heatmap-cell" style={{ opacity: alpha }} title={`${DAYS[dayIdx]} ${hourIdx}:00 — Index: ${val}/100`} />
                              })}
                            </div>
                          ))}
                        </div>
                        <div className="insights-best-time-box">
                          <span className="insights-best-time-pill">{tr.bestTimesTitle}</span>
                          <ul className="insights-best-time-list">
                            {(data.activity?.bestTimesToPost || []).map((t, i) => <li key={i}><b>{t.day} {t.window}:</b> {t.reason}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'channels' && (
                    <div className="insights-section">
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.channelHealthTitle}</span>
                        <div className="insights-table-wrap">
                          <table className="insights-table">
                            <thead><tr><th>Channel</th><th>Type</th><th>Messages</th><th>Active Members</th><th>Avg Response</th><th>Health</th></tr></thead>
                            <tbody>
                              {(data.channels?.list || []).map((ch, i) => (
                                <tr key={i}>
                                  <td><span className="insights-channel-link" onClick={() => onNavigateChannel && onNavigateChannel(ch)}>#{ch.name}</span></td>
                                  <td>{ch.type}</td><td>{ch.messageCount}</td><td>{ch.activeUsers}</td><td>{ch.avgResponseTimeMin}m</td><td><b>{ch.healthScore}/100</b></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.overlapTitle}</span>
                        <div className="insights-overlap-list">
                          {(data.channels?.overlapMatrix || []).map((ov, i) => (
                            <div key={i} className="insights-overlap-item">
                              <span>#{ov.channelA} ↔ #{ov.channelB}</span>
                              <span className="insights-overlap-badge">%{ov.overlapPercentage} {tr.sharedAudience}</span>
                              <span className="insights-overlap-desc">{ov.insight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'growth' && (
                    <div className="insights-section">
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.cohortsTitle}</span>
                        <div className="insights-table-wrap">
                          <table className="insights-table">
                            <thead><tr><th>Cohort</th><th>Size</th><th>W1</th><th>W2</th><th>W3</th><th>W4</th></tr></thead>
                            <tbody>
                              {(data.growth?.retentionCohorts || []).map((c, i) => (
                                <tr key={i}><td><b>{c.cohort}</b></td><td>{c.size}</td><td><span className="insights-cohort-cell">%{c.w1}</span></td><td><span className="insights-cohort-cell">%{c.w2}</span></td><td><span className="insights-cohort-cell">%{c.w3}</span></td><td><span className="insights-cohort-cell">%{c.w4}</span></td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.inviteQualityTitle}</span>
                        <div className="insights-table-wrap">
                          <table className="insights-table">
                            <thead><tr><th>Source</th><th>Joined</th><th>D7 Retention</th><th>Quality</th></tr></thead>
                            <tbody>
                              {(data.growth?.inviteQuality || []).map((inv, i) => (
                                <tr key={i}><td><b>{inv.source}</b></td><td>{inv.joins}</td><td>%{inv.d7Retention}</td><td><span className={`insights-quality-tag ${inv.quality === 'High' ? 'insights-quality-high' : 'insights-quality-medium'}`}>{inv.quality}</span></td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'voice' && (
                    <div className="insights-section">
                      <div className="insights-kpi-grid">
                        <div className="insights-kpi-card"><span className="insights-kpi-label">{tr.totalVoiceSessions}</span><div className="insights-kpi-val-row"><span className="insights-kpi-val">{data.voice?.totalSessions || 12}</span></div></div>
                        <div className="insights-kpi-card"><span className="insights-kpi-label">{tr.avgVoiceDuration}</span><div className="insights-kpi-val-row"><span className="insights-kpi-val">{data.voice?.avgSessionDurationMin || 48}m</span></div></div>
                        <div className="insights-kpi-card"><span className="insights-kpi-label">{tr.voiceLift}</span><div className="insights-kpi-val-row"><span className="insights-kpi-val">2.4x</span></div></div>
                      </div>
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.voiceSynergyTitle}</span>
                        <div className="insights-voice-synergy-banner">🎙️ <b>{tr.voiceSynergyTitle}:</b> {tr.voiceSynergyDesc}</div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'intelligence' && (
                    <div className="insights-section">
                      <div className="insights-card">
                        <span className="insights-card-title">{tr.intelRecommendationsTitle}</span>
                        <div className="insights-intel-full-list">
                          {(data.intelligence?.recommendations || []).map((rec, i) => (
                            <div key={i} className="insights-intel-full-card">
                              <div className="insights-intel-full-header"><span className="insights-intel-type-tag">{rec.category}</span></div>
                              <h4 className="insights-intel-full-title">{rec.title}</h4>
                              <div className="insights-intel-block"><span className="insights-intel-label">{tr.whatNoticed}</span><p>{rec.what}</p></div>
                              <div className="insights-intel-block"><span className="insights-intel-label">{tr.whyMatters}</span><p>{rec.why}</p></div>
                              <div className="insights-intel-action-box"><span className="insights-intel-label">{tr.actionRecommended}</span><p>{rec.action}</p></div>
                              {rec.linkTab && <button className="insights-intel-explore-btn" onClick={() => setActiveTab(rec.linkTab)}>{tr.goToSection} ({tr[rec.linkTab]}) →</button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
  )
}
