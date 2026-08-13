// src/components/Tournament/knockout/BracketMatchList.jsx
import { useEffect, useRef, useState } from 'react'

export default function BracketMatchList({
  rounds,
  getMatchLabel,
  getTeamName,
  isMatchReady,
  onMatchClick,
  champion,
  bronzeWinner,
}) {
  const scrollRef = useRef(null)
  const columnRefs = useRef([])
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  // Build bracket columns — one entry per round, holding just the real
  // matches (no blank spacer slots). Columns naturally shrink in height
  // round over round since each round has half as many matches.
  const buildBracketColumns = () => {
    return rounds.map((round, roundIndex) => ({
      roundName: round.round_name || `Round ${round.round_number}`,
      isBronze: round.isBronze || false,
      matches: round.matches
        .map((match, matchIndex) => ({ match, matchIndex }))
        .filter(({ match }) => !match.isBye),
      roundIndex: roundIndex,
    }))
  }

  const getRoundName = (round) => {
    if (round.isBronze) return '🥉 Bronze'
    return round.round_name || `Round ${round.round_number}`
  }

  const columns = buildBracketColumns()

  // Auto-scroll to the first ready match
  useEffect(() => {
    if (!scrollRef.current || columns.length === 0) return

    let targetIndex = columns.findIndex(col =>
      col.matches.some(({ match }) => isMatchReady(match))
    )

    if (targetIndex === -1) {
      targetIndex = columns.findIndex(col =>
        col.matches.some(({ match }) => !match.completed)
      )
    }

    if (targetIndex === -1) targetIndex = 0

    const targetEl = columnRefs.current[targetIndex]
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: 'auto',
        inline: 'start',
        block: 'nearest',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds.length])

  // Track scroll position for fade hints
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateFades = () => {
      setShowLeftFade(el.scrollLeft > 4)
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    updateFades()
    el.addEventListener('scroll', updateFades, { passive: true })
    window.addEventListener('resize', updateFades)
    return () => {
      el.removeEventListener('scroll', updateFades)
      window.removeEventListener('resize', updateFades)
    }
  }, [columns.length])

  // Helper to get winner label safely
  const getWinnerLabel = (match) => {
    if (!match || !match.completed || !match.winner) return null
    
    const winner = match.winner
    
    // Doubles: winner has a players array
    if (winner.players) {
      return winner.name || winner.players.map(p => p.name).join(' / ')
    }
    
    // Array of players
    if (Array.isArray(winner)) {
      return getMatchLabel(winner)
    }
    
    // Singles: winner is a player object
    return winner.name || 'Unknown'
  }

  // Check if a team is a placeholder
  const isPlaceholderTeam = (team) => {
    if (!team || !Array.isArray(team) || team.length === 0) return false
    return team.some(p => p?.isPlaceholder)
  }

  // Helper to get team display name with fallbacks
  const getTeamDisplayName = (match, side) => {
    // First try team1Name/team2Name from the match
    if (side === 1 && match.team1Name) return match.team1Name
    if (side === 2 && match.team2Name) return match.team2Name
    
    // Then try getTeamName
    return getTeamName(match, side)
  }

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
    <div style={{ position: 'relative' }}>
      <style>{`
        .bracket-scroll {
          --col-width: 140px;
          --col-width-final: 120px;
          --match-height: 60px;
          --match-height-final: 80px;
          --name-max-width: 70px;
          --font-size: 11px;
          --font-size-final: 13px;
          --gap: 24px;
        }
        @media (max-width: 520px) {
          .bracket-scroll {
            --col-width: 112px;
            --col-width-final: 104px;
            --match-height: 52px;
            --match-height-final: 68px;
            --name-max-width: 56px;
            --font-size: 10.5px;
            --font-size-final: 12px;
            --gap: 14px;
          }
        }
        .bracket-scroll {
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }
        .bracket-column {
          scroll-snap-align: start;
        }
        .bracket-match-card:active {
          transform: scale(0.98);
        }
      `}</style>

      <div
        ref={scrollRef}
        className="bracket-scroll"
        style={{
          display: 'flex',
          gap: 'var(--gap)',
          justifyContent: rounds.length <= 2 ? 'center' : 'flex-start',
          padding: '16px 8px',
          minWidth: 'max-content',
          background: '#f8faf8',
          borderRadius: '8px',
          overflowX: 'auto',
          alignItems: 'flex-start',
        }}
      >
        {columns.map((column, colIndex) => {
          const isFinal = column.roundName === 'Final' || column.roundName === '🥉 Bronze'

          return (
            <div
              key={colIndex}
              ref={el => (columnRefs.current[colIndex] = el)}
              className="bracket-column"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: isFinal ? 'var(--col-width-final)' : 'var(--col-width)',
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
                position: 'sticky',
                top: 0,
              }}>
                {getRoundName(rounds[colIndex])}
              </div>

              {/* Matches in column */}
              {column.matches.map(({ match, matchIndex }, idx) => {
                const spacing = isFinal ? 0 : 20
                const isCompleted = match.completed
                const isReady = isMatchReady(match)
                
                // Get team labels with proper fallbacks
                const team1Label = getTeamDisplayName(match, 1)
                const team2Label = getTeamDisplayName(match, 2)

                const winnerLabel = getWinnerLabel(match)
                const isWinner1 = isCompleted && winnerLabel && team1Label === winnerLabel
                const isWinner2 = isCompleted && winnerLabel && team2Label === winnerLabel

                return (
                  <div
                    key={idx}
                    className="bracket-match-card"
                    onClick={() => {
                      if (isReady) {
                        onMatchClick(column.roundIndex, matchIndex)
                      }
                    }}
                    style={{
                      height: isFinal ? 'var(--match-height-final)' : 'var(--match-height)',
                      width: '100%',
                      minWidth: isFinal ? 'var(--col-width-final)' : 'var(--col-width)',
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
                      transition: 'transform 0.1s ease, background 0.2s ease, box-shadow 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      touchAction: 'manipulation',
                    }}
                  >
                    {/* Team 1 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: isFinal ? 'var(--font-size-final)' : 'var(--font-size)',
                      fontWeight: isWinner1 ? '700' : '400',
                      color: isWinner1 ? '#4ade80' : '#1a2a1a',
                    }}>
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 'var(--name-max-width)',
                      }}>
                        {team1Label}
                      </span>
                      {isCompleted && (
                        <span style={{
                          fontSize: isFinal ? 'var(--font-size-final)' : 'var(--font-size)',
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
                      fontSize: isFinal ? 'var(--font-size-final)' : 'var(--font-size)',
                      fontWeight: isWinner2 ? '700' : '400',
                      color: isWinner2 ? '#4ade80' : '#1a2a1a',
                    }}>
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 'var(--name-max-width)',
                      }}>
                        {team2Label}
                      </span>
                      {isCompleted && (
                        <span style={{
                          fontSize: isFinal ? 'var(--font-size-final)' : 'var(--font-size)',
                          fontWeight: '600',
                          color: '#d4a843',
                          marginLeft: '4px',
                        }}>
                          {match.score2}
                        </span>
                      )}
                    </div>

                    {/* Status indicator - only show ⏳ or ⏸️, no ✅ */}
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      right: '4px',
                      fontSize: '10px',
                    }}>
                      {!isCompleted && isReady ? '⏳' : (!isCompleted && !isReady ? '⏸️' : '')}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Edge fade hints */}
      {showLeftFade && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '24px',
          background: 'linear-gradient(to right, #f8faf8, transparent)',
          pointerEvents: 'none',
          borderRadius: '8px 0 0 8px',
        }} />
      )}
      {showRightFade && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '24px',
          background: 'linear-gradient(to left, #f8faf8, transparent)',
          pointerEvents: 'none',
          borderRadius: '0 8px 8px 0',
        }} />
      )}
    </div>
  )
}
