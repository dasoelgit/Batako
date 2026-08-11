// src/utils/tournament/knockout.js
import { makeMatch, makeBye, shuffleArray } from './common'

// ============================================================
// GENERATE KNOCKOUT BRACKET
// Single Elimination — Supports Singles & Doubles
// ============================================================

export function generateKnockoutBracket(players, seeding = 'random', bronzeMatch = false, matchType = 'singles') {
  const allPlayers = [...players].filter(p => !p.isBye)
  const numPlayers = allPlayers.length

  if (numPlayers < 2) {
    return []
  }

  // Determine bracket size (next power of 2)
  let bracketSize = 1
  while (bracketSize < numPlayers) {
    bracketSize *= 2
  }

  // Seed players
  let seeded = [...allPlayers]

  if (seeding === 'ranked') {
    // For doubles, players are already teams
    // For singles, shuffle for now
    seeded = shuffleArray(seeded)
  } else {
    seeded = shuffleArray(seeded)
  }

  // Fill with byes
  while (seeded.length < bracketSize) {
    seeded.push({ id: `bye_${seeded.length}`, name: 'BYE', isBye: true })
  }

  // Generate bracket
  const rounds = []
  let currentRound = seeded
  let roundNumber = 1

  // Determine number of rounds needed
  const totalRounds = Math.log2(bracketSize)
  const isDoubles = matchType === 'doubles'

  // For doubles, we need to pair players into teams first
  if (isDoubles) {
    // Group players into teams (pairs)
    const teams = []
    const nonByePlayers = seeded.filter(p => !p.isBye)
    const byePlayers = seeded.filter(p => p.isBye)
    
    // Shuffle non-bye players for random team formation
    const shuffledNonBye = shuffleArray([...nonByePlayers])
    
    for (let i = 0; i < shuffledNonBye.length; i += 2) {
      if (i + 1 < shuffledNonBye.length) {
        teams.push({
          id: `team_${teams.length}`,
          name: `${shuffledNonBye[i].name} / ${shuffledNonBye[i + 1].name}`,
          players: [shuffledNonBye[i], shuffledNonBye[i + 1]],
          isTeam: true,
        })
      } else {
        // Odd number of players, last player gets a bye (or paired with a bye team)
        teams.push({
          id: `team_${teams.length}`,
          name: shuffledNonBye[i].name,
          players: [shuffledNonBye[i]],
          isTeam: false,
        })
      }
    }
    
    // Add bye teams if needed (to fill bracket)
    while (teams.length < bracketSize / 2) {
      const byeIndex = byePlayers.length > 0 ? byePlayers.pop().id : `bye_${teams.length}`
      teams.push({
        id: `bye_team_${teams.length}`,
        name: 'BYE',
        players: [],
        isBye: true,
      })
    }
    
    currentRound = teams
  } else {
    // Singles: each player is a team
    currentRound = seeded.map(p => ({
      id: p.id,
      name: p.name,
      players: [p],
      isBye: p.isBye || false,
    }))
  }

  // Helper to get round name
  const roundNames = {
    1: 'Final',
    2: 'Semifinal',
    3: 'Quarterfinal',
    4: 'Round of 16',
    5: 'Round of 32',
    6: 'Round of 64',
  }

  while (currentRound.length > 1) {
    const roundMatches = []
    const nextRound = []

    for (let i = 0; i < currentRound.length; i += 2) {
      const t1 = currentRound[i]
      const t2 = currentRound[i + 1]

      if (t1.isBye && t2.isBye) {
        continue
      } else if (t1.isBye) {
        const match = {
          team1: t1.players || [],
          team2: t2.players || [],
          completed: true,
          score1: 0,
          score2: 0,
          isBye: true,
          winner: t2,
          advancing: t2,
          round: roundNumber,
          isDoubles: isDoubles,
        }
        roundMatches.push(match)
        nextRound.push({ ...t2, advancedFrom: `bye_${i}` })
      } else if (t2.isBye) {
        const match = {
          team1: t1.players || [],
          team2: t2.players || [],
          completed: true,
          score1: 0,
          score2: 0,
          isBye: true,
          winner: t1,
          advancing: t1,
          round: roundNumber,
          isDoubles: isDoubles,
        }
        roundMatches.push(match)
        nextRound.push({ ...t1, advancedFrom: `bye_${i + 1}` })
      } else {
        const match = {
          team1: t1.players || [],
          team2: t2.players || [],
          completed: false,
          score1: 0,
          score2: 0,
          round: roundNumber,
          winner: null,
          advancing: null,
          isDoubles: isDoubles,
          team1Name: t1.name || t1.players?.map(p => p.name).join(' / ') || 'TBD',
          team2Name: t2.name || t2.players?.map(p => p.name).join(' / ') || 'TBD',
        }
        roundMatches.push(match)
        
        // Placeholder for winner
        nextRound.push({
          id: `match_${roundNumber}_${i / 2}`,
          name: `Winner ${i / 2 + 1}`,
          players: [],
          isPlaceholder: true,
          match: match,
        })
      }
    }

    const roundLabel = totalRounds - roundNumber + 1
    const roundName = roundNames[roundLabel] || `Round ${roundLabel}`

    rounds.push({
      round_number: roundNumber,
      round_name: roundName,
      matches: shuffleArray(roundMatches),
      nextRound: nextRound,
      isDoubles: isDoubles,
    })

    currentRound = nextRound
    roundNumber += 1
  }

  // Add bronze match if enabled
  if (bronzeMatch) {
    const bronzeMatchEntry = {
      round_number: rounds.length + 1,
      round_name: 'Bronze Match',
      matches: [
        {
          team1: [],
          team2: [],
          completed: false,
          score1: 0,
          score2: 0,
          isBronze: true,
          round: rounds.length + 1,
          isDoubles: isDoubles,
        }
      ],
      isBronze: true,
      isDoubles: isDoubles,
    }
    rounds.push(bronzeMatchEntry)
  }

  return rounds
}

// ============================================================
// UPDATE KNOCKOUT WINNER
// ============================================================

export function updateKnockoutWinner(rounds, roundIndex, matchIndex, winner) {
  const round = rounds[roundIndex]
  const match = round.matches[matchIndex]

  if (!match) return rounds

  match.completed = true
  match.winner = winner

  // If this is the final round (champion), nothing else to do
  if (round.round_name === 'Final' || round.round_name === 'Bronze Match') {
    return rounds
  }

  // Update next round with the winner
  const nextRound = rounds[roundIndex + 1]
  if (!nextRound) return rounds

  // Find the placeholder in next round
  const placeholderIndex = nextRound.matches.findIndex(m => {
    return m.advancing?.id === match.id || m.advancing?.name?.includes('Winner')
  })

  if (placeholderIndex !== -1) {
    const placeholder = nextRound.matches[placeholderIndex]
    
    // Check if this is doubles and winner has multiple players
    const isDoubles = match.isDoubles || false
    
    if (isDoubles && winner.players && winner.players.length > 1) {
      placeholder.team1 = winner.players
      placeholder.team1Name = winner.name || winner.players.map(p => p.name).join(' / ')
    } else if (isDoubles && winner.players && winner.players.length === 1) {
      placeholder.team1 = winner.players
    } else {
      placeholder.team1 = winner.players || [winner]
    }
    
    placeholder.advancing = winner
  }

  return rounds
}
