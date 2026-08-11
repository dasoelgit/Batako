// src/utils/tournament/knockout.js
import { makeMatch, makeBye, shuffleArray } from './common'

// ============================================================
// GENERATE KNOCKOUT BRACKET
// Single Elimination
// ============================================================

export function generateKnockoutBracket(players, seeding = 'random', bronzeMatch = false) {
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
    // Ranked: #1 vs #8, #4 vs #5, #3 vs #6, #2 vs #7
    // Assuming players are already ranked by points
    // For now, fallback to random if no ranking available
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

  while (currentRound.length > 1) {
    const roundMatches = []
    const nextRound = []

    for (let i = 0; i < currentRound.length; i += 2) {
      const p1 = currentRound[i]
      const p2 = currentRound[i + 1]

      if (p1.isBye && p2.isBye) {
        // Both byes — should not happen
        continue
      } else if (p1.isBye) {
        // p2 advances automatically
        roundMatches.push({
          team1: [p2],
          team2: null,
          completed: true,
          score1: 0,
          score2: 0,
          isBye: true,
          winner: p2,
          advancing: p2,
          round: roundNumber,
        })
        nextRound.push({ ...p2, advancedFrom: `bye_${i}` })
      } else if (p2.isBye) {
        // p1 advances automatically
        roundMatches.push({
          team1: [p1],
          team2: null,
          completed: true,
          score1: 0,
          score2: 0,
          isBye: true,
          winner: p1,
          advancing: p1,
          round: roundNumber,
        })
        nextRound.push({ ...p1, advancedFrom: `bye_${i + 1}` })
      } else {
        // Real match
        const match = {
          team1: [p1],
          team2: [p2],
          completed: false,
          score1: 0,
          score2: 0,
          round: roundNumber,
          winner: null,
          advancing: null,
        }
        roundMatches.push(match)
        // Placeholder for winner (to be filled later)
        nextRound.push({
          id: `match_${roundNumber}_${i / 2}`,
          name: `Winner ${i / 2 + 1}`,
          isPlaceholder: true,
          match: match,
        })
      }
    }

    // Name the round
    const roundNames = {
      1: 'Final',
      2: 'Semifinal',
      3: 'Quarterfinal',
      4: 'Round of 16',
      5: 'Round of 32',
      6: 'Round of 64',
    }

    const roundLabel = totalRounds - roundNumber + 1
    const roundName = roundNames[roundLabel] || `Round ${roundLabel}`

    rounds.push({
      round_number: roundNumber,
      round_name: roundName,
      matches: shuffleArray(roundMatches),
      nextRound: nextRound,
    })

    currentRound = nextRound
    roundNumber += 1
  }

  // Add bronze match if enabled
  if (bronzeMatch) {
    // Bronze match is between the two semifinal losers
    // We'll add it as an extra match after the final
    // Placeholder — will be filled during tournament
    const bronzeMatchEntry = {
      round_number: rounds.length + 1,
      round_name: 'Bronze Match',
      matches: [
        {
          team1: [null],
          team2: [null],
          completed: false,
          score1: 0,
          score2: 0,
          isBronze: true,
          round: rounds.length + 1,
        }
      ],
      isBronze: true,
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
    // Check if this match's winner is referenced
    return m.advancing?.id === match.id || m.advancing?.name?.includes('Winner')
  })

  if (placeholderIndex !== -1) {
    // Replace placeholder with actual winner
    const placeholder = nextRound.matches[placeholderIndex]
    if (placeholder.team1 && placeholder.team1[0]?.isPlaceholder) {
      placeholder.team1 = [winner]
    } else if (placeholder.team2 && placeholder.team2[0]?.isPlaceholder) {
      placeholder.team2 = [winner]
    }
    placeholder.advancing = winner
  }

  return rounds
}
