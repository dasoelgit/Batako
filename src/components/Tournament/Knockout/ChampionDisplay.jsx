// src/components/Tournament/KnockoutDashboard/ChampionDisplay.jsx
export default function ChampionDisplay({ champion, bronzeWinner, getMatchLabel }) {
  if (!champion) return null

  return (
    <div style={{
      textAlign: 'center',
      padding: '12px',
      marginBottom: '16px',
      background: 'rgba(212, 233, 75, 0.15)',
      borderRadius: '8px',
      border: '2px solid #d4e94b',
    }}>
      <div style={{ fontSize: '14px', color: '#6a7a6a' }}>🏆 Champion</div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: '#d4a843' }}>
        {getMatchLabel([champion])}
      </div>
      {bronzeWinner && (
        <div style={{ marginTop: '8px', fontSize: '14px', color: '#6a7a6a' }}>
          🥉 Bronze: {getMatchLabel([bronzeWinner])}
        </div>
      )}
    </div>
  )
}
