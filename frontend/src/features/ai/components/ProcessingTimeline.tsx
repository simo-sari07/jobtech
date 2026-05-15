import React from 'react'

interface TimelineEvent {
  time: string
  title: string
  subtitle: string
  status: 'done' | 'active' | 'pending'
  type?: 'upload' | 'parse' | 'skills' | 'match' | 'score' | 'rank'
}

interface ProcessingTimelineProps {
  events: TimelineEvent[]
}

function EventIcon({ type, status }: { type?: string; status: string }) {
  const isRank  = type === 'rank' || type === 'score'
  const isDone  = status === 'done' || status === 'active'
  const bg      = isDone ? (isRank ? '#16a34a' : '#3b82f6') : '#e5e7eb'
  const icon    = isRank ? '★' : '●'

  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      backgroundColor: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: 12,
      color: isDone ? '#fff' : '#9ca3af',
      boxShadow: isDone ? `0 0 0 4px ${isRank ? '#dcfce7' : '#dbeafe'}` : 'none',
      transition: 'all 0.3s ease',
    }}>
      {status === 'active' ? (
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          border: '2px solid #fff',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
      ) : icon}
    </div>
  )
}

export default function ProcessingTimeline({ events }: ProcessingTimelineProps) {
  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {events.map((event, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, position: 'relative' }}>
          {/* Connector line */}
          {i < events.length - 1 && (
            <div style={{
              position: 'absolute',
              left: 13, top: 28, bottom: -12,
              width: 2,
              backgroundColor: event.status === 'done' ? '#3b82f6' : '#e5e7eb',
              transition: 'background-color 0.4s',
            }} />
          )}
          <EventIcon type={event.type} status={event.status} />
          <div style={{ flex: 1, paddingTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{event.title}</span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>{event.time}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{event.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
