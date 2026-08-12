// src/components/Tournament/KnockoutDashboard/BracketMatchList.jsx
export default function BracketMatchList({ 
  matches, 
  getMatchLabel, 
  getTeamName, 
  onMatchClick, 
  isReady 
}) {
  if (!matches || matches.length === 0) {
    return null
  }

  return (
    <>
      {matches.map((match, matchIndex) => {
        const team1Label = getTeamName(match, 1)
        const team2Label = getTeamName(match, 2)
        const isCompleted = match.completed
        const isBye = match.isBye
        const ready = isReady(match)

        if (isBye) return null

        return (
          <div
            key={matchIndex}
            onClick={() => onMatchClick(matchIndex)}
            style={{
              border: '1px solid #d0ddd0',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: ready ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              background: isCompleted ? 'rgba(74, 222, 128, 0.08)' : (ready ? '#ffffff' : '#f5f5f5'),
              opacity: isCompleted ? 0.85 : (ready ? 1 : 0.6),
            }}
            onMouseEnter={(e) => {
              if (ready) {
                e.currentTarget.style.background = '#f8faf8'
              }
            }}
            onMouseLeave={(e) => {
              if (ready) {
                e.currentTarget.style.background = '#ffffff'
              }
            }}
          >
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                {team1Label} vs {team2Label}
              </div>
              {isCompleted && (
                <div style={{ fontSize: '13px', color: '#6a7a6a' }}>
                  {match.score1} - {match.score2}
                  {match.winner && (
                    <span style={{ marginLeft: '8px', color: '#4ade80', fontWeight: '600' }}>
                      ✅ {getMatchLabel([match.winner])} wins
                    </span>
                  )}
                </div>
              )}
              {!isCompleted && !ready && (
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                  Waiting for previous round
                </div>
              )}
              {!isCompleted && ready && (
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                  Tap to enter score →
                </div>
              )}
            </div>
            <div>
              {isCompleted ? (
                <span style={{ fontSize: '18px' }}>✅</span>
              ) : ready ? (
                <span style={{ fontSize: '18px', color: '#fbbf24' }}>⏳</span>
              ) : (
                <span style={{ fontSize: '18px', color: '#d0ddd0' }}>⏸️</span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
