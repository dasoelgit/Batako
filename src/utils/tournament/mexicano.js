// src/utils/tournament/mexicano.js
import {
  shuffleArray,
  makeMatch,
  makeBye,
  addHistory,
  selectSitOuts,
  findBestPairing,
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
// GENERATE MEXICANO PAIRINGS FOR A ROUND
// Based on Standings
// ============================================================

export function generateMexicanoPairings(
  players,
  standings,
  roundNumber,
  previousPairings = [],
  byeCounts = null
) {
  const sortedPlayers = [...players].sort((a, b) => {
    const aStats = standings[a.id] || { points: 0 }
    const bStats = standings[b.id] || { points: 0 }
    return bStats.points - aStats.points
  })

  let available = [...sortedPlayers]
  let byePlayer = null

  if (available.length % 2 !== 0) {
    if (byeCounts) {
      const previousPlayed = new Set(previousPairings.flat())
      const candidates = available.filter(player => previousPlayed.has(player.id))
      const pool = candidates.length ? candidates : available

      byePlayer = selectSitOuts(pool, 1, byeCounts, new Set())[0]
      byeCounts[byePlayer.id] = (byeCounts[byePlayer.id] ?? 0) + 1
      available = available.filter(player => player.id !== byePlayer.id)
    } else {
      const previousPlayed = new Set(previousPairings.flat())
      const candidates = available.filter(player => previousPlayed.has(player.id))
      byePlayer = (candidates.length ? candidates : available).at(-1)
      available = available.filter(player => player.id !== byePlayer.id)
    }
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

  // Shuffle available before pairing
  const shuffledAvailable = shuffleArray(available)

  const paired = findBestPairing(shuffledAvailable, pairHistory)
  const pairedList = paired.map(([a, b]) => [a, b])

  const matches = []

  for (let i = 0; i < pairedList.length; i += 2) {
    if (pairedList[i + 1]) {
      matches.push(makeMatch(pairedList[i], pairedList[i + 1]))
    }
  }

  if (byePlayer) {
    matches.push(makeBye([byePlayer]))
  }

  return shuffleArray(matches)
}
