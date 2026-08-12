// src/components/Tournament/knockout/BracketMatchList.jsx
export default function BracketMatchList({
  rounds,
  getMatchLabel,
  getTeamName,
  isMatchReady,
  onMatchClick,
  champion,
  bronzeWinner,
}) {
  // Count matches per round for visual alignment
  const getMaxMatchesInRound = () => {
    let max = 0
    rounds.forEach(round => {
      const count = round.matches.filter(m => !m.isBye).length
      if (count > max) max = count
    })
    return max
  }

  // Build bracket columns
  const buildBracketColumns = () => {
    const columns = []

    rounds.forEach((round, roundIndex) => {
      const matches = round.matches.filter(m => !m.isBye)
      
      // Calculate vertical position for each match
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
      gap: '24px',
      justifyContent: 'center',
      padding: '16px 8px',
      minWidth: 'max-content',
      background: '#f8faf8',
      borderRadius: '8px',
      overflowX: 'auto',
    }}>
      {columns.map((column, colIndex) => {
        const isFinal = column.roundName === 'Final' || column.roundName === '🥉 Bronze'
        const matchHeight = isFinal ? 80 : 60
        const spacing = isFinal ? 0 : 20
        
        return (
          <div
            key={colIndex}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: isFinal ? '120px' : '140px',
              position: 'relative',
            }}
          >
            {/* Round Label */}
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#6a7a6a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
              padding: '4px 12px',
              background: '#ffffff',
              borderRadius: '12px',
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
                    minWidth: isFinal ? '120px' : '130px',
                    marginBottom: spacing,
                    padding: isFinal ? '12px 16px' : '8px 12px',
                    borderRadius: '6px',
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
                    fontSize: isFinal ? '13px' : '11px',
                    fontWeight: isCompleted && winnerLabel === team1Label ? '700' : '400',
                    color: isCompleted && winnerLabel === team1Label ? '#4ade80' : '#1a2a1a',
                  }}>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      maxWidth: '70px',
                    }}>
                      {team1Label}
                    </span>
                    {isCompleted && (
                      <span style={{ 
                        fontSize: isFinal ? '13px' : '11px', 
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
                    fontSize: isFinal ? '13px' : '11px',
                    fontWeight: isCompleted && winnerLabel === team2Label ? '700' : '400',
                    color: isCompleted && winnerLabel === team2Label ? '#4ade80' : '#1a2a1a',
                  }}>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      maxWidth: '70px',
                    }}>
                      {team2Label}
                    </span>
                    {isCompleted && (
                      <span style={{ 
                        fontSize: isFinal ? '13px' : '11px', 
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
                    fontSize: '10px',
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
