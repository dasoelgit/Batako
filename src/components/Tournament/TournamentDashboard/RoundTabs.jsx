// src/components/Tournament/TournamentDashboard/RoundTabs.jsx
export default function RoundTabs({ totalRounds, selectedRound, onSelect, getRoundStatus }) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    }}>
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
        const status = getRoundStatus(r)
        const isActive = selectedRound === r
        const statusIcon = status === 'complete' ? '✅' : status === 'in_progress' ? '⏳' : ''

        return (
          <button
            key={r}
            onClick={() => onSelect(r)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: isActive ? '2px solid #d4e94b' : '1px solid #d0ddd0',
              background: isActive ? '#d4e94b' : status === 'complete' ? '#e8f5e9' : '#ffffff',
              color: isActive ? '#1a2a1a' : '#6a7a6a',
              fontWeight: isActive ? '700' : '400',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            R{r} {statusIcon}
          </button>
        )
      })}
    </div>
  )
}
