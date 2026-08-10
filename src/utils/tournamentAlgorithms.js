// src/utils/tournamentAlgorithms.js

// ============================================================
// GENERATE AMERICANO ROUNDS (Rotating Partners)
// ============================================================
export function generateAmericanoRounds(players, totalRounds) {
  const numPlayers = players.length
  const isEven = numPlayers % 2 === 0
  const rounds = []
  
  let workingPlayers = [...players]
  
  // Track who has partnered with whom
  const partnered = {}
  workingPlayers.forEach(p => {
    if (!p.isBye) {
      partnered[p.id] = new Set()
    }
  })
  
  for (let round = 1; round <= totalRounds; round++) {
    let roundMatches = []
    let available = workingPlayers.filter(p => !p.isBye)
    
    // --- Handle odd number: give BYE to one player ---
    let byePlayer = null
    if (available.length % 2 !== 0) {
      // Give BYE to the last player in the list (rotates each round)
      byePlayer = available.pop()
    }
    
    // --- Pair remaining players ---
    let paired = []
    let remaining = [...available]
    
    // Try to pair un-partnered players first
    for (let i = 0; i < remaining.length; i++) {
      const p1 = remaining[i]
      if (paired.some(p => p.id === p1.id)) continue
      
      let found = false
      for (let j = i + 1; j < remaining.length; j++) {
        const p2 = remaining[j]
        if (paired.some(p => p.id === p2.id)) continue
        
        if (!partnered[p1.id].has(p2.id) && !partnered[p2.id].has(p1.id)) {
          paired.push(p1, p2)
          partnered[p1.id].add(p2.id)
          partnered[p2.id].add(p1.id)
          found = true
          break
        }
      }
      
      // If no un-partnered player found, pair with anyone
      if (!found) {
        for (let j = i + 1; j < remaining.length; j++) {
          const p2 = remaining[j]
          if (paired.some(p => p.id === p2.id)) continue
          paired.push(p1, p2)
          partnered[p1.id].add(p2.id)
          partnered[p2.id].add(p1.id)
          found = true
          break
        }
      }
    }
    
    // --- Create matches from paired players ---
    const pairedList = []
    for (let i = 0; i < paired.length; i += 2) {
      if (i + 1 < paired.length) {
        pairedList.push([paired[i], paired[i + 1]])
      }
    }
    
    // Pair teams against each other
    for (let i = 0; i < pairedList.length; i += 2) {
      if (i + 1 < pairedList.length) {
        roundMatches.push({
          team1: pairedList[i],
          team2: pairedList[i + 1],
          completed: false,
          score1: 0,
          score2: 0,
        })
      }
    }
    
    // --- Add BYE match if applicable ---
    if (byePlayer) {
      roundMatches.push({
        team1: [byePlayer],
        team2: null,
        completed: true,
        score1: 0,
        score2: 0,
        isBye: true,
      })
    }
    
    rounds.push({
      round_number: round,
      matches: roundMatches,
    })
    
    // Rotate players for next round (circle method)
    const last = workingPlayers.pop()
    workingPlayers.splice(1, 0, last)
  }
  
  return rounds
}

// ============================================================
// GENERATE MEXICANO ROUNDS (Competitive Pairing)
// ============================================================
export function generateMexicanoRounds(players, totalRounds) {
  const rounds = []
  
  // Round 1: Random pairings
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const round1Matches = generateMatchesFromPlayers(shuffled)
  
  rounds.push({
    round_number: 1,
    matches: round1Matches,
  })
  
  // Rounds 2+: Generated dynamically in dashboard
  // Placeholder matches will be filled when round is reached
  for (let round = 2; round <= totalRounds; round++) {
    rounds.push({
      round_number: round,
      matches: [],
    })
  }
  
  return rounds
}

