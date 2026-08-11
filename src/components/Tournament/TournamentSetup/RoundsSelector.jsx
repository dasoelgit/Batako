// src/components/Tournament/TournamentSetup/RoundsSelector.jsx
export default function RoundsSelector({
  useFullRoundRobin,
  setUseFullRoundRobin,
  totalRounds,
  setTotalRounds,
  maxRounds,
  selectedPlayers,
  isFixedPartner,
  fixedTeams,
}) {
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

  const labelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#d4a843',
    fontWeight: '700',
    marginBottom: '6px',
    display: 'block',
  }

  const count = isFixedPartner ? fixedTeams.length : selectedPlayers.length

  return (
    <div style={{ marginBottom: '16px' }}>
      <span style={labelStyle}>Rounds</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          style={toggleButtonStyle(useFullRoundRobin)}
          onClick={() => setUseFullRoundRobin(true)}
        >
          Full Round Robin
        </button>
        <button
          style={toggleButtonStyle(!useFullRoundRobin)}
          onClick={() => setUseFullRoundRobin(false)}
        >
          Custom Rounds
        </button>
      </div>

      {!useFullRoundRobin && (
        <div>
          <span style={{ ...labelStyle, color: '#6a7a6a', fontSize: '12px' }}>
            Number of Rounds
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {Array.from({ length: Math.max(maxRounds, 1) }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: totalRounds === v ? '2px solid #d4e94b' : '1px solid #d0ddd0',
                  background: totalRounds === v ? '#d4e94b' : '#ffffff',
                  color: totalRounds === v ? '#1a2a1a' : '#6a7a6a',
                  fontWeight: totalRounds === v ? '700' : '400',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setTotalRounds(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#6a7a6a', marginTop: '4px' }}>
            Max rounds: {maxRounds}
          </div>

          {selectedPlayers.length % 2 !== 0 && totalRounds < maxRounds && (
            <div style={{
              fontSize: '12px',
              color: '#fbbf24',
              marginTop: '8px',
              padding: '8px 12px',
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(251, 191, 36, 0.2)',
            }}>
              ⚠️ With {totalRounds} rounds and {selectedPlayers.length} players, not all players will get the same number of byes.
              Some players may play fewer matches than others.
            </div>
          )}
        </div>
      )}

      {useFullRoundRobin && (
        <div style={{ fontSize: '11px', color: '#6a7a6a', marginTop: '4px' }}>
          {maxRounds} rounds · {count} {isFixedPartner ? 'teams' : 'players'}
        </div>
      )}
    </div>
  )
}
