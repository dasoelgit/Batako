// src/components/MatchCompleteScreen.jsx
import { teamLabel } from '../utils/helpers'

export default function MatchCompleteScreen({ match, onContinue }) {
  const { team1_players, team2_players, sets, winner, draw, match_config } = match

  const isDraw = draw === true
  const winningTeam = isDraw ? null : (winner === 1 ? team1_players : team2_players)
  const winnerName = isDraw ? 'DRAW' : (winningTeam ? teamLabel(winningTeam) : 'Unknown')

  const setsWon1 = sets?.filter(s => s.winner === 1).length || 0
  const setsWon2 = sets?.filter(s => s.winner === 2).length || 0

  const totalSets = match_config === 'single' ? 1 : match_config === 'best_of_3' ? 3 : 5

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '480px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      border: isDraw ? '2px solid var(--gold)' : '2px solid var(--accent)',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '8px' }}>
        {isDraw ? '⚖️' : '🏆'}
      </div>
      <div style={{
        fontSize: '28px',
        fontWeight: '800',
        color: 'var(--gold)',
        marginBottom: '4px',
      }}>
        {isDraw ? 'MATCH DRAW!' : `${winnerName} WINS!`}
      </div>
      <div style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        {isDraw ? 'Both teams tied' : 'Champion of the match'}
      </div>

      {/* Set score summary */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        margin: '16px 0',
        fontSize: '20px',
        fontWeight: '700',
      }}>
        <span style={{ color: 'var(--text-primary)' }}>{setsWon1}</span>
        <span style={{ color: 'var(--text-muted)' }}>:</span>
        <span style={{ color: 'var(--text-primary)' }}>{setsWon2}</span>
      </div>

      {/* Set breakdown */}
      {sets && sets.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}>
          {sets.map((s, i) => (
            <div key={i} style={{
              background: 'var(--bg-app)',
              padding: '6px 14px',
              borderRadius: '8px',
              minWidth: '50px',
            }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Set {i + 1}</div>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>
                {s.team1_games}-{s.team2_games}
                {s.tiebreak && ` (${s.tiebreak})`}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={onContinue}
        style={{ maxWidth: '200px', margin: '0 auto' }}
      >
        Next →
      </button>
    </div>
  )
}
