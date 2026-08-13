// src/utils/tournament/knockout.js
import { makeMatch, makeBye, shuffleArray } from './common'

// ============================================================
// STANDARD SEED ORDER
// Classic bracket seeding (1 vs N, 2 vs N-1, ...) so that
// e.g. seed 1 and seed 2 can only meet in the final.
// Returns an array of seed numbers (1-indexed) in bracket slot order.
// Currently unreachable from the UI (Tournament Setup always calls this
// with seeding='random'), but kept working in case that toggle comes back.
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
// NORMALIZE AN ENTRANT INTO { id, name, players }
// ============================================================
//
// For singles, each entrant is a single player.
// For doubles, Tournament Setup (via KnockoutSettings' "Auto Create Teams")
// now builds teams *before* calling this function — each entrant arrives
// already paired, as either { players: [p1, p2] } or { player1, player2 }.
// This function does NOT re-pair entrants into new teams; it only makes
// sure whatever shape they arrive in exposes a consistent `.players` array.

function normalizeEntrant(entrant) {
  if (entrant.isBye) {
    return { id: entrant.id, name: 'BYE', players: [], isBye: true }
  }

  if (Array.isArray(entrant.players)) {
    return {
      id: entrant.id,
      name: entrant.name || entrant.players.map(p => p.name).join(' / '),
      players: entrant.players,
      isBye: false,
    }
  }

  if (entrant.player1 && entrant.player2) {
    return {
      id: entrant.id,
      name: entrant.name || `${entrant.player1.name} / ${entrant.player2.name}`,
      players: [entrant.player1, entrant.player2],
      isBye: false,
    }
  }

  // Singles — the entrant IS the player.
  return { id: entrant.id, name: entrant.name, players: [entrant], isBye: false }
}

// ============================================================
// GENERATE KNOCKOUT BRACKET
// Single Elimination — Supports Singles & Doubles
// ============================================================

export function generateKnockoutBracket(players, seeding = 'random', bronzeMatch = false, matchType = 'singles') {
  const allEntrants = [...players].filter(p => !p.isBye)
  const numEntrants = allEntrants.length

  if (numEntrants < 2) {
    return []
  }

  // Determine bracket size (next power of 2)
  let bracketSize = 1
  while (bracketSize < numEntrants) {
    bracketSize *= 2
  }

  // Seed entrants (one entrant = one player for singles, one pre-built team for doubles)
  let seeded

  if (seeding === 'ranked') {
    // Uses the order `players` was given in as the rank (best first).
    // Standard bracket placement keeps top seeds apart for as long as possible,
    // and byes are given to the top seeds.
    const seedOrder = standardSeedOrder(bracketSize)
    seeded = seedOrder.map((seedNum, idx) => {
      if (seedNum <= allEntrants.length) return allEntrants[seedNum - 1]
      return { id: `bye_seed_${idx}`, name: 'BYE', isBye: true }
    })
  } else {
    seeded = shuffleArray([...allEntrants])
    while (seeded.length < bracketSize) {
      seeded.push({ id: `bye_${seeded.length}`, name: 'BYE', isBye: true })
    }
  }

  const isDoubles = matchType === 'doubles'

  // Normalize every entrant to a common { id, name, players, isBye } shape.
  // This is the same shape whether it's a singles player or a pre-built
  // doubles team — the rest of the bracket logic doesn't need to know which.
  let currentRound = seeded.map(normalizeEntrant)

  // Generate bracket
  const rounds = []
  let roundNumber = 1
  const totalRounds = Math.log2(bracketSize)

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
          team1Name: 'BYE',
          team2Name: t2.name || t2.players?.map(p => p.name).join(' / ') || 'TBD',
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
          team1Name: t1.name || t1.players?.map(p => p.name).join(' / ') || 'TBD',
          team2Name: 'BYE',
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
