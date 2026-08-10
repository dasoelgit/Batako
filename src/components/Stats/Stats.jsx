// src/components/Stats/Stats.jsx
import { useState } from 'react'
import Leaderboard from './Leaderboard'
import GeneralStats from './GeneralStats'

export default function Stats({ refreshKey }) {
  const [activeTab, setActiveTab] = useState('leaderboard')

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

  return (
    <div>
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
        <Leaderboard refreshKey={refreshKey} />
      ) : (
        <GeneralStats refreshKey={refreshKey} />
      )}
    </div>
  )
}