// ============================================================
// GENERATE MEXICANO PAIRINGS FOR A ROUND (Based on Standings)
// ============================================================
export function generateMexicanoPairings(players, standings, roundNumber, previousPairings = []) {
  // Sort players by points (highest first)
  const sortedPlayers = [...players].sort((a, b) => {
    const aStats = standings[a.id] || { points: 0 }
    const bStats = standings[b.id] || { points: 0 }
    return bStats.points - aStats.points
  })
  
  // --- Handle odd number: give BYE to lowest ranked player ---
  let byePlayer = null
  let available = [...sortedPlayers]
  if (available.length % 2 !== 0) {
    byePlayer = available.pop() // Lowest ranked gets BYE
  }
  
  // --- Pair players ---
  let paired = []
  let remaining = [...available]
  
  // Try to avoid exact same pairings from previous rounds
  for (let i = 0; i < remaining.length; i++) {
    const p1 = remaining[i]
    if (paired.some(p => p.id === p1.id)) continue
    
    let found = false
    for (let j = i + 1; j < remaining.length; j++) {
      const p2 = remaining[j]
      if (paired.some(p => p.id === p2.id)) continue
      
      // Check if this pair already played together
      const alreadyPaired = previousPairings.some(prev => 
        prev.includes(p1.id) && prev.includes(p2.id)
      )
      
      if (!alreadyPaired) {
        paired.push(p1, p2)
        found = true
        break
      }
    }
    
    // If all pairs were already together, pair with anyone
    if (!found) {
      for (let j = i + 1; j < remaining.length; j++) {
        const p2 = remaining[j]
        if (paired.some(p => p.id === p2.id)) continue
        paired.push(p1, p2)
        found = true
        break
      }
    }
  }
  
  // --- Create matches from paired players ---
  const pairedList = []
  for (let i = 0; i < paired.length; i += 2) {
    if (i + 1 < paired.length) {
      pairedList.push([paired[i], paired[i + 1]])
    }
  }
  
  const matches = []
  for (let i = 0; i < pairedList.length; i += 2) {
    if (i + 1 < pairedList.length) {
      matches.push({
        team1: pairedList[i],
        team2: pairedList[i + 1],
        completed: false,
        score1: 0,
        score2: 0,
      })
    }
  }
  
  // --- Add BYE match if applicable ---
  if (byePlayer) {
    matches.push({
      team1: [byePlayer],
      team2: null,
      completed: true,
      score1: 0,
      score2: 0,
      isBye: true,
    })
  }
  
  return matches
}

// ============================================================
// GENERATE SINGLES ROUNDS (1v1)
// ============================================================
export function generateSinglesRounds(players, totalRounds) {
  const numPlayers = players.length
  const rounds = []
  
  let workingPlayers = [...players]
  
  for (let round = 1; round <= totalRounds; round++) {
    let roundMatches = []
    let available = [...workingPlayers]
    
    // --- Handle odd number: give BYE to one player ---
    let byePlayer = null
    if (available.length % 2 !== 0) {
      byePlayer = available.pop()
    }
    
    // --- Pair remaining players ---
    const paired = []
    for (let i = 0; i < available.length; i += 2) {
      if (i + 1 < available.length) {
        paired.push([available[i], available[i + 1]])
      }
    }
    
    for (const pair of paired) {
      roundMatches.push({
        team1: [pair[0]],
        team2: [pair[1]],
        completed: false,
        score1: 0,
        score2: 0,
      })
    }
    
    // --- Add BYE match if applicable ---
    if (byePlayer) {
      roundMatches.push({
        team1: [byePlayer],
        team2: null,
        completed: true,
        score1: 0,
        score2: 0,
        isBye: true,
      })
    }
    
    rounds.push({
      round_number: round,
      matches: roundMatches,
    })
    
    // Rotate players for next round (circle method)
    const last = workingPlayers.pop()
    workingPlayers.splice(1, 0, last)
  }
  
  return rounds
}

// ============================================================
// GENERATE FIXED PARTNER ROUNDS (Teams stay together)
// ============================================================
export function generateFixedPartnerRounds(teams, totalRounds) {
  const numTeams = teams.length
  const rounds = []
  
  let workingTeams = [...teams]
  
  for (let round = 1; round <= totalRounds; round++) {
    let roundMatches = []
    let available = [...workingTeams]
    
    // --- Handle odd number: give BYE to one team ---
    let byeTeam = null
    if (available.length % 2 !== 0) {
      byeTeam = available.pop()
    }
    
    // --- Pair remaining teams ---
    for (let i = 0; i < available.length; i += 2) {
      if (i + 1 < available.length) {
        const t1 = available[i]
        const t2 = available[i + 1]
        roundMatches.push({
          team1: [t1.player1, t1.player2],
          team2: [t2.player1, t2.player2],
          completed: false,
          score1: 0,
          score2: 0,
        })
      }
    }
    
    // --- Add BYE match if applicable ---
    if (byeTeam) {
      roundMatches.push({
        team1: [byeTeam.player1, byeTeam.player2],
        team2: null,
        completed: true,
        score1: 0,
        score2: 0,
        isBye: true,
      })
    }
    
    rounds.push({
      round_number: round,
      matches: roundMatches,
    })
    
    // Rotate teams for next round (circle method)
    const last = workingTeams.pop()
    workingTeams.splice(1, 0, last)
  }
  
  return rounds
}

