// src/utils/tournament/knockout.js
import { makeMatch, makeBye, shuffleArray } from './common'

// ============================================================
// STANDARD SEED ORDER
// Classic bracket seeding (1 vs N, 2 vs N-1, ...) so that
// e.g. seed 1 and seed 2 can only meet in the final.
// Returns an array of seed numbers (1-indexed) in bracket slot order.
// ============================================================

function standardSeedOrder(size) {
  let seeds = [1]
  while (seeds.length < size) {
    const n = seeds.length * 2
    const next = []
    seeds.forEach(s => {
      next.push(s)
      next.push(n + 1 - s)
    })
    seeds = next
  }
  return seeds
}

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
  let seeded

  if (seeding === 'ranked') {
    // Uses the order `players` was given in as the rank (best first).
    // Standard bracket placement keeps top seeds apart for as long as possible,
    // and byes are given to the top seeds.
    const seedOrder = standardSeedOrder(bracketSize)
    seeded = seedOrder.map((seedNum, idx) => {
      if (seedNum <= allPlayers.length) return allPlayers[seedNum - 1]
      return { id: `bye_seed_${idx}`, name: 'BYE', isBye: true }
    })
  } else {
    seeded = shuffleArray([...allPlayers])
    // Fill with byes
    while (seeded.length < bracketSize) {
      seeded.push({ id: `bye_${seeded.length}`, name: 'BYE', isBye: true })
    }
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
    
    // Random seeding: shuffle for random team formation.
    // Ranked seeding: keep the seed order so adjacent-ranked players end up teamed.
    const shuffledNonBye = seeding === 'ranked' ? [...nonByePlayers] : shuffleArray([...nonByePlayers])
    
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

      // Stable id, assigned before the round's matches get shuffled below,
      // so it stays correct no matter what position the match ends up in.
      const matchId = `m${roundNumber}_${i / 2}`

      // Resolve a team's players for this match. If the incoming team is
      // itself an unresolved placeholder (winner of a previous match not
      // yet decided), keep it as a placeholder instead of collapsing to [].
      const resolveTeam = (t) => {
        if (t.isPlaceholder) {
          return [{ id: t.id, name: t.name, isPlaceholder: true }]
        }
        return t.players || []
      }

      if (t1.isBye && t2.isBye) {
        continue
      } else if (t1.isBye) {
        const match = {
          id: matchId,
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
          id: matchId,
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
          id: matchId,
          team1: resolveTeam(t1),
          team2: resolveTeam(t2),
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

        // Placeholder for winner — carries the id forward so the next
        // round (and the dashboard) can find its way back to this match.
        nextRound.push({
          id: matchId,
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

  // Add bronze match if enabled.
  // The two semifinal *losers* feed into it — represented as placeholders
  // keyed to the semifinal matches' ids, resolved once those are decided.
  if (bronzeMatch) {
    const semifinalRound = rounds.length >= 2 ? rounds[rounds.length - 2] : null
    const semifinalMatches = semifinalRound
      ? semifinalRound.matches.filter(m => !m.isBye)
      : []

    const [sf1, sf2] = semifinalMatches

    const bronzeMatchEntry = {
      round_number: rounds.length + 1,
      round_name: 'Bronze Match',
      matches: [
        {
          id: `bronze_${rounds.length + 1}_0`,
          team1: sf1 ? [{ id: sf1.id, name: 'Loser SF1', isPlaceholder: true, isLoserSlot: true }] : [],
          team2: sf2 ? [{ id: sf2.id, name: 'Loser SF2', isPlaceholder: true, isLoserSlot: true }] : [],
          team1Name: 'Loser SF1',
          team2Name: 'Loser SF2',
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

  // Find the placeholder in next round — matched by this match's stable id,
  // which is preserved on whichever slot (team1 or team2) still holds it.
  for (const nextMatch of nextRound.matches) {
    const isDoubles = match.isDoubles || false
    const winnerPlayers = isDoubles ? (winner.players || [winner]) : [winner]
    const winnerName = winner.name || winnerPlayers.map(p => p.name).join(' / ')

    if (nextMatch.team1?.[0]?.isPlaceholder && nextMatch.team1[0].id === match.id) {
      nextMatch.team1 = winnerPlayers
      nextMatch.team1Name = winnerName
      break
    }
    if (nextMatch.team2?.[0]?.isPlaceholder && nextMatch.team2[0].id === match.id) {
      nextMatch.team2 = winnerPlayers
      nextMatch.team2Name = winnerName
      break
    }
  }

  return rounds
}
