// src/components/Tournament/TournamentDashboard/MatchList.jsx
export default function MatchList({ matches, getMatchLabel, onMatchClick, isAdmin, selectedRound, roundStatus }) {
  if (!matches || matches.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        color: '#6a7a6a',
        background: '#f8faf8',
        borderRadius: '8px',
      }}>
        No matches for this round yet.
      </div>
    )
  }

  return (
    <>
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#1a2a1a',
        marginBottom: '8px',
      }}>
        Round {selectedRound}
        {roundStatus === 'complete' && ' ✅ Complete'}
        {roundStatus === 'in_progress' && ' ⏳ In Progress'}
      </div>

      {matches.map((match, index) => {
        if (match.isBye) return null

        const team1Label = getMatchLabel(match.team1)
        const team2Label = getMatchLabel(match.team2)
        const isCompleted = match.completed

        return (
          <div
            key={index}
            onClick={() => onMatchClick(index)}
            style={{
              border: '1px solid #d0ddd0',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isCompleted ? 'rgba(74, 222, 128, 0.08)' : '#ffffff',
              opacity: isCompleted && !isAdmin ? 0.85 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isCompleted || isAdmin) {
                e.currentTarget.style.background = isCompleted ? 'rgba(74, 222, 128, 0.15)' : '#f8faf8'
              }
            }}
            onMouseLeave={(e) => {
              if (!isCompleted || isAdmin) {
                e.currentTarget.style.background = isCompleted ? 'rgba(74, 222, 128, 0.08)' : '#ffffff'
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
                  {isAdmin && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#f97316' }}>✏️ Tap to edit</span>}
                </div>
              )}
              {!isCompleted && (
                <div style={{ fontSize: '12px', color: '#6a7a6a' }}>
                  Tap to enter score →
                </div>
              )}
            </div>
            <div>
              {isCompleted ? (
                <span style={{ fontSize: '18px' }}>✅</span>
              ) : (
                <span style={{ fontSize: '18px', color: '#fbbf24' }}>⏳</span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
