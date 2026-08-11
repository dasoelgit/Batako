// src/components/Tournament/TournamentSetup/SeedOrderList.jsx
export default function SeedOrderList({ players, movePlayer }) {
  if (!players || players.length === 0) return null

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6a7a6a', marginBottom: '6px' }}>
        Seed order — #1 is the strongest and gets the first bye. Use ▲▼ to reorder.
      </div>
      <div style={{
        border: '1px solid #d0ddd0',
        borderRadius: '8px',
        padding: '6px',
        background: '#f8faf8',
        maxHeight: '180px',
        overflowY: 'auto',
      }}>
        {players.map((player, index) => (
          <div
            key={player.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#6a7a6a', width: '20px' }}>
              {index + 1}.
            </span>
            <span style={{ flex: 1, fontSize: '13px' }}>{player.name}</span>
            <button
              type="button"
              onClick={() => movePlayer(index, -1)}
              disabled={index === 0}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: index === 0 ? 'default' : 'pointer',
                opacity: index === 0 ? 0.3 : 1,
                fontSize: '13px',
                padding: '2px 6px',
              }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => movePlayer(index, 1)}
              disabled={index === players.length - 1}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: index === players.length - 1 ? 'default' : 'pointer',
                opacity: index === players.length - 1 ? 0.3 : 1,
                fontSize: '13px',
                padding: '2px 6px',
              }}
            >
              ▼
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
