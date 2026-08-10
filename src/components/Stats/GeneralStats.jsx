// src/components/Stats/GeneralStats.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'

export default function GeneralStats({ refreshKey }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [refreshKey])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Get all players
      const { data: players } = await supabase
        .from('tennis_players')
        .select('id, name')

      // Get all completed matches (regular + tournament)
      const { data: matches } = await supabase
        .from('tennis_matches')
        .select('*')
        .eq('status', 'completed')

      if (!matches || !players) {
        setStats(null)
        setLoading(false)
        return
      }

      // Calculate player stats
      const playerStats = {}
      players.forEach(p => {
        playerStats[p.id] = {
          id: p.id,
          name: p.name,
          matches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        }
      })

      matches.forEach(m => {
        const isDraw = m.draw === true

        // Team 1 players
        ;(m.team1_players || []).forEach(p => {
          if (!playerStats[p.id]) return
          const s = playerStats[p.id]
          s.matches += 1
          if (isDraw) s.draws += 1
          else if (m.winner === 1) s.wins += 1
          else s.losses += 1
        })

        // Team 2 players
        ;(m.team2_players || []).forEach(p => {
          if (!playerStats[p.id]) return
          const s = playerStats[p.id]
          s.matches += 1
          if (isDraw) s.draws += 1
          else if (m.winner === 2) s.wins += 1
          else s.losses += 1
        })
      })

      const playerList = Object.values(playerStats)

      // Most Matches
      const mostMatches = [...playerList].sort((a, b) => b.matches - a.matches)[0]

      // Most Wins
      const mostWins = [...playerList].sort((a, b) => b.wins - a.wins)[0]

      // Best Win Rate (min 5 matches)
      const winRatePlayers = playerList.filter(p => p.matches >= 5)
      const bestWinRate = winRatePlayers.sort((a, b) => {
        const rateA = a.matches > 0 ? (a.wins / a.matches) * 100 : 0
        const rateB = b.matches > 0 ? (b.wins / b.matches) * 100 : 0
        return rateB - rateA
      })[0]

      // Longest Win Streak (all-time)
      let longestStreak = { player: null, streak: 0 }
      // This requires match history sorting, simplified for now
      // We'll calculate from matches sorted by date
      const sortedMatches = [...matches].sort((a, b) => 
        new Date(a.completed_at) - new Date(b.completed_at)
      )

      const streaks = {}
      sortedMatches.forEach(m => {
        const isDraw = m.draw === true
        if (isDraw) {
          // Draw breaks streak for both teams
          ;(m.team1_players || []).forEach(p => {
            if (streaks[p.id]) streaks[p.id] = 0
          })
          ;(m.team2_players || []).forEach(p => {
            if (streaks[p.id]) streaks[p.id] = 0
          })
          return
        }

        const winner = m.winner
        const loser = winner === 1 ? 2 : 1

        // Winner streak increases
        const winnerPlayers = winner === 1 ? m.team1_players : m.team2_players
        winnerPlayers.forEach(p => {
          if (!streaks[p.id]) streaks[p.id] = 0
          streaks[p.id] += 1
          if (streaks[p.id] > longestStreak.streak) {
            longestStreak.streak = streaks[p.id]
            longestStreak.player = playerStats[p.id]
          }
        })

        // Loser streak resets
        const loserPlayers = loser === 1 ? m.team1_players : m.team2_players
        loserPlayers.forEach(p => {
          if (streaks[p.id]) streaks[p.id] = 0
        })
      })

      // Best Doubles Pair (min 3 matches together)
      const pairStats = {}
      matches.forEach(m => {
        if (m.play_type !== 'doubles') return
        const t1 = m.team1_players || []
        const t2 = m.team2_players || []
        if (t1.length < 2 || t2.length < 2) return

        // Pair within team
        const pair1 = [t1[0], t1[1]].sort((a, b) => a.id.localeCompare(b.id))
        const pair2 = [t2[0], t2[1]].sort((a, b) => a.id.localeCompare(b.id))

        const isDraw = m.draw === true
        const pairKey = `${pair1[0].id}-${pair1[1].id}`

        if (!pairStats[pairKey]) {
          pairStats[pairKey] = {
            player1: pair1[0],
            player2: pair1[1],
            matches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
          }
        }

        const s = pairStats[pairKey]
        s.matches += 1
        if (isDraw) s.draws += 1
        else if (m.winner === 1) s.wins += 1
        else s.losses += 1

        // Also track opponent pair
        const opponentKey = `${pair2[0].id}-${pair2[1].id}`
        if (!pairStats[opponentKey]) {
          pairStats[opponentKey] = {
            player1: pair2[0],
            player2: pair2[1],
            matches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
          }
        }
        const s2 = pairStats[opponentKey]
        s2.matches += 1
        if (isDraw) s2.draws += 1
        else if (m.winner === 2) s2.wins += 1
        else s2.losses += 1
      })

      const pairList = Object.values(pairStats).filter(p => p.matches >= 3)
      const bestPair = pairList.sort((a, b) => {
        const rateA = (a.wins / a.matches) * 100
        const rateB = (b.wins / b.matches) * 100
        return rateB - rateA
      })[0] || null

      setStats({
        totalMatches: matches.length,
        totalPlayers: players.length,
        mostMatches,
        mostWins,
        bestWinRate,
        longestStreak,
        bestPair,
      })
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading stats...</div>
  if (!stats) return <div className="empty-state">No data available.</div>

  const StatCard = ({ label, value, sub }) => (
    <div style={{
      background: '#f8faf8',
      borderRadius: '8px',
      padding: '12px 16px',
      textAlign: 'center',
      flex: 1,
      minWidth: '100px',
    }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#1a2a1a' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#6a7a6a' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#d4a843', marginTop: '2px' }}>{sub}</div>}
    </div>
  )

  const formatWinRate = (player) => {
    if (!player || player.matches === 0) return '0%'
    return `${Math.round((player.wins / player.matches) * 100)}%`
  }

  return (
    <div className="card">
      {/* Total Matches & Players */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <StatCard label="Total Matches" value={stats.totalMatches} />
        <StatCard label="Total Players" value={stats.totalPlayers} />
      </div>

      {/* Player Achievements */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#1a2a1a',
          marginBottom: '8px',
        }}>
          🏆 Player Achievements
        </div>
        <div style={{
          background: '#f8faf8',
          borderRadius: '8px',
          padding: '12px 16px',
        }}>
          {stats.mostMatches && (
            <div style={{ padding: '4px 0', borderBottom: '1px solid #e8f0e6' }}>
              🥇 Most Matches: <strong>{stats.mostMatches.name}</strong> ({stats.mostMatches.matches})
            </div>
          )}
          {stats.mostWins && (
            <div style={{ padding: '4px 0', borderBottom: '1px solid #e8f0e6' }}>
              🥇 Most Wins: <strong>{stats.mostWins.name}</strong> ({stats.mostWins.wins})
            </div>
          )}
          {stats.bestWinRate && (
            <div style={{ padding: '4px 0', borderBottom: '1px solid #e8f0e6' }}>
              🥇 Best Win Rate: <strong>{stats.bestWinRate.name}</strong> ({formatWinRate(stats.bestWinRate)} · {stats.bestWinRate.wins}-{stats.bestWinRate.losses})
            </div>
          )}
          {stats.longestStreak && stats.longestStreak.player && (
            <div style={{ padding: '4px 0' }}>
              🥇 Longest Win Streak: <strong>{stats.longestStreak.player.name}</strong> ({stats.longestStreak.streak} wins)
            </div>
          )}
        </div>
      </div>

      {/* Best Doubles Pair */}
      {stats.bestPair && (
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#1a2a1a',
            marginBottom: '8px',
          }}>
            🎾 Best Doubles Pair
          </div>
          <div style={{
            background: '#f8faf8',
            borderRadius: '8px',
            padding: '12px 16px',
          }}>
            <div>
              🏆 <strong>{stats.bestPair.player1.name} & {stats.bestPair.player2.name}</strong>
              <span style={{ color: '#6a7a6a', marginLeft: '8px' }}>
                ({stats.bestPair.wins}-{stats.bestPair.losses} · {Math.round((stats.bestPair.wins / stats.bestPair.matches) * 100)}% win rate)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