// ============================================================
// HELPER: Generate matches from players (for round 1)
// ============================================================
function generateMatchesFromPlayers(players) {
  let available = [...players]
  let byePlayer = null
  const matches = []
  
  // Handle odd number
  if (available.length % 2 !== 0) {
    byePlayer = available.pop()
  }
  
  // Pair players
  for (let i = 0; i < available.length; i += 2) {
    if (i + 1 < available.length) {
      matches.push({
        team1: [available[i]],
        team2: [available[i + 1]],
        completed: false,
        score1: 0,
        score2: 0,
      })
    }
  }
  
  // Add BYE
  if (byePlayer) {
    matches.push({
      team1: [byePlayer],
      team2: null,
      completed: true,
      score1: 0,
      score2: 0,
      isBye: true,
    })
  }
  
  return matches
}

// ============================================================
// CALCULATE TOURNAMENT STANDINGS — FIXED
// ============================================================
export function calculateTournamentStandings(players, rounds, standingBy, tournamentType = null) {
  const standings = {}

  // --- For Fixed Partner: standings are per TEAM ---
  if (tournamentType === 'fixed_partner') {
    // Players array contains team objects with player1/player2
    players.forEach(team => {
      // Team is stored as { id: 'team_0', name: 'John / Jane', player1: {...}, player2: {...}, isTeam: true }
      const teamId = team.id || `team_${Object.keys(standings).length}`
      standings[teamId] = {
        id: teamId,
        name: team.name || `${team.player1?.name || '?'} / ${team.player2?.name || '?'}`,
        player1: team.player1,
        player2: team.player2,
        isTeam: true,
        W: 0,
        L: 0,
        T: 0,
        Pts: 0,
        games_won: 0,
        games_lost: 0,
        matches_played: 0,
      }
    })

    // Process all completed matches
    rounds.forEach(round => {
      round.matches.forEach(match => {
        if (!match.completed || match.isBye) return
        
        const team1Players = match.team1?.filter(p => p && !p.isBye) || []
        const team2Players = match.team2?.filter(p => p && !p.isBye) || []
        
        if (team1Players.length === 0 || team2Players.length === 0) return
        
        // Find which team this is by checking player IDs
        // For Fixed Partner, match.team1 contains [player1, player2] of the team
        const team1Ids = team1Players.map(p => p.id).sort().join('-')
        const team2Ids = team2Players.map(p => p.id).sort().join('-')
        
        let team1Key = null
        let team2Key = null
        
        // Find matching team in standings
        for (const key of Object.keys(standings)) {
          const team = standings[key]
          if (!team.isTeam) continue
          const tIds = [team.player1?.id, team.player2?.id].filter(Boolean).sort().join('-')
          if (tIds === team1Ids) team1Key = key
          if (tIds === team2Ids) team2Key = key
        }
        
        if (!team1Key || !team2Key) return
        
        const s1 = match.score1 || 0
        const s2 = match.score2 || 0
        
        let result = 'draw'
        if (s1 > s2) result = 'win1'
        else if (s2 > s1) result = 'win2'
        
        const updateTeam = (key, score, opponentScore, res) => {
          const s = standings[key]
          if (!s) return
          
          s.matches_played += 1
          s.games_won += score
          s.games_lost += opponentScore
          
          if (res === 'win') {
            s.W += 1
            if (standingBy === 'win') {
              s.Pts += 3
            } else {
              s.Pts += score
            }
          } else if (res === 'loss') {
            s.L += 1
            if (standingBy === 'win') {
              s.Pts += 0
            } else {
              s.Pts += score
            }
          } else {
            s.T += 1
            if (standingBy === 'win') {
              s.Pts += 1
            } else {
              s.Pts += score
            }
          }
        }
        
        updateTeam(team1Key, s1, s2, result === 'win1' ? 'win' : result === 'win2' ? 'loss' : 'draw')
        updateTeam(team2Key, s2, s1, result === 'win2' ? 'win' : result === 'win1' ? 'loss' : 'draw')
      })
    })

    const result = Object.values(standings).map(s => ({
      ...s,
      diff: s.games_won - s.games_lost,
    }))

    result.sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts
      if (b.diff !== a.diff) return b.diff - a.diff
      return b.W - a.W
    })

    return result
  }

  // --- For all other types: standings are per individual player ---
  players.forEach(p => {
    // For Fixed Partner, p may be a team object with player1/player2
    if (p.player1 && p.player2) {
      // Team: add both players individually
      const p1 = p.player1
      const p2 = p.player2
      if (p1 && !standings[p1.id]) {
        standings[p1.id] = {
          id: p1.id,
          name: p1.name,
          W: 0, L: 0, T: 0, Pts: 0,
          games_won: 0, games_lost: 0,
          matches_played: 0,
        }
      }
      if (p2 && !standings[p2.id]) {
        standings[p2.id] = {
          id: p2.id,
          name: p2.name,
          W: 0, L: 0, T: 0, Pts: 0,
          games_won: 0, games_lost: 0,
          matches_played: 0,
        }
      }
    } else {
      // Regular player
      if (!standings[p.id]) {
        standings[p.id] = {
          id: p.id,
          name: p.name,
          W: 0, L: 0, T: 0, Pts: 0,
          games_won: 0, games_lost: 0,
          matches_played: 0,
        }
      }
    }
  })

  // Process all completed matches
  rounds.forEach(round => {
    round.matches.forEach(match => {
      if (!match.completed || match.isBye) return
      
      const team1Players = match.team1?.filter(p => p && !p.isBye) || []
      const team2Players = match.team2?.filter(p => p && !p.isBye) || []
      
      if (team1Players.length === 0 || team2Players.length === 0) return
      
      const s1 = match.score1 || 0
      const s2 = match.score2 || 0
      
      let result = 'draw'
      if (s1 > s2) result = 'win1'
      else if (s2 > s1) result = 'win2'
      
      const updatePlayer = (player, score, opponentScore, res) => {
        if (!player || player.isBye) return
        const s = standings[player.id]
        if (!s) return
        
        s.matches_played += 1
        s.games_won += score
        s.games_lost += opponentScore
        
        if (res === 'win') {
          s.W += 1
          if (standingBy === 'win') {
            s.Pts += 3
          } else {
            s.Pts += score
          }
        } else if (res === 'loss') {
          s.L += 1
          if (standingBy === 'win') {
            s.Pts += 0
          } else {
            s.Pts += score
          }
        } else {
          s.T += 1
          if (standingBy === 'win') {
            s.Pts += 1
          } else {
            s.Pts += score
          }
        }
      }
      
      team1Players.forEach(p => {
        updatePlayer(p, s1, s2, result === 'win1' ? 'win' : result === 'win2' ? 'loss' : 'draw')
      })
      
      team2Players.forEach(p => {
        updatePlayer(p, s2, s1, result === 'win2' ? 'win' : result === 'win1' ? 'loss' : 'draw')
      })
    })
  })

  const result = Object.values(standings).map(s => ({
    ...s,
    diff: s.games_won - s.games_lost,
  }))

  result.sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts
    if (b.diff !== a.diff) return b.diff - a.diff
    return b.W - a.W
  })

  return result
}

// ============================================================
// CHECK IF TOURNAMENT COMPLETE
// ============================================================
export function isTournamentComplete(rounds, totalRounds) {
  if (rounds.length < totalRounds) return false
  
  for (let i = 0; i < totalRounds; i++) {
    const round = rounds[i]
    if (!round || round.matches.length === 0) return false
    
    const allCompleted = round.matches.every(m => m.completed || m.isBye)
    if (!allCompleted) return false
  }
  
  return true
}

// ============================================================
// CHECK IF ROUND IS COMPLETE
// ============================================================
export function isRoundComplete(round) {
  if (!round || !round.matches || round.matches.length === 0) return false
  return round.matches.every(m => m.completed || m.isBye)
}
