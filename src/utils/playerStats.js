// src/utils/playerStats.js
import { supabase } from './supabase'

// ============================================================
// CALCULATE PLAYER STATS
// ============================================================

export async function calculatePlayerStats(playerId, dateFilter = 'all', customStart = '', customEnd = '') {
  try {
    let query = supabase
      .from('tennis_matches')
      .select('*')
      .eq('status', 'completed')

    // Apply date filter
    const now = new Date()
    let startDate = null
    let endDate = null

    if (dateFilter === '7days') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      startDate = d.toISOString()
    } else if (dateFilter === '30days') {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      startDate = d.toISOString()
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    } else if (dateFilter === 'custom') {
      if (customStart) {
        startDate = new Date(customStart).toISOString()
      }
      if (customEnd) {
        const d = new Date(customEnd)
        d.setHours(23, 59, 59, 999)
        endDate = d.toISOString()
      }
    }

    if (startDate) {
      query = query.gte('completed_at', startDate)
    }
    if (endDate) {
      query = query.lte('completed_at', endDate)
    }

    const { data: matches } = await query

    if (!matches) return null

    // Filter matches involving this player
    const playerMatches = matches.filter(m => {
      const allPlayers = [...(m.team1_players || []), ...(m.team2_players || [])]
      return allPlayers.some(p => p.id === playerId)
    })

    // --- Singles vs Doubles breakdown ---
    const singles = { matches: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0 }
    const doubles = { matches: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0 }
    let totalMatches = 0, totalWins = 0, totalLosses = 0, totalDraws = 0
    let totalPointsFor = 0, totalPointsAgainst = 0

    playerMatches.forEach(m => {
      const isDraw = m.draw === true
      const isTeam1 = (m.team1_players || []).some(p => p.id === playerId)
      const isSingles = m.play_type === 'singles'
      
      let scored, conceded
      if (isTeam1) {
        scored = m.team1_games || 0
        conceded = m.team2_games || 0
      } else {
        scored = m.team2_games || 0
        conceded = m.team1_games || 0
      }

      let result = 'draw'
      if (!isDraw) {
        const isWinner = isTeam1 ? m.winner === 1 : m.winner === 2
        result = isWinner ? 'win' : 'loss'
      }

      const target = isSingles ? singles : doubles

      target.matches += 1
      target.pointsFor += scored
      target.pointsAgainst += conceded
      if (result === 'win') target.wins += 1
      else if (result === 'loss') target.losses += 1
      else target.draws += 1

      totalMatches += 1
      totalPointsFor += scored
      totalPointsAgainst += conceded
      if (result === 'win') totalWins += 1
      else if (result === 'loss') totalLosses += 1
      else totalDraws += 1
    })

    // --- Head-to-Head (combined) ---
    const h2h = {}
    playerMatches.forEach(m => {
      const isTeam1 = (m.team1_players || []).some(p => p.id === playerId)
      const opponentPlayers = isTeam1 ? (m.team2_players || []) : (m.team1_players || [])
      
      opponentPlayers.forEach(op => {
        if (!op || op.id === playerId) return
        if (!h2h[op.id]) {
          h2h[op.id] = { 
            id: op.id,
            name: op.name, 
            wins: 0, 
            losses: 0, 
            draws: 0,
            matches: 0,
          }
        }
        const isDraw = m.draw === true
        h2h[op.id].matches += 1
        if (isDraw) {
          h2h[op.id].draws += 1
        } else {
          const isWinner = isTeam1 ? m.winner === 1 : m.winner === 2
          if (isWinner) h2h[op.id].wins += 1
          else h2h[op.id].losses += 1
        }
      })
    })

    const h2hList = Object.values(h2h).sort((a, b) => b.matches - a.matches)

    // Punching Target (most wins against)
    const punchingTarget = h2hList.length > 0 
      ? h2hList.reduce((a, b) => a.wins > b.wins ? a : b)
      : null

    // Nightmare (most losses against)
    const nightmare = h2hList.length > 0
      ? h2hList.reduce((a, b) => a.losses > b.losses ? a : b)
      : null

    // --- Doubles stats ---
    const partnerStats = {}
    playerMatches.forEach(m => {
      if (m.play_type !== 'doubles') return
      const isTeam1 = (m.team1_players || []).some(p => p.id === playerId)
      const teammates = isTeam1 ? (m.team1_players || []) : (m.team2_players || [])
      const partner = teammates.find(p => p.id !== playerId)
      if (!partner) return

      if (!partnerStats[partner.id]) {
        partnerStats[partner.id] = { 
          id: partner.id,
          name: partner.name, 
          matches: 0, 
          wins: 0, 
          losses: 0, 
          draws: 0 
        }
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
    
    const mostCommon = partnerList.sort((a, b) => b.matches - a.matches)[0] || null
    const bestPartner = partnerList
      .filter(p => p.matches >= 3)
      .sort((a, b) => {
        const rateA = a.matches > 0 ? (a.wins / a.matches) * 100 : 0
        const rateB = b.matches > 0 ? (b.wins / b.matches) * 100 : 0
        return rateB - rateA
      })[0] || null

    const totalWinRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0
    const totalDiff = totalPointsFor - totalPointsAgainst

    return {
      singles,
      doubles,
      total: {
        matches: totalMatches,
        wins: totalWins,
        losses: totalLosses,
        draws: totalDraws,
        pointsFor: totalPointsFor,
        pointsAgainst: totalPointsAgainst,
        winRate: totalWinRate,
        diff: totalDiff,
      },
      h2h: h2hList,
      punchingTarget,
      nightmare,
      mostCommon,
      bestPartner,
    }
  } catch (err) {
    console.error('Error calculating player stats:', err)
    return null
  }
}
