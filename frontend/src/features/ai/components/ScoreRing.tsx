import React from 'react'

interface ScoreRingProps {
  score: number
  size?: number
}

export default function ScoreRing({ score, size = 76 }: ScoreRingProps) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)

  const color =
    score >= 80 ? '#16a34a' :
    score >= 60 ? '#f59e0b' :
                  '#ef4444'

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 76 76">
        {/* Track */}
        <circle cx="38" cy="38" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        {/* Progress */}
        <circle
          cx="38" cy="38" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 38 38)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{score}%</span>
        <span style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>AI Match</span>
      </div>
    </div>
  )
}
