// src/utils/tournament/americano.js
import {
  shuffleArray,
  makeMatch,
  makeBye,
  addHistory,
  selectSitOuts,
  findBestPairing,
  findBestTeamMatches,
} from './common'

// ============================================================
// GENERATE AMERICANO ROUNDS
// Rotating Partners
// ============================================================

export function generateAmericanoRounds(players, totalRounds) {
  const rounds = []

  const allPlayers = [...players].filter(player => !player.isBye)

  if (allPlayers.length < 4 || totalRounds <= 0) {
    return rounds
  }

  const partnered = Object.fromEntries(allPlayers.map(player => [player.id, new Set()]))
  const opposed = Object.fromEntries(allPlayers.map(player => [player.id, new Set()]))
  const sitCounts = Object.fromEntries(allPlayers.map(player => [player.id, 0]))

  let lastPlayedIds = new Set()

  // One doubles match requires 4 players.
  const playersPerRound = Math.floor(allPlayers.length / 4) * 4
  const workingPlayers = [...allPlayers]

  for (let round = 1; round <= totalRounds; round++) {
    const sitOutCount = allPlayers.length - playersPerRound
    const sitOuts = selectSitOuts(workingPlayers, sitOutCount, sitCounts, lastPlayedIds)
    const sitOutIds = new Set(sitOuts.map(player => player.id))
    const playing = workingPlayers.filter(player => !sitOutIds.has(player.id))

    sitOuts.forEach(player => {
      sitCounts[player.id] += 1
    })

    // Shuffle playing players before pairing
    const shuffledPlaying = shuffleArray(playing)

    // Build teams while minimizing repeated partners.
    const partnerPairs = findBestPairing(shuffledPlaying, partnered)
    const teams = partnerPairs.map(([player1, player2]) => [player1, player2])

    // Match teams while minimizing repeated opponents.
    const teamMatches = findBestTeamMatches(teams, opposed)

    // Every player selected to play must appear in exactly one match.
    const scheduledIds = new Set(teamMatches.flat(2).map(player => player.id))

    if (scheduledIds.size !== playing.length) {
      throw new Error(
        `Americano scheduling failed in round ${round}: not every playing player was scheduled.`
      )
    }

    const roundMatches = teamMatches.map(([team1, team2]) => {
      team1.forEach(player1 => {
        team2.forEach(player2 => {
          addHistory(opposed, player1.id, player2.id)
        })
      })
      return makeMatch(team1, team2)
    })

    // Record partner history.
    teams.forEach(([player1, player2]) => {
      addHistory(partnered, player1.id, player2.id)
    })

    // Explicitly record every sit-out.
    sitOuts.forEach(player => {
      roundMatches.push(makeBye([player]))
    })

    // Shuffle match order
    const shuffledMatches = shuffleArray(roundMatches)

    rounds.push({
      round_number: round,
      matches: shuffledMatches,
    })

    lastPlayedIds = new Set(playing.map(player => player.id))
    workingPlayers.push(workingPlayers.shift())
  }

  return rounds
}
