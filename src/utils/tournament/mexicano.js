// src/utils/tournament/mexicano.js
import {
  shuffleArray,
  makeMatch,
  makeBye,
  addHistory,
  selectSitOuts,
} from './common'

// ============================================================
// GENERATE MEXICANO ROUNDS
// Competitive Pairing
// ============================================================

export function generateMexicanoRounds(players, totalRounds) {
  const rounds = []

  const allPlayers = [...players].filter(player => !player.isBye)

  if (allPlayers.length < 4 || totalRounds <= 0) {
    return rounds
  }

  // Same "only full groups of 4 can play a doubles match" rule
  const playersPerRound = Math.floor(allPlayers.length / 4) * 4
  const sitOutCount = allPlayers.length - playersPerRound

  const shuffled = shuffleArray([...allPlayers])
  const sitOuts = shuffled.slice(0, sitOutCount)
  const playing = shuffled.slice(sitOutCount)

  const round1Matches = []

  for (let i = 0; i < playing.length; i += 4) {
    round1Matches.push(
      makeMatch(
        [playing[i], playing[i + 1]],
        [playing[i + 2], playing[i + 3]]
      )
    )
  }

  sitOuts.forEach(player => {
    round1Matches.push(makeBye([player]))
  })

  rounds.push({
    round_number: 1,
    matches: shuffleArray(round1Matches),
  })

  for (let round = 2; round <= totalRounds; round++) {
    rounds.push({
      round_number: round,
      matches: [],
    })
  }

  return rounds
}

// ============================================================
// PAIR A QUARTET — 1st+4th vs 2nd+3rd by default (rank-balanced),
// falling back to whichever of the 3 possible splits repeats the
// fewest previous partnerships.
// ============================================================

function pairQuartet(quartet, pairHistory) {
  const [p1, p2, p3, p4] = quartet

  const options = [
    [[p1, p4], [p2, p3]],
    [[p1, p3], [p2, p4]],
    [[p1, p2], [p3, p4]],
  ]

  const repeatCost = ([a, b]) => (pairHistory[a.id]?.has(b.id) ? 1 : 0)

  let best = options[0]
  let bestCost = Infinity

  for (const [teamA, teamB] of options) {
    const cost = repeatCost(teamA) + repeatCost(teamB)
    if (cost < bestCost) {
      bestCost = cost
      best = [teamA, teamB]
    }
    if (bestCost === 0) break
  }

  return best
}

// ============================================================
// GENERATE MEXICANO PAIRINGS FOR A ROUND
// Based on Standings — winners play winners, losers play losers.
// ============================================================

export function generateMexicanoPairings(
  players,
  standings,
  roundNumber,
  previousPairings = [],
  byeCounts = null
) {
  // Rank order (best first) — this order must be preserved, not shuffled,
  // since it's what makes Mexicano "competitive" instead of random.
  const sortedPlayers = [...players].sort((a, b) => {
    const aStats = standings[a.id] || { points: 0 }
    const bStats = standings[b.id] || { points: 0 }
    return bStats.points - aStats.points
  })

  // Only full groups of 4 can play a doubles match — same rule as round 1.
  const sitOutCount = sortedPlayers.length % 4
  let sitOuts = []
  let available = sortedPlayers

  if (sitOutCount > 0) {
    if (byeCounts) {
      // Fair rotation: fewest byes so far, avoid sitting out twice in a row.
      sitOuts = selectSitOuts(sortedPlayers, sitOutCount, byeCounts, new Set())
      sitOuts.forEach(player => {
        byeCounts[player.id] = (byeCounts[player.id] ?? 0) + 1
      })
    } else {
      // No history yet — sit out the lowest-ranked players.
      sitOuts = sortedPlayers.slice(-sitOutCount)
    }
    const sitOutIds = new Set(sitOuts.map(player => player.id))
    available = sortedPlayers.filter(player => !sitOutIds.has(player.id))
  }

  // Build partner history from previous rounds.
  const pairHistory = Object.fromEntries(players.map(player => [player.id, new Set()]))

  previousPairings.forEach(pair => {
    if (!pair || pair.length < 4) return

    const [a1, a2, b1, b2] = pair

    if (pairHistory[a1] && pairHistory[a2]) {
      addHistory(pairHistory, a1, a2)
    }
    if (pairHistory[b1] && pairHistory[b2]) {
      addHistory(pairHistory, b1, b2)
    }
  })

  // Group by rank tier (top 4, next 4, ...) so each match is between
  // players of similar current standing, then split each quartet into
  // rank-balanced teams while avoiding repeat partners where possible.
  const matches = []

  for (let i = 0; i < available.length; i += 4) {
    const quartet = available.slice(i, i + 4)
    if (quartet.length < 4) break // shouldn't happen given sitOutCount above

    const [team1, team2] = pairQuartet(quartet, pairHistory)
    matches.push(makeMatch(team1, team2))
  }

  sitOuts.forEach(player => {
    matches.push(makeBye([player]))
  })

  return shuffleArray(matches)
}
