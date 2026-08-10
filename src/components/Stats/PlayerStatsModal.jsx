// src/components/Stats/PlayerStatsModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'

export default function PlayerStatsModal({ player, onClose }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlayerStats()
  }, [player])

  const loadPlayerStats = async () => {
    setLoading(true)
    try {
      const { data: matches } = await supabase
        .from('tennis_matches')
        .select('*')
        .eq('status', 'completed')

      if (!matches) {
        setStats(null)
        setLoading(false)
        return
      }

      // Filter matches involving this player
      const playerMatches = matches.filter(m => {
        const allPlayers = [...(m.team1_players || []), ...(m.team2_players || [])]
        return allPlayers.some(p => p.id === player.id)
      })

      // Career stats
      let wins = 0, losses = 0, draws = 0
      let pointsScored = 0, pointsConceded = 0

      playerMatches.forEach(m => {
        const isDraw = m.draw === true
        const isTeam1 = (m.team1_players || []).some(p => p.id === player.id)
        
        // Points (games)
        if (isTeam1) {
          pointsScored += m.team1_games || 0
          pointsConceded += m.team2_games || 0
        } else {
          pointsScored += m.team2_games || 0
          pointsConceded += m.team1_games || 0
        }

        if (isDraw) {
          draws += 1
        } else {
          const isWinner = isTeam1 ? m.winner === 1 : m.winner === 2
          if (isWinner) wins += 1
          else losses += 1
        }
      })

      const totalMatches = playerMatches.length
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
      const diff = pointsScored - pointsConceded

      // Head-to-Head (combined)
      const h2h = {}
      playerMatches.forEach(m => {
        const isTeam1 = (m.team1_players || []).some(p => p.id === player.id)
        const opponentPlayers = isTeam1 ? (m.team2_players || []) : (m.team1_players || [])
        
        opponentPlayers.forEach(op => {
          if (!op || op.id === player.id) return
          if (!h2h[op.id]) {
            h2h[op.id] = { name: op.name, wins: 0, losses: 0, draws: 0 }
          }
          const isDraw = m.draw === true
          if (isDraw) {
            h2h[op.id].draws += 1
          } else {
            const isWinner = isTeam1 ? m.winner === 1 : m.winner === 2
            if (isWinner) h2h[op.id].wins += 1
            else h2h[op.id].losses += 1
          }
        })
      })

      const h2hList = Object.values(h2h).sort((a, b) => {
        const totalA = a.wins + a.losses + a.draws
        const totalB = b.wins + b.losses + b.draws
        return totalB - totalA
      })

      // Doubles stats: most common partner & best partner
      const partnerStats = {}
      playerMatches.forEach(m => {
        if (m.play_type !== 'doubles') return
        const isTeam1 = (m.team1_players || []).some(p => p.id === player.id)
        const teammates = isTeam1 ? (m.team1_players || []) : (m.team2_players || [])
        const partner = teammates.find(p => p.id !== player.id)
        if (!partner) return

        if (!partnerStats[partner.id]) {
          partnerStats[partner.id] = { name: partner.name, matches: 0, wins: 0, losses: 0, draws: 0 }
        }

        const s = partnerStats[partner.id]
        s.matches += 1
        const isDraw = m.draw === true
        if (isDraw) {
          s.draws += 1
        } else {
          const isWinner = isTeam1 ? m.winner === 1 : m.winner === 2
          if (isWinner) s.wins += 1
          else s.losses += 1
        }
      })

      const partnerList = Object.values(partnerStats)
      
      // Most common partner
      const mostCommon = partnerList.sort((a, b) => b.matches - a.matches)[0] || null
      
      // Best partner (min 3 matches)
      const bestPartner = partnerList
        .filter(p => p.matches >= 3)
        .sort((a, b) => {
          const rateA = a.matches > 0 ? (a.wins / a.matches) * 100 : 0
          const rateB = b.matches > 0 ? (b.wins / b.matches) * 100 : 0
          return rateB - rateA
        })[0] || null

      setStats({
        totalMatches,
        wins,
        losses,
        draws,
        winRate,
        pointsScored,
        pointsConceded,
        diff,
        h2h: h2hList,
        mostCommon,
        bestPartner,
      })
    } catch (err) {
      console.error('Error loading player stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }} onClick={onClose}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }} onClick={e => e.stopPropagation()}>
          <div className="loading">Loading player stats...</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }} onClick={onClose}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }} onClick={e => e.stopPropagation()}>
          <div>No data available for this player.</div>
          <button className="btn-primary" style={{ marginTop: '16px' }} onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '480px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1a2a1a',
          }}>
            👤 {player.name}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6a7a6a',
            }}
          >
            ✕
          </button>
        </div>

        {/* Career Stats */}
        <div style={{
          background: '#f8faf8',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>📊 Career Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '13px' }}>
            <div>Matches: <strong>{stats.totalMatches}</strong></div>
            <div>Win Rate: <strong>{stats.winRate}%</strong></div>
            <div>Wins: <strong>{stats.wins}</strong></div>
            <div>Losses: <strong>{stats.losses}</strong></div>
            <div>Draws: <strong>{stats.draws}</strong></div>
            <div>+/-: <strong style={{ color: stats.diff >= 0 ? '#4ade80' : '#f87171' }}>
              {stats.diff > 0 ? '+' : ''}{stats.diff}
            </strong></div>
          </div>
        </div>

        {/* Head-to-Head */}
        {stats.h2h.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>📋 Head-to-Head</div>
            <div style={{
              background: '#f8faf8',
              borderRadius: '8px',
              padding: '8px 12px',
            }}>
              {stats.h2h.map((op, i) => {
                const total = op.wins + op.losses + op.draws
                const isWinning = op.wins > op.losses
                return (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: i < stats.h2h.length - 1 ? '1px solid #e8f0e6' : 'none',
                    fontSize: '13px',
                  }}>
                    <span>vs {op.name}</span>
                    <span>
                      <span style={{ fontWeight: '600' }}>
                        {op.wins}-{op.losses}
                        {op.draws > 0 && `-${op.draws}`}
                      </span>
                      <span style={{ marginLeft: '6px' }}>
                        {isWinning ? '✅' : op.wins === op.losses ? '⚖️' : '❌'}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Doubles Stats */}
        {(stats.mostCommon || stats.bestPartner) && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>🎾 Doubles</div>
            <div style={{
              background: '#f8faf8',
              borderRadius: '8px',
              padding: '8px 12px',
            }}>
              {stats.mostCommon && (
                <div style={{ padding: '4px 0' }}>
                  Most Common Partner: <strong>{stats.mostCommon.name}</strong> ({stats.mostCommon.matches} matches)
                </div>
              )}
              {stats.bestPartner && stats.mostCommon && stats.bestPartner.name !== stats.mostCommon.name && (
                <div style={{ padding: '4px 0', borderTop: '1px solid #e8f0e6' }}>
                  Best Partner: <strong>{stats.bestPartner.name}</strong> ({stats.bestPartner.wins}-{stats.bestPartner.losses} · {Math.round((stats.bestPartner.wins / stats.bestPartner.matches) * 100)}%)
                </div>
              )}
              {stats.bestPartner && !stats.mostCommon && (
                <div style={{ padding: '4px 0' }}>
                  Best Partner: <strong>{stats.bestPartner.name}</strong> ({stats.bestPartner.wins}-{stats.bestPartner.losses} · {Math.round((stats.bestPartner.wins / stats.bestPartner.matches) * 100)}%)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
