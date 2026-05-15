import React, { useState } from 'react'

interface AIFiltersState {
  minScore: number
  experience: string
  location: string
  skills: string[]
  jobId: string
}

interface AIFiltersProps {
  filters: AIFiltersState
  onChange: (filters: AIFiltersState) => void
}

export default function AIFilters({ filters, onChange }: AIFiltersProps) {
  const [skillInput, setSkillInput] = useState('')

  const update = (key: keyof AIFiltersState, value: unknown) =>
    onChange({ ...filters, [key]: value })

  const addSkill = () => {
    const v = skillInput.trim()
    if (v && !filters.skills.includes(v)) {
      update('skills', [...filters.skills, v])
    }
    setSkillInput('')
  }

  const clearAll = () =>
    onChange({ minScore: 0, experience: '', location: '', skills: [], jobId: '' })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', fontSize: 12,
    border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none',
    color: '#374151', backgroundColor: '#fff',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 5,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Filters</span>
        <button onClick={clearAll} style={{
          fontSize: 11, color: '#3b82f6', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}>Clear all</button>
      </div>

      {/* AI Score Range */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>AI Score</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range" min={0} max={100} value={filters.minScore}
            onChange={e => update('minScore', Number(e.target.value))}
            style={{ flex: 1, accentColor: '#3b82f6' }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', minWidth: 36 }}>
            {filters.minScore}%+
          </span>
        </div>
      </div>

      {/* Experience */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Experience</label>
        <select value={filters.experience} onChange={e => update('experience', e.target.value)} style={inputStyle}>
          <option value="">Any</option>
          <option value="0-2">0–2 years</option>
          <option value="2-5">2–5 years</option>
          <option value="5-10">5–10 years</option>
          <option value="10+">10+ years</option>
        </select>
      </div>

      {/* Location */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Location</label>
        <input
          type="text" placeholder="City or remote"
          value={filters.location} onChange={e => update('location', e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Skills</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text" placeholder="Add skill…"
            value={skillInput} onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSkill()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addSkill} style={{
            padding: '6px 10px', backgroundColor: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
          }}>+</button>
        </div>
        {filters.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {filters.skills.map(s => (
              <span key={s} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af',
                borderRadius: 12, fontSize: 11,
              }}>
                {s}
                <button onClick={() => update('skills', filters.skills.filter(x => x !== s))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
