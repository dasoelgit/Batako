// src/components/Stats/Leaderboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import PlayerStatsModal from './PlayerStatsModal'

function buildStandings(matches) {
  const stats = new Map()
  const ensure = (p) => {
    if (!stats.has(p.id)) stats.set(p.id, {
      id: p.id,
      name: p.name,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      matches: 0,
    })
    return stats.get(p.id)
  }

  for (const m of matches) {
    if (m.status !== 'completed') continue

    const isDraw = m.draw === true

    for (const p of m.team1_players) {
      const s = ensure(p)
      s.matches += 1
      if (isDraw) {
        s.draws += 1
        s.points += 2
      } else if (m.winner === 1) {
        s.wins += 1
        s.points += 3
      } else {
        s.losses += 1
        s.points += 1
      }
    }

    for (const p of m.team2_players) {
      const s = ensure(p)
      s.matches += 1
      if (isDraw) {
        s.draws += 1
        s.points += 2
      } else if (m.winner === 2) {
        s.wins += 1
        s.points += 3
      } else {
        s.losses += 1
        s.points += 1
      }
    }
  }

  const rows = Array.from(stats.values())
  rows.sort((a, b) => b.points - a.points || (b.wins - a.wins) || a.name.localeCompare(b.name))
  return rows
}

export default function Leaderboard({ refreshKey }) {
  const [rows, setRows] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('tennis_matches')
      .select('winner, draw, team1_players, team2_players, status')
      .eq('status', 'completed')
      .then(({ data }) => {
        if (active && data) setRows(buildStandings(data))
      })
    return () => { active = false }
  }, [refreshKey])

  const handlePlayerClick = (player) => {
    setSelectedPlayer(player)
    setShowModal(true)
  }

  if (rows === null) return <div className="loading">Loading standings…</div>
  if (rows.length === 0) return <div className="empty-state">No completed matches yet.</div>

  return (
    <div className="card">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '30px 1fr 36px 36px 40px 50px',
        gap: '6px',
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
        fontSize: '10px',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: '600',
      }}>
        <div>#</div>
        <div>Player</div>
        <div style={{ textAlign: 'center' }}>W</div>
        <div style={{ textAlign: 'center' }}>D</div>
        <div style={{ textAlign: 'center' }}>L</div>
        <div style={{ textAlign: 'right' }}>Pts</div>
      </div>

      {rows.map((r, i) => (
        <div
          key={r.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '30px 1fr 36px 36px 40px 50px',
            gap: '6px',
            padding: '8px 0',
            borderBottom: '1px solid var(--border-light)',
            alignItems: 'center',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onClick={() => handlePlayerClick(r)}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f8faf8'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>{i + 1}</div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{r.name}</div>
          <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent-dark)' }}>{r.wins}</div>
          <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--gold)' }}>{r.draws}</div>
          <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>{r.losses}</div>
          <div style={{ textAlign: 'right', fontWeight: '700', color: 'var(--gold)' }}>
            {r.points}
          </div>
        </div>
      ))}

      <div style={{
        fontSize: '10px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        marginTop: '8px',
        borderTop: '1px solid var(--border-light)',
        paddingTop: '8px',
      }}>
        3 pts Win · 2 pts Draw · 1 pt Loss
      </div>

      {showModal && selectedPlayer && (
        <PlayerStatsModal
          player={selectedPlayer}
          onClose={() => {
            setShowModal(false)
            setSelectedPlayer(null)
          }}
        />
      )}
    </div>
  )
}
