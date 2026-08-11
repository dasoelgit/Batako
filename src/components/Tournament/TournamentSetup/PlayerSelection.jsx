// src/components/Tournament/TournamentSetup/PlayerSelection.jsx
export default function PlayerSelection({
  players,
  selectedPlayers,
  togglePlayer,
  selectAll,
  clearAll,
  newPlayerName,
  setNewPlayerName,
  handleAddPlayer,
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

  return (
    <>
      <span style={labelStyle}>Select Players ({selectedPlayers.length} selected)</span>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
          onClick={selectAll}
        >
          Select All
        </button>
        <button
          className="btn-secondary"
          style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
          onClick={clearAll}
        >
          Clear All
        </button>
      </div>

      <div style={{
        maxHeight: '180px',
        overflowY: 'auto',
        border: '1px solid #d0ddd0',
        borderRadius: '8px',
        padding: '8px',
        marginBottom: '8px',
        background: '#f8faf8',
      }}>
        {players.map((player) => {
          const isSelected = selectedPlayers.find(p => p.id === player.id)
          return (
            <label
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(212, 233, 75, 0.15)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={() => togglePlayer(player)}
              />
              <span>{player.name}</span>
            </label>
          )
        })}
        {players.length === 0 && (
          <div style={{ padding: '8px', color: '#6a7a6a', textAlign: 'center' }}>
            No players available. Add a player below.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Add new player..."
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d0ddd0',
            background: '#ffffff',
            color: '#1a2a1a',
            fontSize: '14px',
            outline: 'none',
            marginBottom: 0,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddPlayer()
          }}
        />
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
          onClick={handleAddPlayer}
          disabled={!newPlayerName.trim()}
        >
          Add
        </button>
      </div>
    </>
  )
}
