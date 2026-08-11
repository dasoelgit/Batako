// src/components/Tournament/TournamentSetup/KnockoutSettings.jsx
import SeedOrderList from './SeedOrderList'

export default function KnockoutSettings({
  knockoutMatchType,
  setKnockoutMatchType,
  seeding,
  setSeeding,
  bronzeMatch,
  setBronzeMatch,
  selectedPlayers,
  moveSelectedPlayer,
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

  return (
    <>
      <span style={labelStyle}>Match Type</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          style={toggleButtonStyle(knockoutMatchType === 'singles')}
          onClick={() => setKnockoutMatchType('singles')}
        >
          Singles
        </button>
        <button
          style={toggleButtonStyle(knockoutMatchType === 'doubles')}
          onClick={() => setKnockoutMatchType('doubles')}
        >
          Doubles
        </button>
      </div>

      <span style={labelStyle}>Seeding</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          style={toggleButtonStyle(seeding === 'random')}
          onClick={() => setSeeding('random')}
        >
          Random
        </button>
        <button
          style={toggleButtonStyle(seeding === 'ranked')}
          onClick={() => setSeeding('ranked')}
        >
          Ranked
        </button>
      </div>

      {seeding === 'ranked' && selectedPlayers.length > 0 && (
        <SeedOrderList players={selectedPlayers} movePlayer={moveSelectedPlayer} />
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
