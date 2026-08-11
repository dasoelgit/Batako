// src/components/Tournament/TournamentDashboard/StandingsTable.jsx
export default function StandingsTable({ standings, standingBy }) {
  if (!standings || standings.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6a7a6a' }}>
        No matches played yet.
      </div>
    )
  }

  return (
    <div style={{
      background: '#f8faf8',
      borderRadius: '8px',
      padding: '8px 12px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '30px 1fr 30px 30px 30px 40px 50px',
        gap: '4px',
        padding: '6px 0',
        borderBottom: '1px solid #d0ddd0',
        fontSize: '10px',
        color: '#6a7a6a',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: '0.05em',
      }}>
        <div>#</div>
        <div>Player</div>
        <div style={{ textAlign: 'center' }}>W</div>
        <div style={{ textAlign: 'center' }}>L</div>
        <div style={{ textAlign: 'center' }}>T</div>
        <div style={{ textAlign: 'center' }}>Pts</div>
        <div style={{ textAlign: 'right' }}>+/-</div>
      </div>

      {standings.map((s, i) => {
        const diff = s.diff || 0
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`

        return (
          <div key={s.id} style={{
            display: 'grid',
            gridTemplateColumns: '30px 1fr 30px 30px 30px 40px 50px',
            gap: '4px',
            padding: '6px 0',
            borderBottom: i < standings.length - 1 ? '1px solid #e8f0e6' : 'none',
            alignItems: 'center',
            fontSize: '13px',
          }}>
            <div style={{
              fontWeight: '700',
              color: i === 0 ? '#d4a843' : i === 1 ? '#a8a8a8' : i === 2 ? '#cd7f32' : '#6a7a6a',
            }}>
              {medal}
            </div>
            <div style={{ fontWeight: '600' }}>{s.name}</div>
            <div style={{ textAlign: 'center', fontWeight: '600' }}>{s.W}</div>
            <div style={{ textAlign: 'center', color: '#6a7a6a' }}>{s.L}</div>
            <div style={{ textAlign: 'center', color: '#d4a843' }}>{s.T}</div>
            <div style={{ textAlign: 'center', fontWeight: '700', color: '#d4a843' }}>{s.Pts}</div>
            <div style={{
              textAlign: 'right',
              fontWeight: '600',
              color: diff > 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#6a7a6a',
            }}>
              {diff > 0 ? `+${diff}` : diff}
            </div>
          </div>
        )
      })}

      <div style={{
        fontSize: '9px',
        color: '#6a7a6a',
        textAlign: 'center',
        marginTop: '4px',
      }}>
        {standingBy === 'win'
          ? '3 pts Win · 1 pt Draw · 0 pts Loss'
          : 'Points based on games won'}
      </div>
    </div>
  )
}
