// src/components/Stats/Stats.jsx
import { useState } from 'react'
import Leaderboard from './Leaderboard'
import GeneralStats from './GeneralStats'

export default function Stats({ refreshKey }) {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [dateFilter, setDateFilter] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const toggleButtonStyle = (isActive) => ({
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: isActive ? '2px solid #d4e94b' : '1px solid #d0ddd0',
    background: isActive ? '#d4e94b' : '#ffffff',
    color: isActive ? '#1a2a1a' : '#6a7a6a',
    fontWeight: isActive ? '700' : '500',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  })

  const filterOptions = [
    { value: 'all', label: 'All Time' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ]

  return (
    <div>
      {/* Filter */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
        }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: dateFilter === opt.value ? '2px solid #d4e94b' : '1px solid #d0ddd0',
                background: dateFilter === opt.value ? '#d4e94b' : '#ffffff',
                color: dateFilter === opt.value ? '#1a2a1a' : '#6a7a6a',
                fontWeight: dateFilter === opt.value ? '700' : '400',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setDateFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom Range */}
        {dateFilter === 'custom' && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #d0ddd0',
                background: '#ffffff',
                color: '#1a2a1a',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <span style={{ color: '#6a7a6a' }}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #d0ddd0',
                background: '#ffffff',
                color: '#1a2a1a',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
      }}>
        <button
          style={toggleButtonStyle(activeTab === 'leaderboard')}
          onClick={() => setActiveTab('leaderboard')}
        >
          📊 Leaderboard
        </button>
        <button
          style={toggleButtonStyle(activeTab === 'general')}
          onClick={() => setActiveTab('general')}
        >
          📈 Club Stats
        </button>
      </div>

      {activeTab === 'leaderboard' ? (
        <Leaderboard refreshKey={refreshKey} dateFilter={dateFilter} customStart={customStart} customEnd={customEnd} />
      ) : (
        <GeneralStats refreshKey={refreshKey} dateFilter={dateFilter} customStart={customStart} customEnd={customEnd} />
      )}
    </div>
  )
}
