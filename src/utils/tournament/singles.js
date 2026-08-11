// src/utils/tournament/singles.js
import { makeMatch, makeBye, shuffleArray } from './common'

// ============================================================
// GENERATE SINGLES ROUNDS
// 1v1
// ============================================================
//
// Uses the standard round-robin circle schedule.
// Over a complete cycle, every opponent is met exactly once.
// With an odd number of players, the BYE rotates through the schedule.
//

export function generateSinglesRounds(players, totalRounds) {
  const rounds = []

  if (players.length < 2 || totalRounds <= 0) {
    return rounds
  }

  const roster = [...players]

  const isOdd = roster.length % 2 !== 0

  if (isOdd) {
    roster.push({
      id: '__BYE__',
      name: 'BYE',
      isBye: true,
    })
  }

  const n = roster.length
  let rotation = [...roster]

  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = []

    for (let i = 0; i < n / 2; i++) {
      const a = rotation[i]
      const b = rotation[n - 1 - i]

      if (a.isBye || b.isBye) {
        const player = a.isBye ? b : a
        roundMatches.push(makeBye([player]))
      } else {
        roundMatches.push(makeMatch([a], [b]))
      }
    }

    rounds.push({
      round_number: round,
      matches: shuffleArray(roundMatches),
    })

    // Keep first slot fixed and rotate the remaining circle.
    rotation = [rotation[0], rotation[n - 1], ...rotation.slice(1, n - 1)]
  }

  return rounds
}
