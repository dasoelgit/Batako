// src/components/Tournament/Knockout/BracketMatchList.jsx
export default function BracketMatchList({
  rounds,
  getMatchLabel,
  getTeamName,
  isMatchReady,
  onMatchClick,
}) {
  // Build bracket columns (same as before)
  const buildBracketColumns = () => {
    const columns = []

    rounds.forEach((round, roundIndex) => {
      const matches = round.matches.filter(m => !m.isBye)
      
      const totalSlots = Math.pow(2, rounds.length - roundIndex)
      
      const slots = []
      for (let i = 0; i < totalSlots; i++) {
        slots.push(null)
      }
      
      matches.forEach((match, matchIndex) => {
        const slotIndex = matchIndex * 2
        if (slotIndex < slots.length) {
          slots[slotIndex] = { match, matchIndex }
        }
      })
      
      columns.push({
        roundName: round.round_name || `Round ${round.round_number}`,
        isBronze: round.isBronze || false,
        slots: slots,
        roundIndex: roundIndex,
      })
    })

    return columns
  }

  const getRoundName = (round) => {
    if (round.isBronze) return '🥉 Bronze'
    return round.round_name || `Round ${round.round_number}`
  }

  const columns = buildBracketColumns()

  if (columns.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        color: '#6a7a6a',
        background: '#f8faf8',
        borderRadius: '8px',
      }}>
        No matches to display.
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      gap: 'clamp(12px, 2vw, 24px)',
      justifyContent: 'center',
      padding: '12px 8px',
      minWidth: 'max-content',
      background: '#f8faf8',
      borderRadius: '8px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollSnapType: 'x mandatory',
    }}>
      {columns.map((column, colIndex) => {
        const isFinal = column.roundName === 'Final' || column.roundName === '🥉 Bronze'
        const matchHeight = isFinal ? 70 : 50
        const spacing = isFinal ? 0 : 12
        
        return (
          <div
            key={colIndex}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: isFinal ? '100px' : '110px',
              maxWidth: isFinal ? '140px' : '150px',
              position: 'relative',
              scrollSnapAlign: 'start',
            }}
          >
            {/* Round Label */}
            <div style={{
              fontSize: 'clamp(9px, 1.2vw, 11px)',
              fontWeight: '600',
              color: '#6a7a6a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
              padding: '3px 10px',
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #d0ddd0',
              whiteSpace: 'nowrap',
            }}>
              {getRoundName(rounds[colIndex])}
            </div>

            {/* Matches in column */}
            {column.slots.map((slot, idx) => {
              if (!slot) {
                return (
                  <div
                    key={idx}
                    style={{
                      height: matchHeight,
                      marginBottom: spacing,
                      visibility: 'hidden',
                    }}
                  />
                )
              }

              const { match, matchIndex } = slot
              const isCompleted = match.completed
              const isReady = isMatchReady(match)
              const team1Label = getTeamName(match, 1)
              const team2Label = getTeamName(match, 2)

              const winnerLabel = isCompleted && match.winner 
                ? getMatchLabel([match.winner])
                : null

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isReady) {
                      onMatchClick(column.roundIndex, matchIndex)
                    }
                  }}
                  style={{
                    height: matchHeight,
                    width: '100%',
                    minWidth: isFinal ? '90px' : '100px',
                    maxWidth: isFinal ? '130px' : '140px',
                    marginBottom: spacing,
                    padding: isFinal ? '8px 12px' : '6px 10px',
                    borderRadius: '4px',
                    border: isCompleted 
                      ? '2px solid #4ade80' 
                      : isReady 
                        ? '2px solid #fbbf24' 
                        : '2px solid #d0ddd0',
                    background: isCompleted 
                      ? 'rgba(74, 222, 128, 0.08)' 
                      : isReady 
                        ? '#ffffff' 
                        : '#f5f5f5',
                    cursor: isReady ? 'pointer' : 'default',
                    opacity: isCompleted ? 0.85 : (isReady ? 1 : 0.5),
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (isReady) {
                      e.currentTarget.style.background = '#f0f5f0'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isReady) {
                      e.currentTarget.style.background = '#ffffff'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                  {/* Team 1 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: isFinal ? 'clamp(11px, 1.4vw, 13px)' : 'clamp(9px, 1vw, 11px)',
                    fontWeight: isCompleted && winnerLabel === team1Label ? '700' : '400',
                    color: isCompleted && winnerLabel === team1Label ? '#4ade80' : '#1a2a1a',
                  }}>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      maxWidth: '55px',
                    }}>
                      {team1Label}
                    </span>
                    {isCompleted && (
                      <span style={{ 
                        fontSize: isFinal ? 'clamp(11px, 1.4vw, 13px)' : 'clamp(9px, 1vw, 11px)', 
                        fontWeight: '600',
                        color: '#d4a843',
                        marginLeft: '4px',
                      }}>
                        {match.score1}
                      </span>
                    )}
                  </div>

                  {/* Team 2 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: isFinal ? 'clamp(11px, 1.4vw, 13px)' : 'clamp(9px, 1vw, 11px)',
                    fontWeight: isCompleted && winnerLabel === team2Label ? '700' : '400',
                    color: isCompleted && winnerLabel === team2Label ? '#4ade80' : '#1a2a1a',
                  }}>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      maxWidth: '55px',
                    }}>
                      {team2Label}
                    </span>
                    {isCompleted && (
                      <span style={{ 
                        fontSize: isFinal ? 'clamp(11px, 1.4vw, 13px)' : 'clamp(9px, 1vw, 11px)', 
                        fontWeight: '600',
                        color: '#d4a843',
                        marginLeft: '4px',
                      }}>
                        {match.score2}
                      </span>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '4px',
                    fontSize: '8px',
                  }}>
                    {isCompleted ? '✅' : isReady ? '⏳' : '⏸️'}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
