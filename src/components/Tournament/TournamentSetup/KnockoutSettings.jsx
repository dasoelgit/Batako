// src/components/Tournament/TournamentSetup/KnockoutSettings.jsx
export default function KnockoutSettings({
  knockoutMatchType,
  setKnockoutMatchType,
  bronzeMatch,
  setBronzeMatch,
  selectedPlayers,
  knockoutTeams,
  setKnockoutTeams,
  setError,
}) {
  const labelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#d4a843',
    fontWeight: '700',
    marginBottom: '6px',
    display: 'block',
  }

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

  // ============================================================
  // KNOCKOUT DOUBLES TEAM FUNCTIONS (same as Fixed Partner)
  // ============================================================
  const autoCreateKnockoutTeams = () => {
    if (selectedPlayers.length < 2) {
      setError('Need at least 2 players to create teams.')
      return
    }

    if (selectedPlayers.length % 2 !== 0) {
      setError('Need an even number of players for doubles. (4, 6, 8)')
      return
    }

    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5)
    const teams = []
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        teams.push({
          player1: shuffled[i],
          player2: shuffled[i + 1],
        })
      }
    }
    setKnockoutTeams(teams)
    setError('')
  }

  const removeKnockoutTeam = (index) => {
    setKnockoutTeams(knockoutTeams.filter((_, i) => i !== index))
  }

  const clearKnockoutTeams = () => {
    setKnockoutTeams([])
  }

  const isKnockoutDoubles = knockoutMatchType === 'doubles'

  return (
    <>
      <span style={labelStyle}>Match Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          style={toggleButtonStyle(knockoutMatchType === 'singles')}
          onClick={() => {
            setKnockoutMatchType('singles')
            setKnockoutTeams([])
          }}
        >
          Singles
        </button>
        <button
          style={toggleButtonStyle(knockoutMatchType === 'doubles')}
          onClick={() => {
            setKnockoutMatchType('doubles')
            // Auto-create teams when switching to doubles if even number
            if (selectedPlayers.length % 2 === 0 && selectedPlayers.length >= 2) {
              const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5)
              const teams = []
              for (let i = 0; i < shuffled.length; i += 2) {
                if (i + 1 < shuffled.length) {
                  teams.push({
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                  })
                }
              }
              setKnockoutTeams(teams)
            }
          }}
        >
          Doubles
        </button>
      </div>

      {/* Knockout Doubles Team Builder (same as Fixed Partner) */}
      {isKnockoutDoubles && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}>
            <span style={{ fontSize: '12px', color: '#6a7a6a' }}>
              Teams ({knockoutTeams.length} teams)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn-secondary"
                style={{ width: 'auto', padding: '4px 12px', fontSize: '11px' }}
                onClick={autoCreateKnockoutTeams}
                disabled={selectedPlayers.length < 2 || selectedPlayers.length % 2 !== 0}
              >
                ⚡ Auto Create
              </button>
              <button
                className="btn-secondary"
                style={{ width: 'auto', padding: '4px 12px', fontSize: '11px' }}
                onClick={clearKnockoutTeams}
              >
                Clear
              </button>
            </div>
          </div>

          {selectedPlayers.length > 0 && selectedPlayers.length % 2 !== 0 && (
            <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '8px' }}>
              ⚠️ Need even number of players for doubles. Currently: {selectedPlayers.length}
            </div>
          )}

          {knockoutTeams.length > 0 ? (
            <div style={{
              border: '1px solid #d0ddd0',
              borderRadius: '6px',
              padding: '6px',
              background: '#f8faf8',
            }}>
              {knockoutTeams.map((team, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderBottom: index < knockoutTeams.length - 1 ? '1px solid #e8f0e6' : 'none',
                  }}
                >
                  <span style={{ fontWeight: '500', fontSize: '13px' }}>
                    Team {index + 1}: {team.player1.name} / {team.player2.name}
                  </span>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c0392b',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                    onClick={() => removeKnockoutTeam(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '8px',
              textAlign: 'center',
              color: '#6a7a6a',
              background: '#f8faf8',
              borderRadius: '6px',
              fontSize: '13px',
            }}>
              {selectedPlayers.length % 2 !== 0 ? (
                <span style={{ color: '#f87171' }}>
                  ⚠️ Need even number of players for doubles. Currently: {selectedPlayers.length}
                </span>
              ) : (
                'Select players and click "Auto Create" to create teams.'
              )}
            </div>
          )}
        </div>
      )}

      <span style={labelStyle}>Bronze Match</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          style={toggleButtonStyle(bronzeMatch === false)}
          onClick={() => setBronzeMatch(false)}
        >
          OFF
        </button>
        <button
          style={toggleButtonStyle(bronzeMatch === true)}
          onClick={() => setBronzeMatch(true)}
        >
          ON
        </button>
      </div>
    </>
  )
}
