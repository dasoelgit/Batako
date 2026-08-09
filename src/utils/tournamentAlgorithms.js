// src/utils/tournamentAlgorithms.js

// ============================================================
// GENERATE AMERICANO ROUNDS (Rotating Partners)
// ============================================================
export function generateAmericanoRounds(players, totalRounds) {
  const numPlayers = players.length
  const isEven = numPlayers % 2 === 0
  const rounds = []
  
  let workingPlayers = [...players]
  
  // For odd number, add a 'bye' placeholder
  if (!isEven) {
    workingPlayers.push({ id: 'bye', name: 'BYE', isBye: true })
  }
  
  const n = workingPlayers.length
  
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = []
    const half = n / 2
    
    // Pair players for this round
    const paired = []
    for (let i = 0; i < half; i++) {
      const p1 = workingPlayers[i]
      const p2 = workingPlayers[n - 1 - i]
      
      if (p1 && p2 && !p1.isBye && !p2.isBye) {
        paired.push([p1, p2])
      } else if (p1 && !p1.isBye) {
        // Bye for p1
        paired.push([p1, null])
      } else if (p2 && !p2.isBye) {
        paired.push([p2, null])
      }
    }
    
    // Pair teams against each other
    for (let i = 0; i < paired.length; i += 2) {
      if (i + 1 < paired.length) {
        roundMatches.push({
          team1: paired[i],
          team2: paired[i + 1],
          completed: false,
          score1: 0,
          score2: 0,
        })
      } else if (paired[i] && paired[i][0] && !paired[i][1]) {
        // Single player with bye
        roundMatches.push({
          team1: paired[i],
          team2: null,
          completed: true,
          score1: 0,
          score2: 0,
          isBye: true,
        })
      }
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
  const numPlayers = players.length
  const isEven = numPlayers % 2 === 0
  const rounds = []
  
  let workingPlayers = [...players]
  
  if (!isEven) {
    workingPlayers.push({ id: 'bye', name: 'BYE', isBye: true })
  }
  
  // Round 1: Random pairings
  const shuffled = [...workingPlayers].sort(() => Math.random() - 0.5)
  let paired = []
  
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      const p1 = shuffled[i]
      const p2 = shuffled[i + 1]
      if (!p1.isBye && !p2.isBye) {
        paired.push([p1, p2])
      } else if (!p1.isBye) {
        paired.push([p1, null])
      } else if (!p2.isBye) {
        paired.push([p2, null])
      }
    }
  }
  
  const round1Matches = []
  for (let i = 0; i < paired.length; i += 2) {
    if (i + 1 < paired.length) {
      round1Matches.push({
        team1: paired[i],
        team2: paired[i + 1],
        completed: false,
        score1: 0,
        score2: 0,
      })
    } else if (paired[i] && paired[i][0] && !paired[i][1]) {
      round1Matches.push({
        team1: paired[i],
        team2: null,
        completed: true,
        score1: 0,
        score2: 0,
        isBye: true,
      })
    }
  }
  
  rounds.push({
    round_number: 1,
    matches: round1Matches,
  })
  
  // Rounds 2+: Pair based on standings (handled dynamically in dashboard)
  // We'll generate placeholder matches and fill them later
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
export function generateMexicanoPairings(players, standings, roundNumber) {
  const sortedPlayers = [...players].sort((a, b) => {
    const aStats = standings[a.id] || { points: 0 }
    const bStats = standings[b.id] || { points: 0 }
    return bStats.points - aStats.points
  })
  
  const paired = []
  for (let i = 0; i < sortedPlayers.length; i += 2) {
    if (i + 1 < sortedPlayers.length) {
      paired.push([sortedPlayers[i], sortedPlayers[i + 1]])
    } else {
      paired.push([sortedPlayers[i], null])
    }
  }
  
  const matches = []
  for (let i = 0; i < paired.length; i += 2) {
    if (i + 1 < paired.length) {
      matches.push({
        team1: paired[i],
        team2: paired[i + 1],
        completed: false,
        score1: 0,
        score2: 0,
      })
    } else if (paired[i] && paired[i][0] && !paired[i][1]) {
      matches.push({
        team1: paired[i],
        team2: null,
        completed: true,
        score1: 0,
        score2: 0,
        isBye: true,
      })
    }
  }
  
  return matches
}

// ============================================================
// GENERATE SINGLES ROUNDS (1v1)
// ============================================================
export function generateSinglesRounds(players, totalRounds) {
  const numPlayers = players.length
  const isEven = numPlayers % 2 === 0
  const rounds = []
  
  let workingPlayers = [...players]
  
  if (!isEven) {
    workingPlayers.push({ id: 'bye', name: 'BYE', isBye: true })
  }
  
  const n = workingPlayers.length
  
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = []
    const half = n / 2
    
    for (let i = 0; i < half; i++) {
      const p1 = workingPlayers[i]
      const p2 = workingPlayers[n - 1 - i]
      
      if (p1 && p2 && !p1.isBye && !p2.isBye) {
        roundMatches.push({
          team1: [p1],
          team2: [p2],
          completed: false,
          score1: 0,
          score2: 0,
        })
      } else if (p1 && !p1.isBye) {
        roundMatches.push({
          team1: [p1],
          team2: null,
          completed: true,
          score1: 0,
          score2: 0,
          isBye: true,
        })
      }
    }
    
    rounds.push({
      round_number: round,
      matches: roundMatches,
    })
    
    // Rotate players for next round
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
  const isEven = numTeams % 2 === 0
  const rounds = []
  
  let workingTeams = [...teams]
  
  if (!isEven) {
    workingTeams.push({ id: 'bye', name: 'BYE', isBye: true })
  }
  
  const n = workingTeams.length
  
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = []
    const half = n / 2
    
    for (let i = 0; i < half; i++) {
      const t1 = workingTeams[i]
      const t2 = workingTeams[n - 1 - i]
      
      if (t1 && t2 && !t1.isBye && !t2.isBye) {
        roundMatches.push({
          team1: [t1.player1, t1.player2],
          team2: [t2.player1, t2.player2],
          completed: false,
          score1: 0,
          score2: 0,
        })
      } else if (t1 && !t1.isBye) {
        roundMatches.push({
          team1: [t1.player1, t1.player2],
          team2: null,
          completed: true,
          score1: 0,
          score2: 0,
          isBye: true,
        })
      }
    }
    
    rounds.push({
      round_number: round,
      matches: roundMatches,
    })
    
    // Rotate teams for next round
    const last = workingTeams.pop()
    workingTeams.splice(1, 0, last)
  }
  
  return rounds
}

// ============================================================
// CALCULATE TOURNAMENT STANDINGS
// ============================================================
export function calculateTournamentStandings(players, rounds, standingBy) {
  const standings = {}
  
  players.forEach(p => {
    standings[p.id] = {
      id: p.id,
      name: p.name,
      W: 0,
      L: 0,
      T: 0,
      Pts: 0,
      games_won: 0,
      games_lost: 0,
      matches_played: 0,
    }
  })
  
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
    if (!round) return false
    
    // Skip empty rounds (Mexicano rounds that haven't been generated yet)
    if (round.matches.length === 0) return false
    
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
